#!/usr/bin/env python3
"""
PFO past-event content migration.

Reads every past event in src/content/events/, fetches its old Craft CMS
counterpart at https://www.pfo.org.uk/events/<slug>, extracts the rich
sections (race report, course info, parking, etc.), converts the HTML to
Markdown, and rewrites the event's .md body with that content. Also rewrites
the `results:` array in frontmatter to point at the real results-archive URLs
embedded in the source HTML.

Idempotent: events already migrated (marked with `<!-- migrated -->`) are
skipped on subsequent runs. Pass --force to re-migrate everything.

Run:
    python3 scripts/migrate_results.py
    python3 scripts/migrate_results.py --force
    python3 scripts/migrate_results.py --only thompson-park-2025-06-11
"""
import argparse
import datetime as dt
import html as htmllib
import os
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVENTS_DIR = os.path.join(ROOT, "src", "content", "events")
BASE_URL = "https://www.pfo.org.uk/events/"
USER_AGENT = "Mozilla/5.0 (compatible; PFO-content-migrator/1.0)"

# Sections we want to keep in the migrated body, in display order.
# Each entry: (heading-on-old-page, heading-tag, new-heading-on-new-site).
SECTIONS = [
    ("Report",                       "h2", "Race report"),
    ("Map / Terrain",                "h3", "Map and terrain"),
    ("Course Information",           "h3", "Course information"),
    ("Registration and Start times", "h3", "Registration and start times"),
    ("Directions / Parking",         "h3", "Directions and parking"),
    ("Entry Details",                "h3", "Entry details"),
    ("Facilities",                   "h3", "Facilities"),
    ("Dog restrictions",             "h3", "Dog restrictions"),
    ("Contacts / Officials",         "h3", "Contacts and officials"),
]


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def _strip_inline_tags(cell: str) -> str:
    """Convert inline HTML inside a single table cell to plain Markdown text."""
    cell = re.sub(r"<br\s*/?>", " ", cell, flags=re.I)
    cell = re.sub(r"<strong>(.*?)</strong>", r"**\1**", cell, flags=re.S | re.I)
    cell = re.sub(r"<b>(.*?)</b>",           r"**\1**", cell, flags=re.S | re.I)
    cell = re.sub(r"<em>(.*?)</em>",         r"*\1*",   cell, flags=re.S | re.I)
    cell = re.sub(r"<i>(.*?)</i>",           r"*\1*",   cell, flags=re.S | re.I)
    cell = re.sub(
        r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        lambda m: f"[{re.sub(r'<[^>]+>', '', m.group(2)).strip()}]({m.group(1)})",
        cell, flags=re.S | re.I,
    )
    cell = re.sub(r"<[^>]+>", "", cell)            # strip any remaining tags
    cell = htmllib.unescape(cell)
    cell = re.sub(r"\s+", " ", cell).strip()       # collapse whitespace inside the cell
    return cell.replace("|", "\\|")                # escape pipes so they don't break the table


def html_table_to_md(table_html: str) -> str:
    """Convert an HTML <table> into a GFM Markdown table."""
    rows = []
    for row_match in re.finditer(r"<tr\b[^>]*>(.*?)</tr>", table_html, re.S | re.I):
        row_html = row_match.group(1)
        cells = []
        for cell_match in re.finditer(r"<(t[hd])\b[^>]*>(.*?)</\1>", row_html, re.S | re.I):
            cells.append(_strip_inline_tags(cell_match.group(2)))
        if cells:
            rows.append(cells)
    if not rows:
        return ""
    # Pad ragged rows to match the widest one
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    # Use the first row as header (Craft CMS pricing tables follow this convention).
    # If the first row is empty-ish, use a generic header so the table still renders.
    if all(c == "" for c in rows[0]):
        rows[0] = [f"Col {i+1}" for i in range(width)]
    out = ["| " + " | ".join(rows[0]) + " |",
           "| " + " | ".join(["---"] * width) + " |"]
    for r in rows[1:]:
        out.append("| " + " | ".join(r) + " |")
    return "\n".join(out)


def html_to_md(s: str) -> str:
    """Quick-and-dirty HTML → Markdown, with proper table handling."""
    # strip <noscript>, <script>, <style>
    s = re.sub(r"<noscript[^>]*>.*?</noscript>", "", s, flags=re.S | re.I)
    s = re.sub(r"<script[^>]*>.*?</script>", "", s, flags=re.S | re.I)
    s = re.sub(r"<style[^>]*>.*?</style>", "", s, flags=re.S | re.I)
    # images: drop the static Google maps thumbnail; keep alt-text-only otherwise
    s = re.sub(r"<img[^>]*>", "", s, flags=re.I)
    # divs we don't want
    s = re.sub(r'<div[^>]*class="[^"]*insertedImage[^"]*"[^>]*>.*?</div>', "", s, flags=re.S | re.I)
    s = re.sub(r'<div[^>]*class="[^"]*meta[^"]*"[^>]*>.*?</div>', "", s, flags=re.S | re.I)
    # ── tables: convert to GFM Markdown tables BEFORE other rules so the
    #    inline-tag rules don't shred the row structure
    s = re.sub(
        r"<table\b[^>]*>(.*?)</table>",
        lambda m: "\n\n" + html_table_to_md(m.group(1)) + "\n\n",
        s, flags=re.S | re.I,
    )
    # br → newline
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    # bold / italic / underline
    s = re.sub(r"<strong>(.*?)</strong>", r"**\1**", s, flags=re.S | re.I)
    s = re.sub(r"<b>(.*?)</b>",         r"**\1**", s, flags=re.S | re.I)
    s = re.sub(r"<em>(.*?)</em>",       r"*\1*",   s, flags=re.S | re.I)
    s = re.sub(r"<i>(.*?)</i>",         r"*\1*",   s, flags=re.S | re.I)
    s = re.sub(r"<u>(.*?)</u>",         r"\1",     s, flags=re.S | re.I)
    # links
    s = re.sub(
        r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        lambda m: f"[{re.sub(r'<[^>]+>', '', m.group(2)).strip()}]({m.group(1)})",
        s, flags=re.S | re.I,
    )
    # list items
    s = re.sub(r"<li[^>]*>(.*?)</li>", r"- \1", s, flags=re.S | re.I)
    s = re.sub(r"</?(ul|ol)[^>]*>", "\n", s, flags=re.I)
    # paragraph boundaries
    s = re.sub(r"</p>", "\n\n", s, flags=re.I)
    s = re.sub(r"<p[^>]*>", "", s, flags=re.I)
    # lower-level headings inside a section
    s = re.sub(r"<h4[^>]*>(.*?)</h4>", r"\n\n### \1\n", s, flags=re.S | re.I)
    # Repair adjacent **bold** runs that the source HTML smushed together
    # (e.g. "**Course:****Length:****Climb:**" → "**Course:** **Length:** **Climb:**")
    s = re.sub(r"\*\*([^*\n]+?)\*\*\*\*([^*\n]+?)\*\*", r"**\1** **\2**", s)
    s = re.sub(r"\*\*([^*\n]+?)\*\*\*\*([^*\n]+?)\*\*", r"**\1** **\2**", s)  # second pass
    # strip anything left
    s = re.sub(r"<[^>]+>", "", s)
    # entities
    s = htmllib.unescape(s)
    # collapse whitespace
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def extract_section(main_html: str, heading_text: str, level: str) -> str:
    """Return inner HTML of the section that starts with <hN>heading</hN>."""
    pat = (
        rf'<{level}[^>]*>\s*'
        + re.escape(heading_text)
        + rf'\s*</{level}>(.*?)(?=<h[23][^>]*>|<main|</main|$)'
    )
    m = re.search(pat, main_html, re.S | re.I)
    return m.group(1) if m else ""


def extract_results_links(main_html: str):
    """Return list of dicts [{label, url, type}] from <ul class='results'>."""
    m = re.search(
        r'<ul[^>]*class="[^"]*results[^"]*"[^>]*>(.*?)</ul>',
        main_html, re.S | re.I,
    )
    if not m:
        return []
    block = m.group(1)
    out = []
    for url, label in re.findall(
        r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>',
        block, re.S | re.I,
    ):
        label = re.sub(r"<[^>]+>", "", label).strip()
        url = url.strip()
        if not label or not url:
            continue
        low = url.lower()
        if low.endswith(".pdf"):     ftype = "pdf"
        elif low.endswith((".xls", ".xlsx")): ftype = "xlsx"
        elif low.endswith(".csv"):   ftype = "csv"
        else:                        ftype = "html"
        out.append({"label": label, "url": url, "type": ftype})
    return out


def serialise_results(results) -> str:
    """Build a YAML `results:` block from a list of dicts."""
    lines = ["results:"]
    for r in results:
        # YAML-escape any embedded double-quotes in the label
        label = r["label"].replace('"', '\\"')
        lines.append(f'  - label: "{label}"')
        lines.append(f'    url: "{r["url"]}"')
        lines.append(f'    type: "{r["type"]}"')
    return "\n".join(lines) + "\n"


# Match either:
#  - the raw `results:` block followed by 1+ indented lines, OR
#  - no results: block at all
RESULTS_BLOCK_RE = re.compile(r"^results:\n(?:[ ]+.+\n)+", re.M)
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.S)
DATE_IN_SLUG_RE = re.compile(r"-(\d{4}-\d{2}-\d{2})$")


def migrate_one(slug: str, force: bool, today: str, include_future: bool = False) -> str:
    path = os.path.join(EVENTS_DIR, slug + ".md")
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    if "<!-- migrated -->" in text and not force:
        return "skip (already migrated)"

    fm_match = FRONTMATTER_RE.match(text)
    if not fm_match:
        return "skip (no frontmatter)"
    frontmatter, _old_body = fm_match.group(1), fm_match.group(2)

    m = DATE_IN_SLUG_RE.search(slug)
    if not m:
        return "skip (no date in slug)"
    date = m.group(1)
    if date >= today and not include_future:
        return "skip (future event)"

    url = BASE_URL + slug
    try:
        html_data = fetch(url)
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code} fetching {url}"
    except Exception as e:
        return f"ERROR {e}"

    main = re.search(r"<main[^>]*>(.*?)</main>", html_data, re.S | re.I)
    if not main:
        return "no <main> in source"
    main_html = main.group(1)

    body_blocks = []
    for src_heading, src_level, dst_heading in SECTIONS:
        section_html = extract_section(main_html, src_heading, src_level)
        if not section_html.strip():
            continue
        md = html_to_md(section_html)
        if md:
            body_blocks.append(f"## {dst_heading}\n\n{md}\n")

    if not body_blocks:
        return "no migratable content"

    new_body = "\n".join(body_blocks).strip() + "\n"

    # Update results: array if we found archive URLs in the source
    results = extract_results_links(main_html)
    new_frontmatter = frontmatter.rstrip() + "\n"
    if results:
        results_block = serialise_results(results)
        if RESULTS_BLOCK_RE.search(new_frontmatter):
            new_frontmatter = RESULTS_BLOCK_RE.sub(results_block, new_frontmatter, count=1)
        else:
            new_frontmatter = new_frontmatter.rstrip() + "\n" + results_block

    new_md = f"---\n{new_frontmatter}---\n\n<!-- migrated -->\n\n{new_body}"
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_md)
    return f"OK ({len(new_body)} chars, {len(results)} result link(s))"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="re-migrate already-migrated events")
    parser.add_argument("--only", help="migrate just one slug (filename without .md)")
    parser.add_argument("--delay", type=float, default=0.6, help="seconds between fetches")
    parser.add_argument("--include-future", action="store_true",
                        help="also migrate events whose date is today or later")
    args = parser.parse_args()

    today = dt.date.today().isoformat()
    print(f"Today is {today}; events with date >= today are skipped.")

    slugs = []
    if args.only:
        slugs = [args.only]
    else:
        for fn in sorted(os.listdir(EVENTS_DIR)):
            if fn.endswith(".md"):
                slugs.append(fn[:-3])

    ok = skip = err = 0
    for slug in slugs:
        result = migrate_one(slug, args.force, today, include_future=args.include_future)
        prefix = "  "
        if result.startswith("OK"):
            ok += 1
            prefix = "✓ "
        elif result.startswith("skip"):
            skip += 1
            prefix = "· "
        else:
            err += 1
            prefix = "✗ "
        print(f"{prefix}{slug}: {result}")
        time.sleep(args.delay)

    print(f"\nSummary: {ok} migrated, {skip} skipped, {err} errors")
    sys.exit(0 if err == 0 else 1)


if __name__ == "__main__":
    main()

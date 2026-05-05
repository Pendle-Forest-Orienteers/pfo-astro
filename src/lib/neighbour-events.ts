/**
 * Build-time fetcher for neighbouring-club events.
 *
 * Pulls the British Orienteering events listing and filters down to events
 * run by the clubs PFO members most often travel to: EPOC, SROC, AIRE,
 * SELOC, MDOC. Returns a small, simple list rendered into events.astro
 * at build time. If BOF is unreachable or the markup changes, we silently
 * return an empty array — the page still works, just shows the club-card
 * fallback instead of a populated table.
 */

import { neighbouringClubs } from '../data/neighbouring-clubs';

export interface NeighbourEvent {
  date: Date;
  title: string;
  club: string;     // EPOC / SROC / AIRE / SELOC / MDOC
  near?: string;    // venue / location text
  level?: string;   // Local / Regional / National etc.
  url: string;      // link out to BOF event page (or club page if absolute)
}

/* ─────────── Helpers ─────────── */

const TARGETS = neighbouringClubs.map(c => c.abbr);
const TARGETS_FULL: Record<string, string> = neighbouringClubs.reduce((acc, c) => {
  acc[c.name.toLowerCase()] = c.abbr;
  return acc;
}, {} as Record<string, string>);

function isTargetClub(text: string): string | null {
  if (!text) return null;
  const upper = text.toUpperCase();
  for (const abbr of TARGETS) {
    // word-boundary match to avoid e.g. "AIRE" inside another word
    const re = new RegExp(`(^|[^A-Z])${abbr}([^A-Z]|$)`);
    if (re.test(upper)) return abbr;
  }
  const lower = text.toLowerCase();
  for (const [name, abbr] of Object.entries(TARGETS_FULL)) {
    if (lower.includes(name)) return abbr;
  }
  return null;
}

function parseLooseDate(raw: string): Date | null {
  if (!raw) return null;
  const t = raw.trim();

  // ISO YYYY-MM-DD
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = t.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (dmy) {
    const yr = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3];
    return new Date(`${yr}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}T00:00:00Z`);
  }

  // "17 May 2026" or "Sat 17 May 2026"
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const txt = t.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (txt) {
    const m = months[txt[2].slice(0, 3).toLowerCase()];
    if (m) return new Date(`${txt[3]}-${m}-${txt[1].padStart(2, '0')}T00:00:00Z`);
  }
  return null;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/* ─────────── Parse BOF event list HTML ─────────── */

function parseBofTableHtml(html: string, baseUrl: string): NeighbourEvent[] {
  const out: NeighbourEvent[] = [];

  // Try table rows first — BOF historically uses a table on /event
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html))) {
    const row = m[1];
    const cells: string[] = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let c: RegExpExecArray | null;
    while ((c = cellRe.exec(row))) cells.push(c[1]);
    if (cells.length < 3) continue;

    const rowText = stripTags(row);
    const club = isTargetClub(rowText);
    if (!club) continue;

    // First cell tends to hold the date; second the title (with link); etc.
    const date = parseLooseDate(stripTags(cells[0]));
    if (!date) continue;

    // Find the first <a> with an href in the row
    const linkM = row.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const href = linkM ? linkM[1] : '';
    const titleRaw = linkM ? stripTags(linkM[2]) : stripTags(cells[1] || '');
    const title = decodeEntities(titleRaw);

    // Build absolute URL
    let url = href;
    if (url && !/^https?:\/\//i.test(url)) {
      url = new URL(url, baseUrl).toString();
    }
    if (!url) url = baseUrl;

    // Try to identify "near" and "level" — typically last two cells
    const near = decodeEntities(stripTags(cells[3] || cells[2] || '')).slice(0, 80);
    const level = decodeEntities(stripTags(cells[cells.length - 1] || '')).slice(0, 40);

    out.push({ date, title, club, near, level, url });
  }
  return out;
}

/* ─────────── Public: fetch + filter ─────────── */

export async function fetchNeighbourEvents(): Promise<NeighbourEvent[]> {
  const candidates = [
    'https://www.britishorienteering.org.uk/event',
    'https://www.britishorienteering.org.uk/events',
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'PFO-website-build/1.0 (https://pfo.org.uk)',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const events = parseBofTableHtml(html, url);
      if (events.length === 0) continue;

      // De-dup, keep upcoming, sort, cap at 25 rows
      const now = Date.now();
      const seen = new Set<string>();
      const filtered = events
        .filter(e => e.date.getTime() >= now - 86_400_000) // include today
        .filter(e => {
          const key = `${e.date.toISOString().slice(0,10)}|${e.title}|${e.club}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 25);

      return filtered;
    } catch {
      // try next candidate
    }
  }
  return [];
}

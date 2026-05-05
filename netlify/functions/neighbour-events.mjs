/**
 * Netlify Function: /api/neighbour-events
 *
 * Proxies British Orienteering's per-club event search at request-time
 * (not build-time) because BOF appears to block Netlify's build-server
 * IP range with a 404. Netlify Functions run from a different IP pool,
 * which BOF accepts.
 *
 * The response is cached at the edge for 1 hour so BOF only sees a
 * handful of hits per hour even if the page is busy.
 *
 * Returns JSON: { events: NeighbourEvent[], fetchedAt: string,
 *                 perClub: { abbr, count, status }[] }
 */

const CLUBS = [
  { abbr: 'EPOC', bofClubId: 26 },
  { abbr: 'SROC', bofClubId: 81 },
  { abbr: 'AIRE', bofClubId: 23 },
  { abbr: 'SELOC', bofClubId: 79 },
  { abbr: 'MDOC', bofClubId: 66 },
];

const BOF_BASE = 'https://www.britishorienteering.org.uk';

function buildBofUrl(bofClubId) {
  const params = new URLSearchParams({
    pg: '',
    evt_name: '',
    evt_postcode: '',
    radius: '150',
    evt_assoc: '',
    evt_club: String(bofClubId),
    evt_competitions: '0',
    filter_type: 'Select...',
    filter_start: '',
    filter_end: '',
    entry_closing: '0',
    cancelled_events: '0',
    bFilter: '1',
  });
  return `${BOF_BASE}/event?${params.toString()}`;
}

/* ─────────── Parsing helpers ─────────── */

function parseLooseDate(raw) {
  if (!raw) return null;
  const t = raw.trim();

  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);

  const dmy = t.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (dmy) {
    const yr = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3];
    return new Date(`${yr}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}T00:00:00Z`);
  }

  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const txt = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (txt) {
    const m = months[txt[2].slice(0, 3).toLowerCase()];
    if (m) return new Date(`${txt[3]}-${m}-${txt[1].padStart(2, '0')}T00:00:00Z`);
  }
  return null;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseBofClubHtml(html, club) {
  const out = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html))) {
    const row = m[1];
    if (/<th[\s>]/i.test(row)) continue;

    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let c;
    while ((c = cellRe.exec(row))) cells.push(c[1]);
    if (cells.length < 2) continue;

    let date = null;
    let dateIdx = -1;
    for (let i = 0; i < cells.length; i++) {
      const d = parseLooseDate(stripTags(cells[i]));
      if (d) { date = d; dateIdx = i; break; }
    }
    if (!date) continue;

    const linkM = row.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkM) continue;
    let url = linkM[1];
    if (!/^https?:\/\//i.test(url)) {
      url = url.startsWith('/') ? `${BOF_BASE}${url}` : `${BOF_BASE}/${url}`;
    }
    const title = decodeEntities(stripTags(linkM[2])).trim();
    if (!title) continue;

    const titleCellIdx = cells.findIndex(c => /<a[^>]+href=/i.test(c));
    const remainder = cells
      .map((cell, i) => ({ cell, i }))
      .filter(({ i }) => i !== dateIdx && i !== titleCellIdx)
      .map(({ cell }) => decodeEntities(stripTags(cell)).trim())
      .filter(Boolean);

    let level;
    let near;
    for (const text of remainder) {
      if (!level && /^(local|regional|national|major|level\s*[a-d]|urban|night|score|sprint)/i.test(text) && text.length <= 30) {
        level = text;
      } else if (!near) {
        near = text;
      }
    }

    out.push({
      date: date.toISOString(),
      title,
      club: club.abbr,
      near: near?.slice(0, 80),
      level: level?.slice(0, 40),
      url,
    });
  }
  return out;
}

async function fetchOneClub(club) {
  const url = buildBofUrl(club.bofClubId);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PFO-website/1.0; +https://pfo.org.uk)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    });
    if (!res.ok) {
      return { events: [], status: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const events = parseBofClubHtml(html, club);
    return { events, status: `ok (${html.length}b → ${events.length})` };
  } catch (err) {
    return { events: [], status: `error: ${err.message}` };
  }
}

/* ─────────── Handler ─────────── */

export default async () => {
  const results = await Promise.all(CLUBS.map(fetchOneClub));

  const all = results.flatMap(r => r.events);
  const now = Date.now() - 86_400_000;
  const seen = new Set();
  const events = all
    .filter(e => new Date(e.date).getTime() >= now)
    .filter(e => {
      const key = `${e.date.slice(0, 10)}|${e.title}|${e.club}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 30);

  const perClub = CLUBS.map((c, i) => ({
    abbr: c.abbr,
    count: results[i].events.length,
    status: results[i].status,
  }));

  return new Response(
    JSON.stringify({
      events,
      fetchedAt: new Date().toISOString(),
      perClub,
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // Edge cache for an hour, accept stale up to a day while revalidating
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
};

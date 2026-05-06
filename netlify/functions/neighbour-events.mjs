/**
 * Netlify Function: /api/neighbour-events
 *
 * Pulls the official British Orienteering open-data fixtures JSON feed,
 * filters for the 5 PFO-neighbouring clubs (EPOC / SROC / AIRE / SELOC /
 * MDOC), and returns a small structured list for the events page to
 * render into a table.
 *
 * Endpoint: https://www.britishorienteering.org.uk/fullfixturesjson.php
 * Conforms to OpenActive Realtime Paged Data Exchange 0.2.3.
 *
 * The response is cached at the Netlify edge for 1 hour, so even on a
 * busy day BOF only gets a handful of hits per hour. Stale cache is
 * served for up to a day while a fresh copy is fetched in the
 * background.
 *
 * Returns JSON: { events: NeighbourEvent[], fetchedAt: string,
 *                 perClub: { abbr, count }[],
 *                 totalFromFeed: number,
 *                 status: string }
 */

const CLUBS = [
  { abbr: 'EPOC' },
  { abbr: 'SROC' },
  { abbr: 'AIRE' },
  { abbr: 'SELOC' },
  { abbr: 'MDOC' },
];

const TARGET_ABBRS = new Set(CLUBS.map(c => c.abbr));

const FEED_URL = 'https://www.britishorienteering.org.uk/fullfixturesjson.php';

/**
 * Pull the BOF feed. The endpoint sometimes returns a single object
 * with an `items` array (RPDE 0.2.3 wraps events that way), and other
 * times a top-level array of events directly. We handle both.
 */
async function fetchFeed() {
  const res = await fetch(FEED_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PFO-website/1.0; +https://pfo.org.uk)',
      'Accept': 'application/json,application/ld+json,*/*',
    },
    signal: AbortSignal.timeout(15_000),
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`bad JSON (${text.length} bytes): ${e.message}`);
  }
  // RPDE: { items: [{ data: {...} }, ...], next: "...", license: "..." }
  if (Array.isArray(data?.items)) {
    return data.items.map(item => item.data || item).filter(Boolean);
  }
  // Plain array of events
  if (Array.isArray(data)) return data;
  // Some BOF endpoints wrap in { fixtures: [...] }
  if (Array.isArray(data?.fixtures)) return data.fixtures;
  return [];
}

/**
 * Map one BOF event record → our NeighbourEvent shape.
 * BOF field names observed in the open-data sample:
 *   name, date, association, club, level, show_on_bof_website,
 *   website, details_website, town, venue, centre, cancelled, ...
 * Some feeds also include `id` and `start_date`; we look for both.
 */
function normalize(e) {
  const club = (e.club || '').toString().toUpperCase().trim();
  if (!TARGET_ABBRS.has(club)) return null;
  if (e.cancelled === true) return null;
  if (e.show_on_bof_website === false) return null;

  const dateRaw = e.start_date || e.date || e.startDate;
  if (!dateRaw) return null;
  const date = new Date(dateRaw);
  if (isNaN(date.getTime())) return null;

  // Today onwards only
  const dayMs = 86_400_000;
  if (date.getTime() < Date.now() - dayMs) return null;

  const title = (e.name || e.title || '').toString().trim();
  if (!title) return null;

  // Best link — prefer the club's own event page, then BOF's detail page
  const url =
    e.details_website ||
    e.website ||
    (e.id ? `https://www.britishorienteering.org.uk/event/${e.id}` : 'https://www.britishorienteering.org.uk/event');

  // "Near" — the most useful place name (town > venue > centre)
  const near = [e.town, e.venue, e.centre]
    .filter(Boolean)
    .map(s => s.toString().trim())
    .find(Boolean);

  // Level — already in form like "Level C", "Local", "Regional"
  const level = (e.level || '').toString().trim() || undefined;

  return {
    date: date.toISOString(),
    title,
    club,
    near: near?.slice(0, 80),
    level: level?.slice(0, 40),
    url,
  };
}

export default async () => {
  const fetchedAt = new Date().toISOString();
  let totalFromFeed = 0;
  let events = [];
  let status = 'ok';

  try {
    const raw = await fetchFeed();
    totalFromFeed = raw.length;
    events = raw.map(normalize).filter(Boolean);

    // Sort + cap
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    events = events.slice(0, 30);
  } catch (err) {
    status = `error: ${err.message}`;
    console.log('[neighbour-events]', status);
  }

  const perClub = CLUBS.map(c => ({
    abbr: c.abbr,
    count: events.filter(e => e.club === c.abbr).length,
  }));

  console.log(
    `[neighbour-events] ${status} — feed=${totalFromFeed} kept=${events.length} ` +
    perClub.map(p => `${p.abbr}=${p.count}`).join(' '),
  );

  return new Response(
    JSON.stringify({ events, fetchedAt, perClub, totalFromFeed, status }),
    {
      status: status === 'ok' ? 200 : 200, // always 200 — page falls back gracefully
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // Edge cache 1 hour, accept stale up to 1 day while revalidating
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
};

/**
 * One-off script to grab SI Entries URLs (and a stab at entry-fee text)
 * for upcoming PFO events from their British Orienteering event pages.
 *
 * Usage:
 *   cd ~/Documents/Claude/Projects/pfo-astro
 *   node scripts/fetch-si-urls.mjs
 *
 * The script reads every upcoming event in src/content/events/ that has
 * a `bofEventNumber` set, fetches the corresponding BOF event detail
 * page, and looks for two things:
 *
 *   1. A link to sientries.co.uk — that's the SI Entries URL.
 *   2. Anything that looks like an entry-fee section (£ amounts).
 *
 * It prints the findings to the console; nothing is written to disk.
 * Copy what's useful into the relevant event markdown by hand (or
 * paste back to the assistant who'll update the files for you).
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const EVENTS_DIR = new URL('../src/content/events/', import.meta.url);

const BOF_EVENT_URL = (id) =>
  `https://www.britishorienteering.org.uk/index.php?pg=event&event=${id}`;

/* ─────────── Read upcoming events with a BOF event number ─────────── */

async function listUpcomingEvents() {
  const files = (await readdir(EVENTS_DIR)).filter(f => f.endsWith('.md'));
  const today = new Date().toISOString().slice(0, 10);

  const out = [];
  for (const file of files) {
    const text = await readFile(new URL(file, EVENTS_DIR), 'utf8');
    const front = text.split('---', 3)[1] || '';

    const date = (front.match(/^date:\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '');
    const bof  = (front.match(/^bofEventNumber:\s*(\d+)/m) || [])[1];
    const has_si = /^siEntriesUrl:\s*\S/m.test(front);
    const has_fee = /^entryFee:\s*["']?\S/m.test(front);

    if (!date || !bof) continue;
    const dateOnly = date.slice(0, 10);
    if (dateOnly < today) continue;

    out.push({ file, date: dateOnly, bof, has_si, has_fee });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/* ─────────── Fetch one BOF event page and pull useful bits ─────────── */

function decode(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripTags(s) {
  return decode(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function inspectBofPage(bofId) {
  const url = BOF_EVENT_URL(bofId);
  let html;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PFO-tool/1.0; +https://pfo.org.uk)',
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }
    html = await res.text();
  } catch (err) {
    return { error: err.message };
  }

  // 1. SI Entries URL — anything pointing at sientries.co.uk
  const siMatch = html.match(/https?:\/\/(?:www\.)?sientries\.co\.uk\/[^\s"'<>)]+/i);
  const siEntriesUrl = siMatch ? siMatch[0] : null;

  // 2. Entry-fee text — find the first chunk of the page that mentions £.
  //    We grab the surrounding sentence/paragraph for a hint.
  const feeBlocks = [];
  const feeRe = /([^<]{0,140}£\s?\d[\d.,]*[^<]{0,140})/g;
  let m;
  while ((m = feeRe.exec(html)) && feeBlocks.length < 5) {
    feeBlocks.push(decode(m[1]).replace(/\s+/g, ' ').trim());
  }

  // 3. Final-details / event-specific website (for completeness)
  const finalDetails = (html.match(/href="([^"]*final[^"]+)"/i) || [])[1];

  return { siEntriesUrl, feeBlocks, finalDetails };
}

/* ─────────── Main ─────────── */

const events = await listUpcomingEvents();
if (events.length === 0) {
  console.log('No upcoming events with bofEventNumber found.');
  process.exit(0);
}

console.log(`Found ${events.length} upcoming events with BOF event numbers.\n`);

for (const ev of events) {
  console.log('─'.repeat(72));
  console.log(`${ev.date}  ${ev.file}  (BOF #${ev.bof})`);
  console.log(`           SI URL set already: ${ev.has_si ? 'yes' : 'NO'}   Entry fee set: ${ev.has_fee ? 'yes' : 'NO'}`);
  console.log(`           ${BOF_EVENT_URL(ev.bof)}`);

  const info = await inspectBofPage(ev.bof);
  if (info.error) {
    console.log(`           ⚠  fetch error: ${info.error}`);
    continue;
  }
  if (info.siEntriesUrl) {
    console.log(`           ✓  SI Entries:   ${info.siEntriesUrl}`);
  } else {
    console.log(`           —  no SI Entries link found on the BOF page`);
  }
  if (info.feeBlocks.length) {
    console.log(`           £  fee snippets found on page:`);
    for (const fee of info.feeBlocks) {
      console.log(`              · ${fee}`);
    }
  }
}
console.log('─'.repeat(72));
console.log('\nCopy any useful URLs / fees into the event markdown by hand,');
console.log('or paste this output back to the assistant.');

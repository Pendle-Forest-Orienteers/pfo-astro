// Astro Content Collections — schema definitions
//
// Every event, news article, map, etc. is a Markdown file in src/content/<collection>/
// with frontmatter that matches the schema below. The CMS (Phase 7) will edit these
// files directly. The site reads from the collections to render every page.

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    // ─────── Identification
    title: z.string(),

    // ─────── When
    // `date` is when the event happens
    // `entryCloseDate` is when online entries close — this is what drives the
    // automatic transition from "upcoming events" to "past results" on the site.
    date: z.date(),
    startTime: z.string().optional(),       // display string, e.g. "7:00pm"
    entryCloseDate: z.date(),

    // ─────── Where
    location: z.string(),                   // short label for cards, e.g. "Burnley"
    venue: z.string().optional(),           // specific building, e.g. "Ighten Leigh Social Club"
    postcode: z.string().optional(),
    coords: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),

    // ─────── What
    format: z.string(),                     // "Urban Score", "Street-O", "Snook-O", "Standard"
    level: z.enum(['local', 'regional', 'national', 'major']),
    duration: z.number().optional(),        // minutes
    series: z.string().optional(),          // e.g. "May Street-O", "June Series 2/3"

    // ─────── How much
    entryFee: z.string().optional(),        // free-text, e.g. "From £6" or "£6 / £8 pair"
    capacity: z.number().optional(),

    // ─────── External links
    siEntriesUrl: z.string().url().optional(),
    routeGadgetUrl: z.string().url().optional(),

    // ─────── Display
    summary: z.string(),                    // 1-line subtitle for cards
    description: z.string().optional(),     // 1–2 sentences for the homepage hero, if featured

    // ─────── Results (filled in after the event)
    results: z.array(z.object({
      label: z.string(),                    // "Full results", "Splits", "RouteGadget"
      url: z.string().url(),
      type: z.enum(['html', 'pdf', 'xlsx', 'csv']),
    })).optional(),

    // ─────── Misc
    cancelled: z.boolean().optional(),
    notes: z.string().optional(),           // committee-only notes, not rendered to public
  }),
});

export const collections = { events };

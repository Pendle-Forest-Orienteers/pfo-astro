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
    // Plain string rather than .url() so the CMS can save empty values
    // when the field isn't filled in. Validation happens at render time.
    siEntriesUrl: z.string().optional(),
    routeGadgetUrl: z.string().optional(),

    // ─────── Display
    summary: z.string(),                    // 1-line subtitle for cards
    description: z.string().optional(),     // 1–2 sentences for the homepage hero, if featured

    // ─────── Results (filled in after the event)
    results: z.array(z.object({
      label: z.string(),                    // "Full results", "Splits", "RouteGadget"
      url: z.string(),                      // plain string for CMS-friendliness
      type: z.enum(['html', 'pdf', 'xlsx', 'csv']),
    })).optional(),

    // ─────── Misc
    cancelled: z.boolean().optional(),
    notes: z.string().optional(),           // committee-only notes, not rendered to public
  }),
});

// ─────── News collection
// Each .md file is one news article. Frontmatter holds the publication date,
// summary, and optional hero image. The Markdown body is the long-form article.
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    author: z.string().optional(),
    gallery: z.array(z.object({
      src: z.string(),
      alt: z.string(),
      caption: z.string().optional(),
    })).optional(),
    draft: z.boolean().optional(),
  }),
});

// ─────── Maps collection
// Each .md file is one mapped area. Frontmatter holds the area name, terrain
// type, image (the orienteering map itself), and metadata. Markdown body is
// the long-form description, history of the area, access notes, etc.
const maps = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/maps' }),
  schema: z.object({
    title: z.string(),                       // "Hurstwood", "Towneley Park"
    nearTown: z.string().optional(),         // "Burnley"
    terrain: z.enum([
      'urban',       // streets, housing estates, town parks
      'parkland',    // mixed park / urban-park / school grounds
      'forest',      // woodland, plantation
      'moorland',    // open hill, fells
      'mtbo',        // mountain bike orienteering
      'mixed',       // combinations
    ]),
    surveyYear: z.number().optional(),
    surveyor: z.string().optional(),
    scale: z.string().optional(),            // "1:7500", "1:10000"
    contourInterval: z.string().optional(),  // "5m"
    permanentCourse: z.boolean().optional(), // has a POC
    coords: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
    image: z.string(),                       // path to the map image
    imageAlt: z.string().optional(),
    summary: z.string(),                     // one-line description for cards
    draft: z.boolean().optional(),
  }),
});

// ─────── Info pages collection
// Sub-pages of the Information hub — policies, privacy, etc.
// Each .md file becomes /information/<slug>
const infoPages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/info-pages' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    section: z.enum(['governance', 'safety', 'participation', 'members', 'admin']).optional(),
    order: z.number().optional(),
    lastReviewed: z.date().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = { events, news, maps, infoPages };

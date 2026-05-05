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
    /** Optional Decap CMS "map widget" output — a GeoJSON Point string
     *  like `{"type":"Point","coordinates":[-2.21,53.85]}`. When set,
     *  page templates prefer this over the manual `coords` object so
     *  Andy can just drop a pin on the map and everything else is
     *  auto-generated. */
    coordsGeoJson: z.string().optional(),
    /** Convenience field for Google-Maps-style "lat, lng" paste —
     *  right-click → click coords → paste here. The page templates
     *  parse this format and use it like `coords`. Highest-priority
     *  format if all three are filled in is the map pin (GeoJSON);
     *  next is this paste; last is the manual lat/lng object. */
    coordsPaste: z.string().optional(),
    what3words: z.string().optional(),      // e.g. "typically.capacity.skips" — common on UK
                                            // orienteering events for the event-centre/parking
    gridRef: z.string().optional(),         // OS grid ref, e.g. "SD848335"

    // ─────── What
    format: z.string(),                     // "Urban Score", "Street-O", "Snook-O", "Standard"
    level: z.enum(['local', 'regional', 'national', 'major']),
    duration: z.number().optional(),        // minutes
    series: z.string().optional(),          // e.g. "May Street-O", "June Series 2/3"
    bofEventNumber: z.number().optional(),  // British Orienteering event ID, e.g. 87374
    dogsAllowed: z.enum([
      'yes',                                // explicitly welcomed
      'on-lead',                            // permitted on lead only
      'no',                                 // not permitted
      'not-recommended',                    // discouraged (e.g. urban / Street-O)
    ]).optional(),
    dogNotes: z.string().optional(),        // free-text expansion shown next to the
                                            // dropdown answer, e.g. "not recommended on urban
                                            // courses due to traffic hazard"

    // ─────── Officials
    planner: z.string().optional(),         // e.g. "Richard Edwards (PFO)"
    controller: z.string().optional(),      // present on regional+ events
    seriesOrganiser: z.string().optional(), // e.g. "Kay Hawke (PFO)"

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
    attachments: z.array(z.object({
      label: z.string(),
      file: z.string(),
      type: z.enum(['pdf', 'docx', 'xlsx', 'csv', 'image', 'other']).optional(),
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
    // The map image itself is no longer rendered on the public site —
    // copyright sits with the individual surveyors. Field kept (optional)
    // for internal records and future use if licensing changes.
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    // Direct link to this specific area's RouteGadget entry (preferred).
    // If unset we fall back to the public RG index.
    routeGadgetUrl: z.string().optional(),
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
    /** Use the full-width layout (no right sidebar, sibling links collapsed
     *  into a small dropdown). Use for pages with wide tables that need the
     *  whole content area — e.g. POC course tables. */
    wideLayout: z.boolean().optional(),
    /** Optional file downloads attached to this info page — PDFs, Word
     *  docs, spreadsheets, etc. Rendered as a styled list at the bottom. */
    attachments: z.array(z.object({
      label: z.string(),
      file: z.string(),
      type: z.enum(['pdf', 'docx', 'xlsx', 'csv', 'image', 'other']).optional(),
    })).optional(),
  }),
});

// ─────── Announcements collection
// Banner messages displayed on the homepage between two dates. Committee
// uses these for last-minute event changes, weather warnings, AGM notices,
// etc. The banner only renders if `today` is between validFrom and validUntil
// AND `published: true`. Once the period elapses the banner disappears
// automatically — but the announcement record stays for future reference.
const announcements = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/announcements' }),
  schema: z.object({
    title: z.string(),               // e.g. "Brun Valley parking change"
    message: z.string(),             // 1–2 sentences shown on the banner
    validFrom: z.date(),
    validUntil: z.date(),
    severity: z.enum(['info', 'warning', 'urgent']).default('info'),
    link: z.string().optional(),     // optional URL the banner links to
    linkLabel: z.string().optional(),// custom label for the link
    published: z.boolean().default(true),
  }),
});

export const collections = { events, news, maps, infoPages, announcements };

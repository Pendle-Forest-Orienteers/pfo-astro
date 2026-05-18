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
    /** Which coordinate input method the editor chose for this event.
     *  "pin" reads coordsGeoJson, "paste" reads coordsPaste. Defaults
     *  to "paste" because pasting from Google Maps is fast and
     *  unambiguous. Forces a deliberate single source of truth so
     *  the same event can't accidentally have two conflicting pins. */
    coordsMethod: z.enum(['pin', 'paste']).optional(),
    /** Optional Decap CMS "map widget" output — a GeoJSON Point string
     *  like `{"type":"Point","coordinates":[-2.21,53.85]}`. Only used
     *  when coordsMethod is "pin" (or unset, for backward compat). */
    coordsGeoJson: z.string().optional(),
    /** Convenience field for Google-Maps-style "lat, lng" paste —
     *  right-click → click coords → paste here. Only used when
     *  coordsMethod is "paste" (the default for new events). */
    coordsPaste: z.string().optional(),
    what3words: z.string().optional(),      // e.g. "typically.capacity.skips" — common on UK
                                            // orienteering events for the event-centre/parking
    gridRef: z.string().optional(),         // OS grid ref, e.g. "SD848335"

    // ─────── What
    format: z.string(),                     // "Urban Score", "Street-O", "Snook-O", "Standard"
    level: z.enum(['local', 'regional', 'national', 'major']),
    duration: z.number().optional(),        // minutes
    series: z.string().optional(),          // e.g. "May Street-O", "June Series 2/3"
    // British Orienteering event ID, e.g. 87374. String OR number — the
    // editor may enter "TBC" while the event is being registered with BO
    // and a number hasn't been assigned yet. Old events with numeric
    // YAML values still parse cleanly. Stays optional in the schema so
    // legacy events without it don't fail the build; the CMS marks it
    // required for new entries.
    bofEventNumber: z.union([z.string(), z.number()]).optional(),
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
    /** Optional hero photo shown across the top of the event detail page.
     *  Leave blank for the default text-only event hero. */
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),

    // ─────── Per-event disclaimer
    // The yellow box on the event page. By default every event shows
    // the club-wide BO public-liability notice (see DEFAULT_DISCLAIMER
    // in pages/events/[slug].astro). To replace it with bespoke wording
    // for this event, tick `disclaimerOverride` AND fill in `disclaimer`
    // with the markdown text to display instead. With override off, the
    // `disclaimer` field is ignored.
    disclaimerOverride: z.boolean().optional(),
    disclaimer: z.string().optional(),

    // ─────── Post-event report (filled in after the event)
    // Free-form markdown — typically organiser comments, planner comments,
    // lost property, photo credits etc. When set, a "Report" button appears
    // next to the results files on the event detail page, linking to a
    // dedicated /events/{slug}/report page that renders this content.
    report: z.string().optional(),

    // ─────── Results (filled in after the event)
    results: z.array(z.object({
      label: z.string(),                    // "Full results", "Splits", "RouteGadget"
      url: z.string(),                      // plain string for CMS-friendliness
      type: z.enum(['html', 'pdf', 'xlsx', 'csv']),
      /** Hide this individual results file from the public event page
       *  without deleting the entry. Useful for results withdrawn for
       *  correction. */
      hidden: z.boolean().optional(),
    })).optional(),

    // ─────── Pre-event attachments
    // Course details, briefing notes, parking maps, entry forms — anything
    // visitors should be able to download from the event page. Rendered as
    // a download list at the bottom of the event body.
    attachments: z.array(z.object({
      label: z.string(),
      file: z.string(),
      type: z.enum(['pdf', 'docx', 'xlsx', 'csv', 'image', 'other']).optional(),
    })).optional(),

    // ─────── Photo gallery (filled in after the event)
    // Optional set of post-event photos with alt text and an optional
    // caption. Rendered below the body as a responsive grid. Same shape
    // as the news-article gallery for consistency.
    gallery: z.array(z.object({
      src: z.string(),
      alt: z.string().optional(),
      caption: z.string().optional(),
    })).optional(),

    // ─────── Misc
    cancelled: z.boolean().optional(),
    /** Hide this event from every public page without deleting it.
     *  Use this for test entries, future events not ready for public
     *  view, or anything you'd otherwise be tempted to hard-delete.
     *  Hidden events stay in the CMS and can be un-hidden any time. */
    hidden: z.boolean().optional(),
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
      alt: z.string().optional(),
      caption: z.string().optional(),
    })).optional(),
    attachments: z.array(z.object({
      label: z.string(),
      file: z.string(),
      type: z.enum(['pdf', 'docx', 'xlsx', 'csv', 'image', 'other']).optional(),
    })).optional(),
    draft: z.boolean().optional(),
    /** Pin this article to the top of the news list and use it as the
     *  featured article on the homepage, overriding the default
     *  "most recent" behaviour. Use it to surface an older article that
     *  has become relevant again. */
    featured: z.boolean().optional(),
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

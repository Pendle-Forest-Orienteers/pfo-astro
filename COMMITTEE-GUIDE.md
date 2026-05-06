# PFO website — Committee guide

A short guide for committee members on how to add events, news, maps, and information pages to the PFO website without involving a developer.

The admin area lives at **pfo.org.uk/admin**. You log in by clicking a link in the invitation email you receive (sent by the Netlify dashboard); after the first login you can set a password.

When you save a change, the live site rebuilds automatically and your edit appears in about 30 seconds.

---

## First-time setup

1. Wait for the email invitation from `noreply@netlify.com` (subject: "Welcome to pfo.org.uk").
2. Click the link in the email. It opens **pfo.org.uk** with a sign-up form pre-filled with your email.
3. Set a password and click **Sign up**.
4. You're now logged in. The page will redirect you to **pfo.org.uk/admin** automatically.
5. Bookmark `pfo.org.uk/admin` for future logins.

If your invite link expires, ask the Secretary or Webmaster to send a fresh one from the Netlify dashboard.

---

## Adding a new event

1. Go to **pfo.org.uk/admin** and log in.
2. In the left sidebar, click **Events** → click **New Event** (top right).
3. Fill in the fields:
   - **Event title** — e.g. "Hurstwood Night & Day". Don't include the date, level or format here.
   - **Event date** — when the event happens.
   - **Start time** — display string like "7:00pm" or "10:30am".
   - **Entry close date / time** — when SI Entries closes. This is what makes the event move from "Upcoming" to "Past results" automatically.
   - **Location** — short label like "Burnley" (for cards).
   - **Venue, Postcode, Coordinates** — optional but recommended for forest/regional events.
   - **Format, Level** — pick from the dropdowns.
   - **Entry fee** — free text like "From £6" or "£6 / £8 pair".
   - **SI Entries URL** — paste the direct URL from sientries.co.uk.
   - **Card subtitle** — the 1-line description shown on event cards. e.g. "Score event · Burnley · Local level".
4. Optional: in the **Long-form description** block, add full event details (course information, parking, hazards, etc.) using the rich-text editor.
5. Click **Save** (top right) to save as a draft.
6. When ready to publish, change the status from **Draft** to **Ready** (top of editor), then **Publish**.

Within ~30 seconds the live site will show the new event on the homepage and on the events page.

## Cancelling, hiding, and safe-deleting events

Three different ways an event can come off the public site, ordered from safest to most permanent:

**Cancel an edit you haven't published yet.** While an event is in **Draft** status (unpublished), you can throw away all changes by clicking the editor's three-dot menu and choosing **Delete unpublished entry**. The published version (if there is one) is unaffected. If the event is brand new and was never published, the entry vanishes entirely with no harm done — this is the right move when you've made a mess in the form and want to start over.

**Hide a published event.** Tick the **Hide from public site** checkbox at the bottom of the form, then save and publish. The event disappears from every public page (homepage, events list, calendar, RSS) but stays in the CMS. Untick the checkbox to bring it back. **Use this for test entries or events not ready for public view.** Much safer than the trash button.

**Mark an event cancelled.** Tick **Event cancelled**. The event still appears on the site with a "Cancelled" banner — calendar subscribers' apps will mark the event as cancelled rather than silently disappearing it. Use this when something genuinely won't go ahead.

**Avoid the trash icon.** It's the only path that genuinely deletes an event, and there's no undo from inside the CMS. If you must delete, ask the Webmaster — every change is in git history, but recovery means hand-restoring the file.

---

## Updating event results

When an event has finished and SI Entries has closed:

1. Open the event in the admin (Events → click the event).
2. Scroll to the **Results files** field.
3. Click **Add Results files** and fill in:
   - **File label** — e.g. "Full results", "Splits", "RouteGadget"
   - **File URL** — either upload a file via the Media Library and paste the URL, or paste an external URL (e.g. RouteGadget link).
   - **File type** — pick HTML, PDF, Excel or CSV.
4. You can add multiple results files.
5. Save → Publish.

The event will now appear in the Past Results section with a "Results available" tag.

If you want to upload an Excel or PDF file:

1. Click **Open Media Library** (button next to the URL field, or in the top toolbar).
2. Upload the file.
3. Copy the URL.
4. Paste into the **File URL** field.

---

## Publishing news

1. **News → New News article**.
2. Headline, publish date, summary (1-2 sentences for the homepage card).
3. Optionally upload a hero image — appears on the article page and the homepage if it's the most recent article.
4. Write the article in the **Article body** rich-text editor.
5. Save → Ready → Publish.

To add photos throughout the article, use the image button in the rich-text toolbar. They get uploaded to the site automatically.

---

## Adding a map

1. **Maps → New Map**.
2. Fill in title, near town, terrain, scale.
3. Upload the **Map image** (the actual orienteering map — JPEG, PNG or GIF).
4. Write a short **Card description** for the library page.
5. Save → Publish.

The map appears in the right terrain section of the maps library automatically.

---

## Adding an information page

1. **Information pages → New Information page**.
2. Title, summary, hub section (Governance / Safety / Participation / etc.).
3. Write the body in Markdown.
4. Save → Publish.

The page appears on the Information hub under the chosen section, and at `pfo.org.uk/information/<slug>`.

---

## Editing existing content

For any of the above:

1. Open the collection in the sidebar.
2. Click the entry you want to edit.
3. Make your changes.
4. Save → Publish (or Save as draft and Publish later).

---

## Deleting content

1. Open the entry.
2. Click the **Delete entry** button (red button at the top of the editor).
3. Confirm.

Note: deletes are committed to the Git repo. The Webmaster can recover deleted items if needed by checking the repo's history.

---

## Inviting another committee member

This is done from the Netlify dashboard, not from the CMS.

1. The Webmaster (or whoever has Netlify owner access) goes to https://app.netlify.com.
2. Click into the PFO site.
3. Site settings → Identity → click **Invite users**.
4. Enter the new member's email address. They'll get an invite email.

Anyone with an email invite can log in to the CMS and edit content. There's no separate "permission level" — everyone with access has full edit rights.

---

## Troubleshooting

**Can't log in / link expired.** Ask the Webmaster to resend the invite from the Netlify dashboard. Invites expire after 24 hours.

**Saved a change but the live site hasn't updated.** Wait 60 seconds — Netlify needs to rebuild. If after 2 minutes nothing's changed, check the Netlify dashboard for build errors (Deploys tab).

**Made a mistake on a published page.** Just edit it again. Each save is a separate commit so the history is preserved if anyone needs to roll back.

**Want to see what changes are pending?** The "Workflow" tab in the CMS shows everything that's been saved but not yet published.

**Image upload looks blurry.** The Media Library shows a thumbnail; the original upload is full-resolution and is what's used on the live site. Don't worry about the thumbnail.

---

## Rules of thumb

- **Events** should have a real Entry close date — that's what makes the auto-transition work.
- **Map images** should be exported at decent resolution (1500px+ wide). The site resizes them down for thumbnails.
- **News** without a hero image will still render fine, but a good photo on the homepage's featured-news block has a much bigger impact than the headline alone.
- **Saving as draft** gives you time to review before going live. If you're not 100% sure, save as draft.

Anything not covered here, ask the Webmaster (currently [Andy Ellis](/contacts) for ongoing maintenance, [Kyle Gordon](mailto:kylegmassiah@gmail.com) for the initial build).

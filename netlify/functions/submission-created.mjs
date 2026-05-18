/**
 * Netlify Function: submission-created
 *
 * Automatically called by Netlify whenever any form on the site is
 * submitted (the function name `submission-created` is a magic
 * Netlify convention — no manual wiring needed).
 *
 * Currently handles the `committee-contact` form on /contacts. Reads
 * the visitor's chosen recipient, looks up that committee member's
 * private email address, and forwards the message there directly via
 * Resend (https://resend.com — free tier covers PFO's volume easily).
 *
 * Setup required (one-off, in the Netlify dashboard):
 *   1. Create a Resend account at resend.com (free).
 *   2. Verify pfo.org.uk in Resend → add the supplied SPF/DKIM DNS
 *      records at the domain registrar.
 *   3. Generate a Resend API key (full sending permission).
 *   4. Add it to Netlify project: Project configuration → Environment
 *      variables → New variable, key `RESEND_API_KEY`, value <key>.
 *   5. Trigger a deploy. Done.
 *
 * Email addresses live ONLY here on the server side, never in any
 * HTML response — visitors never see them.
 */

/* ─────────── Routing table — recipient name → email ─────────── */
// Single source of truth: src/data/committee.json — edited via the CMS
// at /admin → Site settings → Committee. This function reads the JSON
// at startup so the routing table reflects the current site.
import committeeData from '../../src/data/committee.json' assert { type: 'json' };
const COMMITTEE = Object.fromEntries(
  (committeeData.members || []).map(m => [m.name, m.email])
);

// Fallback for "General enquiry" or any unmatched recipient. Uses the
// info@ alias which fans out to Andy, George, Hannah and Kay so the
// general enquiry has multiple eyes on it.
const FALLBACK = 'info@pfo.org.uk';

// FROM address (must be on a domain verified in Resend).
const FROM_ADDRESS = 'PFO website <noreply@pfo.org.uk>';

/* ─────────── Helpers ─────────── */

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml({ recipient, name, email, subject, message }) {
  return `
<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #111; max-width: 640px; margin: 0 auto;">
  <p style="margin: 0 0 16px;">You've received a message via the PFO website contact form.</p>

  <table cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="color: #666; padding-right: 12px;"><strong>From:</strong></td><td>${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</td></tr>
    <tr><td style="color: #666;"><strong>For:</strong></td><td>${escapeHtml(recipient)}</td></tr>
    <tr><td style="color: #666;"><strong>Subject:</strong></td><td>${escapeHtml(subject)}</td></tr>
  </table>

  <hr style="border: 0; border-top: 1px solid #ddd; margin: 16px 0;">

  <div style="white-space: pre-wrap; line-height: 1.5;">${escapeHtml(message)}</div>

  <hr style="border: 0; border-top: 1px solid #ddd; margin: 24px 0 12px;">
  <p style="font-size: 12px; color: #888; margin: 0;">
    Reply to this email to respond directly to the sender — your address stays private.
  </p>
</body></html>
  `.trim();
}

function buildText({ recipient, name, email, subject, message }) {
  return [
    `You've received a message via the PFO website contact form.`,
    ``,
    `From:    ${name} <${email}>`,
    `For:     ${recipient}`,
    `Subject: ${subject}`,
    ``,
    `─────────────────────────────────────────`,
    ``,
    message,
    ``,
    `─────────────────────────────────────────`,
    `Reply to this email to respond to the sender directly.`,
  ].join('\n');
}

/* ─────────── Handler ─────────── */

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.log('[submission-created] bad JSON body');
    return new Response('Bad JSON', { status: 400 });
  }

  const submission = body?.payload || {};
  const formName   = submission.form_name || submission.name;
  const data       = submission.data || {};

  if (formName !== 'committee-contact') {
    console.log(`[submission-created] ignoring form: ${formName}`);
    return new Response('Form not handled', { status: 200 });
  }

  const recipient = (data.recipient || '').trim();
  const name      = (data.name      || '').trim();
  const email     = (data.email     || '').trim();
  const subject   = (data.subject   || '(no subject)').trim();
  const message   = (data.message   || '').trim();

  if (!name || !email || !message) {
    console.log('[submission-created] missing required fields');
    return new Response('Missing fields', { status: 400 });
  }

  const targetEmail = COMMITTEE[recipient] || FALLBACK;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[submission-created] RESEND_API_KEY not set');
    return new Response('Email service not configured', { status: 500 });
  }

  const subjectLine = `[PFO website] ${subject}`;

  const payload = {
    from: FROM_ADDRESS,
    to: [targetEmail],
    reply_to: email,
    subject: subjectLine,
    html: buildHtml({ recipient, name, email, subject, message }),
    text: buildText({ recipient, name, email, subject, message }),
  };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[submission-created] Resend error', res.status, errBody);
      return new Response('Email send failed', { status: 500 });
    }

    const result = await res.json();
    console.log(
      `[submission-created] routed to ${recipient} <${targetEmail}>, ` +
      `Resend id=${result.id || '?'}`
    );
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('[submission-created] fetch error:', err.message);
    return new Response('Email send failed', { status: 500 });
  }
};

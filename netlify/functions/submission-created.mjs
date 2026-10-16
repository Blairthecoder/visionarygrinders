// Netlify runs this after every verified Netlify Forms submission (spam and
// honeypot hits never reach it). It adds or updates the email in the Mailchimp
// audience and tags it by form. Every failure is logged and swallowed, so
// Mailchimp can never affect a visitor's form submission.
import { createHash } from 'node:crypto';

// optIn: only sync the contact when the "Send me Visionary Grinders updates"
// checkbox (OPT_IN_FIELD) was ticked.
const FORMS = {
  newsletter: { tag: 'newsletter', optIn: false },
  'merch-interest': { tag: 'shirt-waitlist', optIn: true },
  'event-inquiry': { tag: 'event-inquiry', optIn: true },
};
const OPT_IN_FIELD = 'email-updates';
const TIMEOUT_MS = 8000;

export default async (req) => {
  try {
    const { payload } = await req.json();
    await syncToMailchimp(payload ?? {});
  } catch (error) {
    console.error('Mailchimp sync failed:', error?.message ?? error);
  }
  return new Response(null, { status: 204 });
};

async function syncToMailchimp(payload) {
  const apiKey = Netlify.env.get('MAILCHIMP_API_KEY');
  const audienceId = Netlify.env.get('MAILCHIMP_AUDIENCE_ID');
  if (!apiKey || !audienceId) return;

  const data = payload.data ?? {};
  const formName = payload.form_name ?? data['form-name'];
  const form = FORMS[formName];
  if (!form) return;
  if (form.optIn && !isChecked(data[OPT_IN_FIELD])) return;

  const email = String(data.email ?? payload.email ?? '').trim();
  if (!email.includes('@')) {
    console.error(`Mailchimp sync skipped: ${formName} submission has no email address.`);
    return;
  }

  // API keys end in the account's data center, e.g. "...-us21".
  const dataCenter = apiKey.split('-').pop();
  if (!/^[a-z]+\d+$/.test(dataCenter)) {
    console.error('Mailchimp sync skipped: MAILCHIMP_API_KEY does not end in a data center such as "-us21".');
    return;
  }

  const subscriberHash = createHash('md5').update(email.toLowerCase()).digest('hex');
  const member = `https://${dataCenter}.api.mailchimp.com/3.0/lists/${encodeURIComponent(audienceId)}/members/${subscriberHash}`;
  const auth = `Basic ${Buffer.from(`visionarygrinders:${apiKey}`).toString('base64')}`;

  // status_if_new subscribes new contacts and leaves existing contacts'
  // status alone, so someone who unsubscribed is never re-subscribed.
  await mailchimp(auth, 'PUT', `${member}?skip_merge_validation=true`, {
    email_address: email,
    status_if_new: 'subscribed',
  });
  await mailchimp(auth, 'POST', `${member}/tags`, {
    tags: [{ name: form.tag, status: 'active' }],
  });
  console.log(`Mailchimp sync ok: ${formName} signup tagged "${form.tag}".`);
}

async function mailchimp(auth, method, url, body) {
  const response = await fetch(url, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.ok) return;
  const problem = await response.json().catch(() => ({}));
  throw new Error(`${method} ${new URL(url).pathname} returned ${response.status}: ${problem.title ?? response.statusText}. ${problem.detail ?? ''}`.trim());
}

// An unticked checkbox is left out of the submission entirely.
function isChecked(value) {
  return [value].flat().some((item) => item === true ||
    (typeof item === 'string' && item.trim() !== '' && !/^(false|no|off|0)$/i.test(item.trim())));
}

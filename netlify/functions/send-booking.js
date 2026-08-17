// Netlify Function: send-booking
// Receives the booking form submission and sends two emails via Resend:
//   1. The full booking details to the business inbox
//   2. A confirmation email to the customer
// The RESEND_API_KEY is read from an environment variable set in the
// Netlify dashboard — it never appears in the frontend code.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { name, phone, email, pickup, dropoff, date, time, notes } = data;

  if (!name || !phone || !email || !pickup || !dropoff || !date || !time) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY is not configured' }) };
  }

  // Where the full booking notification goes. Update this to your real inbox.
  const NOTIFY_TO = process.env.BOOKING_NOTIFY_EMAIL || 'contact@flyinglimoinc.com';

  // Sender address. Must be on a domain verified in Resend.
  // Use Resend's shared testing address until your domain is verified —
  // note: in test mode Resend only allows sending TO your own verified
  // account email, so the customer confirmation email below will only
  // work once flyinglimoinc.com is verified in Resend.
  const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Flying Limo Bookings <onboarding@resend.dev>';

  const escapeHtml = (str = '') =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const internalHtml = `
    <div style="font-family: Arial, sans-serif; color:#111; line-height:1.5;">
      <h2 style="margin-bottom:8px;">New booking request</h2>
      <table cellpadding="6" style="border-collapse:collapse;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
        <tr><td><strong>Pickup</strong></td><td>${escapeHtml(pickup)}</td></tr>
        <tr><td><strong>Drop-off</strong></td><td>${escapeHtml(dropoff)}</td></tr>
        <tr><td><strong>Date</strong></td><td>${escapeHtml(date)}</td></tr>
        <tr><td><strong>Time</strong></td><td>${escapeHtml(time)}</td></tr>
        <tr><td><strong>Notes</strong></td><td>${escapeHtml(notes) || '&mdash;'}</td></tr>
      </table>
    </div>
  `;

  const customerHtml = `
    <div style="font-family: Arial, sans-serif; color:#111; line-height:1.6;">
      <h2 style="margin-bottom:8px;">Thanks, ${escapeHtml(name)} — we've got your request.</h2>
      <p>We'll confirm your ride shortly. Here's what you sent us:</p>
      <table cellpadding="6" style="border-collapse:collapse;">
        <tr><td><strong>Pickup</strong></td><td>${escapeHtml(pickup)}</td></tr>
        <tr><td><strong>Drop-off</strong></td><td>${escapeHtml(dropoff)}</td></tr>
        <tr><td><strong>Date</strong></td><td>${escapeHtml(date)}</td></tr>
        <tr><td><strong>Time</strong></td><td>${escapeHtml(time)}</td></tr>
      </table>
      <p style="margin-top:20px;">Questions in the meantime? Call us at +1 (415) 674-7777.</p>
      <p>— Flying Limo Co.</p>
    </div>
  `;

  const sendEmail = async (payload) => {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const ok = res.ok;
    const text = ok ? null : await res.text();
    return { ok, text };
  };

  try {
    const internalResult = await sendEmail({
      from: FROM_ADDRESS,
      to: [NOTIFY_TO],
      subject: `New booking request — ${name}`,
      html: internalHtml,
    });

    const customerResult = await sendEmail({
      from: FROM_ADDRESS,
      to: [email],
      subject: `We've got your ride request — Flying Limo Co.`,
      html: customerHtml,
    });

    if (!internalResult.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Internal notification failed', details: internalResult.text }),
      };
    }

    // Don't fail the whole request if just the customer email didn't send
    // (e.g. domain not verified in Resend yet) — the business still got notified.
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        customerEmailSent: customerResult.ok,
        customerEmailError: customerResult.ok ? null : customerResult.text,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', details: err.message }) };
  }
};

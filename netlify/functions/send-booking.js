// Netlify Function: send-booking
// Receives the booking form submission and sends it via Resend.
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

  const { name, phone, pickup, dropoff, date, time, notes } = data;

  if (!name || !phone || !pickup || !dropoff || !date || !time) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY is not configured' }) };
  }

  // Where booking notifications get sent. Update this to your real inbox.
  const NOTIFY_TO = process.env.BOOKING_NOTIFY_EMAIL || 'book@flyinglimo.co';

  // Sender address. Must be on a domain verified in Resend.
  // Use Resend's shared testing address until your domain is verified.
  const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Flying Limo Bookings <onboarding@resend.dev>';

  const escapeHtml = (str = '') =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const html = `
    <div style="font-family: Arial, sans-serif; color:#111; line-height:1.5;">
      <h2 style="margin-bottom:8px;">New booking request</h2>
      <table cellpadding="6" style="border-collapse:collapse;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone)}</td></tr>
        <tr><td><strong>Pickup</strong></td><td>${escapeHtml(pickup)}</td></tr>
        <tr><td><strong>Drop-off</strong></td><td>${escapeHtml(dropoff)}</td></tr>
        <tr><td><strong>Date</strong></td><td>${escapeHtml(date)}</td></tr>
        <tr><td><strong>Time</strong></td><td>${escapeHtml(time)}</td></tr>
        <tr><td><strong>Notes</strong></td><td>${escapeHtml(notes) || '&mdash;'}</td></tr>
      </table>
    </div>
  `;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [NOTIFY_TO],
        reply_to: undefined,
        subject: `New booking request — ${name}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Resend request failed', details: errText }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', details: err.message }) };
  }
};

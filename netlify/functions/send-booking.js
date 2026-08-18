// Netlify Function: send-booking
// Receives the booking form submission and sends two branded emails via Resend:
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

  const { name, phone, email, vehicle, pickup, dropoff, date, time, notes } = data;

  if (!name || !phone || !email || !vehicle || !pickup || !dropoff || !date || !time) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY is not configured' }) };
  }

  const NOTIFY_TO = process.env.BOOKING_NOTIFY_EMAIL || 'contact@flyinglimoinc.com';
  const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Flying Limo Bookings <onboarding@resend.dev>';

  const esc = (str = '') =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // ---------- Internal notification email ----------
  const internalHtml = `<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#0B0E14; border-radius:6px; overflow:hidden;">
<tr>
<td style="padding:32px 36px 24px; border-bottom:1px solid #262b3a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="font-family:Georgia, 'Times New Roman', serif; font-size:18px; color:#EDEFF3; letter-spacing:0.5px;">FLYING <span style="color:#B08D57;">LIMO</span> CO.</td>
<td align="right" style="font-family:'Courier New', monospace; font-size:11px; color:#B08D57; letter-spacing:2px;">NEW BOOKING</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:28px 36px 8px;">
<div style="font-family:Georgia, 'Times New Roman', serif; font-size:24px; color:#EDEFF3; margin-bottom:6px;">New booking request</div>
<div style="font-family:Arial, sans-serif; font-size:13px; color:#8b93a7; margin-bottom:24px;">Submitted just now from flyinglimoinc.com</div>
</td>
</tr>
<tr>
<td style="padding:0 36px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #262b3a; border-radius:4px; overflow:hidden;">
<tr><td style="padding:14px 18px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#6b7488; border-bottom:1px solid #1c2130;">NAME</td><td style="padding:14px 18px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; border-bottom:1px solid #1c2130;">${esc(name)}</td></tr>
<tr><td style="padding:14px 18px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#6b7488; background-color:#12172a; border-bottom:1px solid #1c2130;">PHONE</td><td style="padding:14px 18px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; background-color:#12172a; border-bottom:1px solid #1c2130;">${esc(phone)}</td></tr>
<tr><td style="padding:14px 18px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#6b7488; border-bottom:1px solid #1c2130;">EMAIL</td><td style="padding:14px 18px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; border-bottom:1px solid #1c2130;">${esc(email)}</td></tr>
<tr><td style="padding:14px 18px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#6b7488; background-color:#12172a; border-bottom:1px solid #1c2130;">VEHICLE</td><td style="padding:14px 18px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; background-color:#12172a; border-bottom:1px solid #1c2130;">${esc(vehicle)}</td></tr>
<tr><td style="padding:14px 18px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#6b7488; border-bottom:1px solid #1c2130;">PICKUP</td><td style="padding:14px 18px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; border-bottom:1px solid #1c2130;">${esc(pickup)}</td></tr>
<tr><td style="padding:14px 18px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#6b7488; background-color:#12172a; border-bottom:1px solid #1c2130;">DROP-OFF</td><td style="padding:14px 18px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; background-color:#12172a; border-bottom:1px solid #1c2130;">${esc(dropoff)}</td></tr>
<tr><td style="padding:14px 18px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#6b7488; border-bottom:1px solid #1c2130;">DATE</td><td style="padding:14px 18px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; border-bottom:1px solid #1c2130;">${esc(date)}</td></tr>
<tr><td style="padding:14px 18px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#6b7488; background-color:#12172a; border-bottom:1px solid #1c2130;">TIME</td><td style="padding:14px 18px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; background-color:#12172a; border-bottom:1px solid #1c2130;">${esc(time)}</td></tr>
<tr><td style="padding:14px 18px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#6b7488; vertical-align:top;">NOTES</td><td style="padding:14px 18px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right;">${esc(notes) || '&mdash;'}</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:0 36px 32px;">
<a href="tel:+14156747777" style="display:inline-block; background-color:#B08D57; color:#0B0E14; font-family:'Courier New', monospace; font-size:12px; letter-spacing:1px; text-decoration:none; padding:12px 24px; border-radius:3px;">CALL CUSTOMER &rarr;</a>
</td>
</tr>
<tr>
<td style="padding:20px 36px; border-top:1px solid #262b3a; font-family:'Courier New', monospace; font-size:10px; color:#6b7488; letter-spacing:1px;">FLYING LIMO CO. &middot; AUTOMATED NOTIFICATION</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  // ---------- Customer confirmation email ----------
  const customerHtml = `<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#0B0E14; border-radius:6px; overflow:hidden;">
<tr>
<td style="padding:32px 36px 24px; border-bottom:1px solid #262b3a;" align="center">
<div style="font-family:Georgia, 'Times New Roman', serif; font-size:18px; color:#EDEFF3; letter-spacing:0.5px;">FLYING <span style="color:#B08D57;">LIMO</span> CO.</div>
</td>
</tr>
<tr>
<td style="padding:36px 36px 8px;" align="center">
<div style="font-family:'Courier New', monospace; font-size:11px; letter-spacing:2px; color:#B08D57; margin-bottom:14px;">REQUEST RECEIVED</div>
<div style="font-family:Georgia, 'Times New Roman', serif; font-size:26px; color:#EDEFF3; margin-bottom:12px; line-height:1.3;">Thanks, ${esc(name)}.<br>We&rsquo;ve got your ride.</div>
<div style="font-family:Arial, sans-serif; font-size:14px; color:#a9afc0; max-width:420px; margin:0 auto 32px; line-height:1.6;">We&rsquo;ll confirm your chauffeur and vehicle shortly. Here are the details you sent us:</div>
</td>
</tr>
<tr>
<td style="padding:0 36px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #262b3a; border-radius:4px; overflow:hidden;">
<tr><td style="padding:16px 20px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#B08D57; border-bottom:1px dashed #262b3a;">VEHICLE</td><td style="padding:16px 20px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; border-bottom:1px dashed #262b3a;">${esc(vehicle)}</td></tr>
<tr><td style="padding:16px 20px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#B08D57; border-bottom:1px dashed #262b3a;">PICKUP</td><td style="padding:16px 20px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; border-bottom:1px dashed #262b3a;">${esc(pickup)}</td></tr>
<tr><td style="padding:16px 20px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#B08D57; border-bottom:1px dashed #262b3a;">DROP-OFF</td><td style="padding:16px 20px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; border-bottom:1px dashed #262b3a;">${esc(dropoff)}</td></tr>
<tr><td style="padding:16px 20px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#B08D57; border-bottom:1px dashed #262b3a;">DATE</td><td style="padding:16px 20px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right; border-bottom:1px dashed #262b3a;">${esc(date)}</td></tr>
<tr><td style="padding:16px 20px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:1px; color:#B08D57;">TIME</td><td style="padding:16px 20px; font-family:Arial, sans-serif; font-size:14px; color:#EDEFF3; text-align:right;">${esc(time)}</td></tr>
</table>
</td>
</tr>
<tr>
<td style="padding:28px 36px 8px;" align="center">
<table role="presentation" cellpadding="0" cellspacing="0">
<tr>
<td style="width:8px; height:8px; border-radius:50%; background-color:#B08D57; font-size:0; line-height:0;">&nbsp;</td>
<td style="font-family:'Courier New', monospace; font-size:10px; color:#6b7488; letter-spacing:1px; padding:0 10px;">REQUEST</td>
<td style="width:24px; border-top:1px dashed #444c5e; font-size:0; line-height:0;">&nbsp;</td>
<td style="width:8px; height:8px; border-radius:50%; background-color:#444c5e; font-size:0; line-height:0;">&nbsp;</td>
<td style="font-family:'Courier New', monospace; font-size:10px; color:#444c5e; letter-spacing:1px; padding:0 10px;">CONFIRM</td>
<td style="width:24px; border-top:1px dashed #444c5e; font-size:0; line-height:0;">&nbsp;</td>
<td style="width:8px; height:8px; border-radius:50%; background-color:#444c5e; font-size:0; line-height:0;">&nbsp;</td>
<td style="font-family:'Courier New', monospace; font-size:10px; color:#444c5e; letter-spacing:1px; padding:0 10px;">RIDE</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:32px 36px 8px;" align="center">
<div style="font-family:Arial, sans-serif; font-size:13px; color:#a9afc0; margin-bottom:18px;">Need to change something, or have a question?</div>
<a href="tel:+14156747777" style="display:inline-block; background-color:#B08D57; color:#0B0E14; font-family:'Courier New', monospace; font-size:12px; letter-spacing:1px; text-decoration:none; padding:13px 28px; border-radius:3px;">CALL +1 (415) 674-7777</a>
</td>
</tr>
<tr>
<td style="padding:32px 36px 24px; border-top:1px solid #262b3a; margin-top:24px;" align="center">
<div style="font-family:Georgia, serif; font-style:italic; font-size:13px; color:#6b7488;">&mdash; Flying Limo Co.</div>
<div style="font-family:'Courier New', monospace; font-size:10px; color:#444c5e; letter-spacing:1px; margin-top:10px;">PRIVATE CHAUFFEURED TRANSPORT &middot; 24/7 DISPATCH</div>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const sendEmail = async (payload) => {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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
      return { statusCode: 502, body: JSON.stringify({ error: 'Internal notification failed', details: internalResult.text }) };
    }

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

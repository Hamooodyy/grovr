/**
 * lib/twilio.ts
 *
 * Sends SMS via Twilio REST API using fetch (no SDK dependency).
 *
 * Env vars:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? "";

export async function sendSMS(to: string, body: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn("[twilio] Missing Twilio credentials — skipping SMS");
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const params = new URLSearchParams({
    From: TWILIO_PHONE_NUMBER,
    To: to,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Twilio API error ${res.status}: ${errBody}`);
  }
}

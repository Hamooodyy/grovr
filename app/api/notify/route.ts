import { NextResponse } from "next/server";
import { sendSMS } from "@/lib/twilio";

interface NotifyRequestBody {
  phone: string;
  resultId: string;
  storeName: string;
  subtotal: number;
  itemCount: number;
}

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export async function POST(request: Request) {
  let body: NotifyRequestBody;

  try {
    body = (await request.json()) as NotifyRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { phone, resultId, storeName, subtotal, itemCount } = body;

  if (!phone || !E164_REGEX.test(phone)) {
    return NextResponse.json(
      { error: "phone must be in E.164 format (e.g., +15551234567)" },
      { status: 400 }
    );
  }

  if (!resultId || !storeName) {
    return NextResponse.json(
      { error: "resultId and storeName are required" },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://grovr.com";
  const msg = [
    `Grovr found your best deal!`,
    `${storeName} has your ${itemCount} item${itemCount !== 1 ? "s" : ""} for $${subtotal.toFixed(2)}.`,
    `View results: ${baseUrl}/results/${resultId}`,
  ].join(" ");

  try {
    await sendSMS(phone, msg);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/notify]", err);
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}

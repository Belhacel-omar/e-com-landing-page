import { NextResponse } from "next/server";
import { appendOrderRow } from "../../../lib/google-sheets";
import { commercialValues, createOrderId, duplicateKey, validateOrderPayload } from "../../../lib/orders";
import { ORDER_CONFIG } from "../../../lib/order-config";
import {
  createOrderConfirmation,
  ORDER_CONFIRMATION_COOKIE,
  ORDER_CONFIRMATION_MAX_AGE_SECONDS,
} from "../../../lib/order-confirmation";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;
const DUPLICATE_WINDOW_MS = 60_000;
const recent = new Map<string, number>();

function json(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get("content-length") || "0");
    if (declaredLength > MAX_BODY_BYTES) return json({ success: false, error: "PAYLOAD_TOO_LARGE" }, 413);

    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return json({ success: false, error: "PAYLOAD_TOO_LARGE" }, 413);

    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json({ success: false, error: "INVALID_JSON" }, 400); }

    const validated = validateOrderPayload(body);
    if (!validated.ok) return json({ success: false, error: validated.error }, 400);

    const key = duplicateKey(validated.value);
    const now = Date.now();
    const last = recent.get(key);
    if (last && now - last < DUPLICATE_WINDOW_MS) return json({ success: false, error: "DUPLICATE_SUBMISSION" }, 409);
    recent.set(key, now);

    const orderId = createOrderId();
    const createdAt = new Date().toISOString();
    const commercial = commercialValues();
    const o = validated.value;

    try {
      await appendOrderRow([
        orderId, createdAt, o.fullName, o.phone, o.track, o.wilaya, o.commune, o.deliveryType,
        commercial.product, commercial.unitPrice, commercial.deliveryPrice, commercial.total,
        ORDER_CONFIG.initialStatus, o.utmSource, o.utmMedium, o.utmCampaign, o.utmContent, o.utmTerm,
        ORDER_CONFIG.landingPage,
      ]);
    } catch (error) {
      recent.delete(key);
      console.error("Order persistence failed", error instanceof Error ? error.message : "unknown");
      return json({ success: false, error: "ORDER_PERSISTENCE_FAILED" }, 503);
    }

    let confirmation: string;
    try {
      confirmation = createOrderConfirmation(orderId);
    } catch {
      return json({ success: false, error: "ORDER_CONFIRMATION_UNAVAILABLE" }, 503);
    }

    const response = json({ success: true, orderId }, 201);
    response.cookies.set({
      name: ORDER_CONFIRMATION_COOKIE,
      value: confirmation,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/order-success",
      maxAge: ORDER_CONFIRMATION_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return json({ success: false, error: "INTERNAL_SERVER_ERROR" }, 500);
  }
}

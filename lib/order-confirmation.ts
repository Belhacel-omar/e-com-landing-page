import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isValidOrderId } from "./orders";

export const ORDER_CONFIRMATION_COOKIE = "bac_master_order_confirmation";
export const ORDER_CONFIRMATION_MAX_AGE_SECONDS = 15 * 60;

type ConfirmationPayload = { orderId: string; iat: number; exp: number };

function secret() {
  const value = process.env.ORDER_CONFIRMATION_SECRET;
  if (!value) throw new Error("ORDER_CONFIRMATION_NOT_CONFIGURED");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createOrderConfirmation(orderId: string, nowMs = Date.now()) {
  if (!isValidOrderId(orderId)) throw new Error("INVALID_ORDER_ID");
  const iat = Math.floor(nowMs / 1000);
  const payload: ConfirmationPayload = { orderId, iat, exp: iat + ORDER_CONFIRMATION_MAX_AGE_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyOrderConfirmation(token: string | null | undefined, nowMs = Date.now()): string | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const [encoded, suppliedSignature] = parts;
    const expected = Buffer.from(sign(encoded), "utf8");
    const supplied = Buffer.from(suppliedSignature, "utf8");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<ConfirmationPayload>;
    const now = Math.floor(nowMs / 1000);
    if (!isValidOrderId(payload.orderId) || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return null;
    if ((payload.iat as number) > now + 60 || (payload.exp as number) <= now) return null;
    if ((payload.exp as number) - (payload.iat as number) !== ORDER_CONFIRMATION_MAX_AGE_SECONDS) return null;
    return payload.orderId as string;
  } catch {
    return null;
  }
}

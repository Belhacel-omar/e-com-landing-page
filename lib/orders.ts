import { createHash, randomBytes } from "node:crypto";
import { BAC_TRACKS, DELIVERY_TYPES, ORDER_CONFIG } from "./order-config";
import locationData from "../data/algeria-locations-2026.json";

const WILAYA_COMMUNES = new Map(
  locationData.wilayas.map((wilaya) => [wilaya.nameAr, new Set(wilaya.communes.map((commune) => commune.nameAr))]),
);

export type ValidatedOrder = {
  fullName: string; phone: string; track: string; wilaya: string; commune: string;
  deliveryType: string; utmSource: string; utmMedium: string; utmCampaign: string;
  utmContent: string; utmTerm: string;
};

const MAX = { fullName: 120, phone: 32, track: 64, wilaya: 80, commune: 120, deliveryType: 32, utm: 200 };
const ORDER_ID_PATTERN = /^BAC-2027-[0-9A-Z]+-[0-9A-F]{8}$/;
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max) : "";

export function normalizeAlgerianPhone(input: unknown): string | null {
  let value = clean(input, MAX.phone).replace(/[\s().-]/g, "");
  if (value.startsWith("00213")) value = "+" + value.slice(2);
  if (value.startsWith("+213")) value = "0" + value.slice(4);
  else if (value.startsWith("213")) value = "0" + value.slice(3);
  if (!/^0[567]\d{8}$/.test(value)) return null;
  return value;
}

export function validateOrderPayload(body: unknown): { ok: true; value: ValidatedOrder } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "INVALID_PAYLOAD" };
  const x = body as Record<string, unknown>;
  const fullName = clean(x.fullName, MAX.fullName);
  const phone = normalizeAlgerianPhone(x.phone);
  const track = clean(x.track, MAX.track);
  const wilaya = clean(x.wilaya, MAX.wilaya);
  const commune = clean(x.commune, MAX.commune);
  const deliveryType = clean(x.deliveryType, MAX.deliveryType);
  if (!fullName) return { ok: false, error: "FULL_NAME_REQUIRED" };
  if (!phone) return { ok: false, error: "INVALID_PHONE" };
  if (!(BAC_TRACKS as readonly string[]).includes(track)) return { ok: false, error: "INVALID_TRACK" };
  if (!wilaya) return { ok: false, error: "WILAYA_REQUIRED" };
  if (!commune) return { ok: false, error: "COMMUNE_REQUIRED" };
  const communes = WILAYA_COMMUNES.get(wilaya);
  if (!communes) return { ok: false, error: "INVALID_WILAYA" };
  if (!communes.has(commune)) return { ok: false, error: "INVALID_COMMUNE_FOR_WILAYA" };
  if (!(DELIVERY_TYPES as readonly string[]).includes(deliveryType)) return { ok: false, error: "INVALID_DELIVERY_TYPE" };
  return { ok: true, value: {
    fullName, phone, track, wilaya, commune, deliveryType,
    utmSource: clean(x.utmSource, MAX.utm), utmMedium: clean(x.utmMedium, MAX.utm),
    utmCampaign: clean(x.utmCampaign, MAX.utm), utmContent: clean(x.utmContent, MAX.utm),
    utmTerm: clean(x.utmTerm, MAX.utm),
  }};
}

export function createOrderId() {
  return `BAC-2027-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function isValidOrderId(value: unknown): value is string {
  return typeof value === "string" && ORDER_ID_PATTERN.test(value);
}

export function duplicateKey(order: ValidatedOrder) {
  return createHash("sha256").update([order.phone, order.track, order.wilaya, order.commune, order.deliveryType].join("|")).digest("hex");
}

export function commercialValues() {
  const deliveryPrice = ORDER_CONFIG.deliveryPricing.configured ? ORDER_CONFIG.deliveryPricing.priceDzd : null;
  return {
    product: ORDER_CONFIG.productName,
    unitPrice: ORDER_CONFIG.unitPriceDzd,
    deliveryPrice,
    total: deliveryPrice === null ? null : ORDER_CONFIG.unitPriceDzd + deliveryPrice,
  };
}

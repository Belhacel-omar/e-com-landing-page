export const ORDER_CONFIG = {
  productName: "BAC MASTER 2027",
  unitPriceDzd: 3900,
  landingPage: "bac-master-2027",
  initialStatus: "NEW",
  deliveryPricing: {
    configured: false as const,
    priceDzd: null,
  },
} as const;

export const BAC_TRACKS = [
  "علوم تجريبية",
  "رياضيات",
  "تقني رياضي",
  "تسيير واقتصاد",
  "آداب وفلسفة",
  "لغات أجنبية",
] as const;

// Canonical values currently rendered by the frontend form.
export const DELIVERY_TYPES = ["office", "home"] as const;

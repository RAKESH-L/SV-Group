import { z } from "zod";

export const posterFormats = {
  status: { label: "WhatsApp Status · 9:16", width: 1080, height: 1920 },
  square: { label: "WhatsApp Post · 1:1", width: 1080, height: 1080 },
  portrait: { label: "Instagram Post · 4:5", width: 1080, height: 1350 },
  banner: { label: "Website Banner · 4:1", width: 1200, height: 300 },
} as const;

export const posterTemplates = {
  ivory: { label: "Festive Ivory", description: "Warm cream, forest green and terracotta", bg: "#faf4e7", ink: "#173e33", accent: "#b85031", gold: "#c28c38" },
  midnight: { label: "Midnight Gold", description: "Black, gold and elegant fireworks", bg: "#17110e", ink: "#ffefce", accent: "#f0be67", gold: "#d99d42" },
  emerald: { label: "Royal Emerald", description: "Rich emerald and champagne gold", bg: "#103c31", ink: "#fff5df", accent: "#e2bd72", gold: "#d5aa60" },
  ruby: { label: "Celebration Ruby", description: "Burgundy, gold and festive warmth", bg: "#641c25", ink: "#fff3e6", accent: "#f1bf7b", gold: "#e6b161" },
  minimal: { label: "Modern Minimal", description: "Simple, polished cream and olive", bg: "#f2f0e9", ink: "#28463b", accent: "#a36c46", gold: "#ae8852" },
} as const;

export const posterConfigSchema = z.object({
  template: z.enum(["ivory", "midnight", "emerald", "ruby", "minimal"]),
  format: z.enum(["status", "square", "portrait", "banner"]),
  eyebrow: z.string().trim().min(2).max(40),
  headline: z.string().trim().min(3).max(75),
  description: z.string().trim().min(3).max(170),
  offer: z.string().trim().max(85),
  buttonText: z.string().trim().min(2).max(40),
  productId: z.string().max(100).nullable(),
  showQr: z.boolean(),
  showPhone: z.boolean(),
}).strict();

export type PosterConfig = z.infer<typeof posterConfigSchema>;
export type PosterTemplate = PosterConfig["template"];
export type PosterFormat = PosterConfig["format"];

export type PosterProduct = {
  id: string;
  name: string;
  categoryName: string;
  imageUrl: string | null;
};

export type PosterDraft = {
  id: string;
  name: string;
  config: PosterConfig;
  createdAt: string;
  updatedAt: string;
};

export const defaultPosterConfig: PosterConfig = {
  template: "ivory",
  format: "status",
  eyebrow: "SRI VINAYAKA GROUPS · TUMKUR",
  headline: "Celebrate brighter together",
  description: "Explore our festive catalogue, discover product categories and compare indicative prices.",
  offer: "Explore festive favourites and seasonal highlights",
  buttonText: "Explore our catalogue",
  productId: null,
  showQr: true,
  showPhone: true,
};

export const posterStarterMessages = [
  { label: "Website Highlights", eyebrow: "WELCOME TO SV GROUPS", headline: "Your festive guide is here", description: "Explore the catalogue, discover categories and plan your celebration with our price calculator.", offer: "Browse our website today" },
  { label: "Festival Greetings", eyebrow: "THE SEASON OF LIGHT", headline: "Make room for a little wonder", description: "Wishing you brighter evenings, familiar faces and beautiful festive memories.", offer: "Celebrate thoughtfully" },
  { label: "New Arrivals", eyebrow: "EXPLORE OUR COLLECTION", headline: "New festive favourites await", description: "Discover our latest catalogue selections and get in touch for more product information.", offer: "Explore what's new" },
  { label: "Catalogue Offers", eyebrow: "FESTIVAL COLLECTION", headline: "Discover seasonal savings", description: "Compare indicative catalogue prices and ask our team about current offers on selected products.", offer: "Offers and availability are subject to confirmation" },
  { label: "Product Spotlight", eyebrow: "FEATURED PRODUCT", headline: "Something special to explore", description: "See product details, categories and indicative prices in our online catalogue.", offer: "Browse product highlights" },
] as const;

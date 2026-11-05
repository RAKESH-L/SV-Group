import type { MetadataRoute } from "next";
import { getPublishedSiteLogo } from "@/lib/site-theme";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const logo = await getPublishedSiteLogo();
  return {
    id: "/",
    name: "Sri Vinayaka Groups",
    short_name: "SV Groups",
    description: "Explore the Sri Vinayaka Groups festive catalogue and plan your celebration.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#173E33",
    theme_color: "#173E33",
    orientation: "any",
    lang: "en",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: `/api/pwa/icon/192?logo=${logo}`, type: "image/png", sizes: "192x192", purpose: "any" },
      { src: `/api/pwa/icon/512?logo=${logo}`, type: "image/png", sizes: "512x512", purpose: "any" },
      { src: `/api/pwa/icon/512?logo=${logo}&maskable=1`, type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Catalogue", short_name: "Catalogue", url: "/catalogue" },
      { name: "Categories", short_name: "Categories", url: "/categories" },
      { name: "Price Calculator", short_name: "Calculator", url: "/cart" },
    ],
  };
}

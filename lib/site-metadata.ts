import type { Metadata } from "next";

export const siteTitle = "Mouthfolio · Public views on investments";
export const siteDescription = "A person’s public views on investments, with the dates and sources behind them. The early alpha starts with Anthropic.";

export function siteMetadata(origin?: string, basePath = ""): Metadata {
  if (!["", "/mouthfolio"].includes(basePath)) throw new Error("Unsupported Mouthfolio base path");
  let publicOrigin: URL | undefined;
  if (origin) {
    publicOrigin = new URL(origin);
    if (publicOrigin.protocol !== "https:" || publicOrigin.username || publicOrigin.password || publicOrigin.pathname !== "/" || publicOrigin.search || publicOrigin.hash) {
      throw new Error("MOUTHFOLIO_PUBLIC_ORIGIN must be an HTTPS origin without credentials, path, query or fragment");
    }
  }
  const image = publicOrigin ? new URL(`${basePath}/social-preview`, publicOrigin).href : undefined;
  return {
    title: siteTitle,
    description: siteDescription,
    robots: { index: false, follow: false },
    ...(publicOrigin ? { metadataBase: publicOrigin } : {}),
    openGraph: { type: "website", siteName: "Mouthfolio", title: siteTitle, description: siteDescription,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: "Mouthfolio. What’s in a Mouthfolio? A person’s public views on investments, with the dates and sources behind them. Early alpha · Starting with Anthropic. Powered by ASOF Data." }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title: siteTitle, description: siteDescription,
      ...(image ? { images: [image] } : {}) },
  };
}

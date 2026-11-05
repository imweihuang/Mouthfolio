import type { Metadata } from "next";

export const headline = "Their words. Their Mouthfolio.";
export const definition = "A portfolio of views, with dates and original sources.";
export const supportingCopy = "Explore a person’s public investment views across companies and over time. Or start with a company and discover what people are saying about it.";
export const siteTitle = "Mouthfolio · A portfolio of views";
export const siteDescription = supportingCopy + " " + definition;

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
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: `Mouthfolio. ${siteDescription} Powered by ASOF Data.` }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title: siteTitle, description: siteDescription,
      ...(image ? { images: [image] } : {}) },
  };
}

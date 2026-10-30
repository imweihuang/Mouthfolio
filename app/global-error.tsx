"use client";
import ResearchError from "./error";
import "./globals.css";

// An interrupted route stream can also reject metadata outside the route's
// boundary. This fallback owns the document when the root layout is replaced.
export default function GlobalResearchError() {
  return <html lang="en"><head><title>Mouthfolio · Research unavailable</title></head><body><ResearchError/></body></html>;
}

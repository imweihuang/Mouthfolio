import { ImageResponse } from "next/og";
import { definition, headline } from "../../lib/site-metadata";

// Original typographic artwork. No external images, fonts or research data.
export function GET() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "64px 76px", background: "#ffffff", color: "#202020", fontFamily: "sans-serif" }}>
    <div style={{ fontSize: 32, marginBottom: 58 }}>Mouthfolio.</div>
    <div style={{ display: "flex", flexDirection: "column", fontSize: 58, lineHeight: 1.18, letterSpacing: -2 }}><span>{headline}</span><span style={{ fontSize: 38, letterSpacing: -0.6, marginTop: 24, color: "#315e5a" }}>{definition}</span></div>
    <div style={{ display: "flex", justifyContent: "flex-start", fontSize: 22, color: "#656565", marginTop: 54 }}><span>Powered by ASOF Data</span></div>
  </div>, { width: 1200, height: 630 });
}

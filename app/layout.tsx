import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mouthfolio · Synthetic research demo",
  description: "A fictional company and voice research example powered by the Mouthfolio consumer contract.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

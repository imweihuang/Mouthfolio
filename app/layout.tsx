import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mouthfolio · Company and voice research",
  description: "Company evidence, attributed views and dated source receipts.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

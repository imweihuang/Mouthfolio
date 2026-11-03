import { siteMetadata } from "../lib/site-metadata";
import "./globals.css";

export const metadata = siteMetadata(process.env.MOUTHFOLIO_PUBLIC_ORIGIN, process.env.MOUTHFOLIO_BASE_PATH);
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

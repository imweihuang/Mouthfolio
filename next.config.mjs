/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  experimental: { cpus: 2 },
  async headers() { return [{ source: "/:path*", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ] }]; },
};
export default config;

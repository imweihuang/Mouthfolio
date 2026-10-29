/** @type {import('next').NextConfig} */
const basePath = process.env.MOUTHFOLIO_BASE_PATH ?? "";
if (!["", "/mouthfolio"].includes(basePath)) throw new Error("Unsupported Mouthfolio base path");
const config = {
  basePath,
  env: { MOUTHFOLIO_BASE_PATH: basePath },
  poweredByHeader: false,
  output: "standalone",
  experimental: { cpus: 2 },
  async headers() { return [{ source: "/:path*", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ] }]; },
};
export default config;

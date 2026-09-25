import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Pages and API routes read the generated data at request time.
  outputFileTracingIncludes: {
    "/**": ["./data/build/**/*"],
  },
  async redirects() {
    return [
      { source: "/:locale(en|ar|ckb)/index", destination: "/:locale", permanent: true },
      // Old static data URLs now served by the API.
      { source: "/data/scholars/:id(\\d+).json", destination: "/api/v1/narrators/:id", permanent: true },
      // Browsers ask for /favicon.ico whatever the page declares.
      { source: "/favicon.ico", destination: "/icon.png", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/geo/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * MarketStream is a non-default Multi-Zone app.
   *
   * A unique asset prefix prevents its Next.js
   * JavaScript and CSS bundles from conflicting
   * with the Portfolio application's /_next assets.
   */
  assetPrefix: "/market-stream-static",

  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

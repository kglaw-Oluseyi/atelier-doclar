import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@maison-doclar/programme-tower",
    "@maison-doclar/programme-domain",
    "@maison-doclar/programme-ingestion",
  ],
  serverExternalPackages: ["yaml", "pg"],
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return webpackConfig;
  },
};

export default config;

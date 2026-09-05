import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@maison-doclar/shared-platform", "@maison-doclar/design-system"],
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return webpackConfig;
  },
};

export default config;

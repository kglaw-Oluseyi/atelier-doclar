import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return webpackConfig;
  },
  serverExternalPackages: ["pg", "@aws-sdk/client-s3"],
  transpilePackages: ["@maison-doclar/academy", "@maison-doclar/shared-platform", "@maison-doclar/design-system"],
  experimental: {
    serverActions: {
      bodySizeLimit: "21mb",
    },
  },
  async rewrites() {
    return [{ source: "/api/_diag/:path*", destination: "/api/s073-diag/:path*" }];
  },
};

export default config;

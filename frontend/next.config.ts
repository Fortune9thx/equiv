import type { NextConfig } from "next";
import webpack from "webpack";

// Wagmi/RainbowKit drag in a few optional native/RN modules Next.js's
// webpack can't resolve and doesn't need in a browser build. See
// rainbowkit-wagmi-nextjs-gotchas notes: all three are harmless to ignore.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-async-storage\/async-storage$/,
      }),
      new webpack.IgnorePlugin({ resourceRegExp: /^pino-pretty$/ })
    );
    return config;
  },
};

export default nextConfig;

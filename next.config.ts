import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    WS_NO_BUFFER_UTIL: "true",
  },
  serverExternalPackages: ["node-edge-tts", "ws"],
};

export default nextConfig;

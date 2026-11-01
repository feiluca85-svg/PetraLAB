import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-edge-tts", "ws", "bufferutil", "utf-8-validate"],
};

export default nextConfig;

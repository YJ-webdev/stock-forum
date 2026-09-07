import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google Profile Pictures
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // GitHub Profile Pictures
      },
    ],
  },
};

export default nextConfig;

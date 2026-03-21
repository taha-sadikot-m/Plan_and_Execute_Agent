import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js to keep these Node packages as external (not bundled),
  // so they can use fs/path to load their embedded assets at runtime.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;

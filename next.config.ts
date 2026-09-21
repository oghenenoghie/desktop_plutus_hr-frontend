import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The desktop build (see electron/) runs this as a standalone Node
  // server bundled into the app rather than deploying to Vercel/Railway.
  output: process.env.DESKTOP_BUILD === "1" ? "standalone" : undefined,
};

export default nextConfig;

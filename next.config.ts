import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: { globalNotFound: true },
  async redirects() {
    return [
      { source: "/login", destination: "/login.php", permanent: true },
      { source: "/signup", destination: "/rgstr.php", permanent: true },
    ];
  },
  async rewrites() {
    return [{ source: "/login.php", destination: "/manage" }];
  },
  allowedDevOrigins: [
    "localhost:3000",
    "http://localhost:3000",
    "192.168.1.198:3000",
    "http://192.168.1.198:3000",
    "192.168.1.198",
    "http://192.168.1.198",
  ],
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
      ],
    }];
  },
};

export default nextConfig;

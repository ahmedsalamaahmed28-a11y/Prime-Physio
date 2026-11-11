import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: { globalNotFound: true },
  async redirects() {
    return [
      { source: "/login.php", destination: "/login", permanent: true },
      // Legacy /manage links must never open a separate or obsolete management route.
      { source: "/manage", destination: "/login.php", permanent: false },
      { source: "/manage/:path*", destination: "/login.php", permanent: false },
      { source: "/signup", destination: "/rgstr.php", permanent: true },
    ];
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

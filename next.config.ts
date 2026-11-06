import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  experimental: {
    globalNotFound: true,
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/manage",
        permanent: true,
      },
    ];
  },
  // Allow network origins for HMR web sockets in local development.
  allowedDevOrigins: [
    "localhost:3000",
    "http://localhost:3000",
    "192.168.1.198:3000",
    "http://192.168.1.198:3000",
    "192.168.1.198",
    "http://192.168.1.198",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // Keep HTTPS external resources working while disallowing insecure HTTP,
            // eval-based script execution, plugins, and untrusted base/form targets.
            // A nonce-based script policy is a separate follow-up because it requires
            // auditing all inline scripts and Next.js rendering paths first.
            value: [
              "default-src 'self' https: data: blob:",
              "script-src 'self' 'unsafe-inline' https:",
              "connect-src 'self' https: wss:",
              "img-src 'self' data: blob: https:",
              "style-src 'self' 'unsafe-inline' https:",
              "font-src 'self' data: https:",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'self'",
              "form-action 'self' https:",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;

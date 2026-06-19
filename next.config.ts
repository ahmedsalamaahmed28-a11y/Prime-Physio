import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  typescript: { ignoreBuildErrors: true },
  // Disable globalNotFound experimental feature to fix Service Worker registration
  // experimental: {
  //   globalNotFound: true,
  // },
  // Allow network origins for HMR web sockets
  allowedDevOrigins: [
    "localhost:3000",
    "http://localhost:3000",
    "192.168.1.198:3000",
    "http://192.168.1.198:3000",
    "192.168.1.198",
    "http://192.168.1.198"
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self' https: http: ws: wss: data: blob: 'unsafe-inline'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https: http:; connect-src 'self' https: http: ws: wss:; img-src 'self' data: blob: https: http:; style-src 'self' 'unsafe-inline' https: http:; font-src 'self' data: https: http:;"
          }
        ]
      }
    ];
  }
};

export default nextConfig;

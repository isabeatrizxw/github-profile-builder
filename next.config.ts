import type { NextConfig } from "next";

// Defense in depth for the README preview, which shows HTML rendered by GitHub.
// No script-src here: Next.js needs inline scripts unless nonces are set up.
const CONTENT_SECURITY_POLICY = [
  "img-src 'self' data: blob: https://avatars.githubusercontent.com https://camo.githubusercontent.com https://cdn.jsdelivr.net https://cdn.simpleicons.org https://api.iconify.design",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
  turbopack: {
    resolveAlias: {
      // Points next-intl to our request config. This is what the
      // `next-intl/plugin` wrapper does; it is set here directly because the
      // plugin loads a native @swc/core binary that fails on some Windows setups.
      // Only Turbopack is configured (default for dev and build in Next 16);
      // `next build --webpack` would need the same alias under `webpack`.
      "next-intl/config": "./i18n/request.ts",
    },
  },
};

export default nextConfig;

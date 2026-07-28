/** @type {import('next').NextConfig} */

// Content Security Policy compatible with CodeMirror (needs inline styles) and
// Web Workers (worker-src blob:). No document contents ever leave the browser,
// so connect-src is intentionally restricted to 'self'.
const isDev = process.env.NODE_ENV !== 'production';

const cspDirectives = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; 'unsafe-inline' is required for
  // the framework. In dev, 'unsafe-eval' is needed for React Refresh.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // CodeMirror applies inline styles for editor decorations.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Only same-origin network calls (health check, future billing). Never used
  // to transmit document contents.
  "connect-src 'self'",
  // Web Workers are loaded from blob URLs bundled by Next.js.
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspDirectives },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

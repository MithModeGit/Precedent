import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // mammoth and pdf-parse are CommonJS server-only libraries that must not be
  // bundled by the Next.js compiler. Keep them external to the server build.
  serverExternalPackages: ['pdf-parse', 'mammoth'],
}

export default nextConfig

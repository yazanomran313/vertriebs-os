import type { NextConfig } from 'next'
// @ts-expect-error no types for next-pwa
import withPWA from 'next-pwa'

const pwaConfig = withPWA({
  dest: 'public',
  register: false,
  skipWaiting: false,
  sw: 'sw.js',
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  ...pwaConfig,
}

export default nextConfig

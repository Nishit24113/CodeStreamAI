import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export', // Enable static export for S3/CloudFront
  images: {
    unoptimized: true, // Required for static export
  },
  transpilePackages: ['@codestream/ui', '@codestream/types'],
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }
    return config
  },
}

export default nextConfig

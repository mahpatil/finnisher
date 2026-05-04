import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@db': path.resolve(__dirname, '../db'),
    }
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.js'],
    }
    return config
  },
}

export default nextConfig

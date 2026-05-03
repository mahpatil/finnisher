import type { NextConfig } from 'next'
import path from 'path'

const config: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  webpack(webpackConfig) {
    webpackConfig.resolve ??= {}
    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias as Record<string, string>),
      '@db': path.resolve(process.cwd(), 'src/db'),
    }
    webpackConfig.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    }
    return webpackConfig
  },
}

export default config

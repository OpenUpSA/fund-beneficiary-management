// @ts-check

const withNextIntl = require('next-intl/plugin')()

// Get the custom URL path for LDA pages (defaults to 'ldas')
const ldaUrlPath = process.env.NEXT_PUBLIC_LDA_URL_PATH || 'ldas'

/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  experimental: {
    // Prevent webpack from trying to bundle Node.js-only OpenTelemetry packages
    // imported transitively through @sentry/nextjs → @sentry/node.
    serverComponentsExternalPackages: ['require-in-the-middle', '@opentelemetry/instrumentation'],
  },
  webpack(webpackConfig) {
    // Suppress "Critical dependency: require function is used in a way in which
    // dependencies cannot be statically extracted" warnings from OpenTelemetry /
    // require-in-the-middle. These are benign — the packages intentionally use
    // dynamic require() for monkey-patching and work correctly at runtime.
    webpackConfig.ignoreWarnings = [
      ...(webpackConfig.ignoreWarnings || []),
      { module: /require-in-the-middle/ },
      { module: /@opentelemetry\/instrumentation/ },
    ]
    return webpackConfig
  },
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV !== 'production',
    },
  },
  async rewrites() {
    // Only add rewrites if the URL path is different from the default
    if (ldaUrlPath === 'ldas') {
      return []
    }
    
    return [
      // Rewrite custom path to internal ldas routes
      {
        source: `/dashboard/${ldaUrlPath}`,
        destination: '/dashboard/ldas',
      },
      {
        source: `/dashboard/${ldaUrlPath}/:path*`,
        destination: '/dashboard/ldas/:path*',
      },
      // Also handle locale prefix
      {
        source: `/:locale/dashboard/${ldaUrlPath}`,
        destination: '/:locale/dashboard/ldas',
      },
      {
        source: `/:locale/dashboard/${ldaUrlPath}/:path*`,
        destination: '/:locale/dashboard/ldas/:path*',
      },
    ]
  },
}

const nextConfig = withNextIntl(config)

// Only wrap with Sentry when an auth token is present.
// Without a token the Sentry webpack plugin still registers hooks that can
// contact Sentry's API during compilation and cause the build to hang on
// Dokku (where SENTRY_AUTH_TOKEN is not set).
if (process.env.SENTRY_AUTH_TOKEN) {
  const { withSentryConfig } = require("@sentry/nextjs");
  module.exports = withSentryConfig(nextConfig, {
    org: "openupsa",
    project: "fbmscat",
    silent: !process.env.CI,
    sourcemaps: { disable: false },
    widenClientFileUpload: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  });
} else {
  module.exports = nextConfig
}

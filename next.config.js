// @ts-check

const withNextIntl = require('next-intl/plugin')()

// Get the custom URL path for LDA pages (defaults to 'ldas')
const ldaUrlPath = process.env.NEXT_PUBLIC_LDA_URL_PATH || 'ldas'

/** @type {import('next').NextConfig} */
const config = {
  logging: {
    fetches: {
      fullUrl: true,
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

module.exports = withNextIntl(config)


// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "openupsa",
    project: "fbmscat",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);

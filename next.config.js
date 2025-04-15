// @ts-check

const withNextIntl = require('next-intl/plugin')()

/** @type {import('next').NextConfig} */
const config = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

module.exports = withNextIntl(config)

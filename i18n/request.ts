import {getRequestConfig} from 'next-intl/server'
import type {AbstractIntlMessages} from 'next-intl'
import {routing} from './routing'

type Messages = Record<string, unknown>

// Deployment-specific translations: when APP_FLAVOR is set (e.g. "soar",
// "ddi-gms"), messages/overrides/{flavor}/{locale}.json is deep-merged over
// the base messages. Override files contain ONLY the keys that differ for
// that deployment. APP_FLAVOR is a runtime env var (read server-side per
// request), so switching it needs a restart, not a rebuild.
async function loadOverrides(locale: string): Promise<Messages> {
  const flavor = process.env.APP_FLAVOR
  if (!flavor) return {}
  try {
    return (await import(`@/messages/overrides/${flavor}/${locale}.json`)).default
  } catch {
    // No override file for this flavor/locale — base messages apply
    return {}
  }
}

function isPlainObject(value: unknown): value is Messages {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge(base: Messages, override: Messages): Messages {
  const result: Messages = {...base}
  for (const [key, value] of Object.entries(override)) {
    result[key] = isPlainObject(value) && isPlainObject(result[key])
      ? deepMerge(result[key] as Messages, value)
      : value
  }
  return result
}

export default getRequestConfig(async ({requestLocale}) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale

  // Ensure that the incoming `locale` is valid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  const base = (
    await (locale === 'en'
      ? // When using Turbopack, this will enable HMR for `en`
        import('@/messages/en.json')
      : import(`@/messages/${locale}.json`))
  ).default

  return {
    locale,
    messages: deepMerge(base, await loadOverrides(locale)) as AbstractIntlMessages
  }
})

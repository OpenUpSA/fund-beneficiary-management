/**
 * Utility functions for building referrer-based navigation links
 */

export type EntityType = 'lda' | 'fund' | 'funder'

interface ReferrerInfo {
  type: EntityType
  id: string | number
  name: string
}

/**
 * Build a URL with referrer information for breadcrumb navigation
 * 
 * @example
 * // When navigating from LDA to Fund:
 * buildReferrerUrl('/dashboard/funds/123', {
 *   type: 'lda',
 *   id: '456',
 *   name: 'Otsile Bokamosho'
 * })
 * // Returns: '/dashboard/funds/123?from=lda&from_id=456&from_name=Otsile%20Bokamosho'
 */
export function buildReferrerUrl(
  targetUrl: string,
  referrer: ReferrerInfo
): string {
  const params = new URLSearchParams({
    from: referrer.type,
    from_id: String(referrer.id),
    from_name: encodeURIComponent(referrer.name)
  })
  
  return `${targetUrl}?${params.toString()}`
}

/**
 * Parse referrer information from URL search params
 */
export function parseReferrer(searchParams: URLSearchParams): ReferrerInfo | null {
  const type = searchParams.get('from') as EntityType | null
  const id = searchParams.get('from_id')
  const name = searchParams.get('from_name')
  
  if (!type || !id || !name) {
    return null
  }
  
  return {
    type,
    id,
    name: decodeURIComponent(name)
  }
}

/**
 * Preserve referrer parameters when navigating between tabs
 */
export function preserveReferrer(
  baseUrl: string,
  searchParams: URLSearchParams
): string {
  const referrer = parseReferrer(searchParams)
  
  if (!referrer) {
    return baseUrl
  }
  
  return buildReferrerUrl(baseUrl, referrer)
}

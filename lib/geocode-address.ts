// Turning an LDA's physical address into map candidates via Nominatim.
//
// Sending the whole address as one free-text query rarely matches: OSM doesn't
// know complex names/numbers, and our district names ("Fezile Dabi") differ from
// OSM's ("Fezile Dabi District Municipality"). So we use structured queries with
// only the parts OSM knows, from most to least precise, and stop at the first
// tier that finds something inside the selected province.

export interface AddressParts {
  street?: string | null
  city?: string | null
  district?: string | null
  province?: string | null
}

export type MatchPrecision = "street" | "city" | "district"

export interface AddressQuery {
  /** Structured Nominatim params (street/city/county/state) */
  params: Record<string, string>
  /** Human-readable form of the query, shown while searching */
  label: string
  precision: MatchPrecision
}

export interface GeocodeResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: { state?: string; [key: string]: string | undefined }
}

const clean = (value?: string | null) => (value ?? "").trim()

/** Ordered, de-duplicated structured queries for an address (most precise first). */
export function buildAddressQueries(parts: AddressParts): AddressQuery[] {
  const street = clean(parts.street)
  const city = clean(parts.city)
  const district = clean(parts.district)
  const province = clean(parts.province)

  const candidates: Array<AddressQuery | null> = [
    street && city ? query({ street, city, state: province }, "street") : null,
    street ? query({ street, state: province }, "street") : null,
    city ? query({ city, state: province }, "city") : null,
    district ? query({ county: district, state: province }, "district") : null,
  ]

  const seen = new Set<string>()
  return candidates.filter((q): q is AddressQuery => {
    if (!q) return false
    const key = JSON.stringify(q.params)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function query(params: Record<string, string>, precision: MatchPrecision): AddressQuery {
  const filled = Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  return { params: filled, label: Object.values(filled).join(", "), precision }
}

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "")

/** Keep only results inside the selected province (all results when none is selected). */
export function filterToProvince(results: GeocodeResult[], province?: string | null): GeocodeResult[] {
  const wanted = normalise(clean(province))
  if (!wanted) return results
  return results.filter((r) => {
    const state = r.address?.state
    return !!state && normalise(state) === wanted
  })
}

export const PRECISION_NOTES: Record<MatchPrecision, string | null> = {
  street: null,
  city: "No match for the street — showing the town or city. Pick the closest result, then click the map to fine-tune the pin.",
  district: "No match for the street or city — showing the district. Pick it, then click the map to place the pin precisely.",
}

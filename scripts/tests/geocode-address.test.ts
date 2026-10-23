// Run with: node -r tsx/cjs scripts/tests/geocode-address.test.ts
import assert from "node:assert/strict"
import { buildAddressQueries, filterToProvince, type GeocodeResult } from "../../lib/geocode-address"

const full = { street: "12 Fichardt Street", city: "Sasolburg", district: "Fezile Dabi", province: "Free State" }

// Most to least precise; complex name/number never take part
assert.deepEqual(buildAddressQueries(full).map(q => [q.precision, q.params]), [
  ["street", { street: "12 Fichardt Street", city: "Sasolburg", state: "Free State" }],
  ["street", { street: "12 Fichardt Street", state: "Free State" }],
  ["city", { city: "Sasolburg", state: "Free State" }],
  ["district", { county: "Fezile Dabi", state: "Free State" }],
])
assert.equal(buildAddressQueries(full)[0].label, "12 Fichardt Street, Sasolburg, Free State")

// Missing parts skip their tiers; blank strings count as missing
assert.deepEqual(
  buildAddressQueries({ street: "  ", city: "Sasolburg", province: "Free State" }).map(q => q.params),
  [{ city: "Sasolburg", state: "Free State" }],
)
assert.deepEqual(
  buildAddressQueries({ street: "Main Road", city: "Sasolburg" }).map(q => q.params),
  [{ street: "Main Road", city: "Sasolburg" }, { street: "Main Road" }, { city: "Sasolburg" }],
  "Without a province the state is simply left out",
)
assert.deepEqual(buildAddressQueries({}), [], "Nothing to search without an address")
assert.deepEqual(buildAddressQueries({ province: "Free State" }), [], "A province alone is too broad to locate")

// Results are kept only inside the selected province
const result = (id: number, state?: string): GeocodeResult => ({
  place_id: id, display_name: `Place ${id}`, lat: "0", lon: "0", address: state ? { state } : {},
})
const results = [result(1, "Free State"), result(2, "Gauteng"), result(3), result(4, "free state")]
assert.deepEqual(filterToProvince(results, "Free State").map(r => r.place_id), [1, 4])
assert.deepEqual(filterToProvince([result(5, "KwaZulu-Natal")], "Kwazulu Natal").map(r => r.place_id), [5])
assert.deepEqual(filterToProvince(results, "").map(r => r.place_id), [1, 2, 3, 4], "No province, no filtering")
assert.deepEqual(filterToProvince(results, undefined).length, 4)

console.log("geocode-address: query tiers, missing parts and province filtering passed")

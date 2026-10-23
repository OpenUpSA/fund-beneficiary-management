"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
// Import fullscreen control
import "leaflet.fullscreen/Control.FullScreen.css";
import "leaflet.fullscreen/Control.FullScreen.js";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import { LocateFixed, LoaderCircle, MapPin, MapPinX, MapPinned, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../manage-lda/form-schema";
import {
  type AddressParts,
  type GeocodeResult,
  type MatchPrecision,
  PRECISION_NOTES,
  buildAddressQueries,
  filterToProvince,
} from "@/lib/geocode-address";

const southAfricaCenter: [number, number] = [-30.5595, 22.9375];
const worldCenter: [number, number] = [5, 20];

// NEXT_PUBLIC_MAP_COUNTRY_CODES scopes geocoding per deployment:
//   unset/""  -> legacy behaviour: South Africa map view, unrestricted search
//   "za"      -> SA view, search restricted to South Africa
//   "za,na"   -> comma list of ISO codes, search restricted to those countries
//   "*"       -> world view, unrestricted search (multi-country deployments)
const rawCountryCodes = (process.env.NEXT_PUBLIC_MAP_COUNTRY_CODES || "").trim().toLowerCase();
const searchCountryCodes = rawCountryCodes && rawCountryCodes !== "*" ? rawCountryCodes : "";
const isSouthAfricaView = !rawCountryCodes || rawCountryCodes.split(",").includes("za");
const initialCenter = isSouthAfricaView ? southAfricaCenter : worldCenter;
const initialZoom = isSouthAfricaView ? 5 : 2;

// Restate the default icon geometry: without iconAnchor, Leaflet pins the
// image's top-left corner to the coordinate and the tip renders ~41px off.
const defaultIcon = L.icon({
  iconUrl: iconUrl.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
// Nominatim's usage policy allows at most one request per second
const NOMINATIM_REQUEST_GAP_MS = 1100;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function nominatimSearch(params: Record<string, string>): Promise<GeocodeResult[]> {
  const search = new URLSearchParams({ format: "jsonv2", limit: "5", addressdetails: "1", ...params });
  if (searchCountryCodes) search.set("countrycodes", searchCountryCodes);
  const res = await fetch(`${NOMINATIM_SEARCH_URL}?${search}`);
  if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function reverseGeocode(coords: [number, number]): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}`
    );
    const data = await res.json();
    return data?.display_name || null;
  } catch (err) {
    console.error("Reverse geocoding failed", err);
    return null;
  }
}

// Custom component to add fullscreen control
function FullscreenControl() {
  const map = useMap();

  useEffect(() => {
    // Check if fullscreen control already exists using a different approach
    const hasFullscreenControl = document.querySelector('.leaflet-control-zoom-fullscreen');

    if (!hasFullscreenControl) {
      // @ts-expect-error - fullscreen plugin extends Leaflet but TypeScript doesn't know about it
      L.control.fullscreen({
        position: 'topright',
        title: 'Show fullscreen',
        titleCancel: 'Exit fullscreen',
        forceSeparateButton: true,
      }).addTo(map);
    }
  }, [map]);

  return null;
}

function CurrentLocationMarker({ position, text }: { position: [number, number]; text: string }) {
  const map = useMap();

  useEffect(() => {
    // Don't zoom the user back out if they are already closer than street level
    map.setView(position, Math.max(map.getZoom(), 13));
  }, [map, position]);

  return (
    <Marker position={position}>
      <Popup>{text}</Popup>
    </Marker>
  );
}

function ClickHandler({
  handleLocationSelect
}: {
  handleLocationSelect: (pos: [number, number], addr: string) => void;
}) {
  useMapEvents({
    click: async (e) => {
      const coords: [number, number] = [e.latlng.lat, e.latlng.lng];
      const address = await reverseGeocode(coords);
      handleLocationSelect(coords, address || "Selected location");
    },
  });
  return null;
}

interface MapProps {
  form: UseFormReturn<FormValues>,
  /** Physical-address fields; enables "Locate address on map". */
  addressParts?: AddressParts,
}

export default function Map({ form, addressParts }: MapProps) {

  const [position, setPosition] = useState<[number, number] | null>(() => {
    const lat = form.getValues('latitude');
    const lon = form.getValues('longitude');
    // 0,0 is treated as "no location" — it was the old accidental default
    if (typeof lat === 'number' && typeof lon === 'number' && (lat !== 0 || lon !== 0)) {
      return [lat, lon];
    }
    return null;
  });
  const [markerText, setMarkerText] = useState<string | null>(() => form.getValues('mapAddress') || null);
  // The location as it was when the dialog opened, so an accidental pin move
  // can be undone without knowing the original coordinates.
  const savedLocationRef = useRef<{ position: [number, number] | null; address: string | null } | null>(null);
  if (savedLocationRef.current === null) {
    savedLocationRef.current = { position, address: markerText };
  }
  const [search, setSearch] = useState<string>("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchPrecision, setMatchPrecision] = useState<MatchPrecision | null>(null);
  // Bumped by every new search so a slower, older search can't overwrite its results
  const searchIdRef = useRef(0);

  const addressQueries = useMemo(() => buildAddressQueries(addressParts ?? {}), [addressParts]);

  const handleLocationSelect = useCallback((coords: [number, number], address: string) => {
    setPosition(coords);
    setMarkerText(address);
    form.setValue('latitude', coords[0]);
    form.setValue('longitude', coords[1]);
    form.setValue('mapAddress', address);
  }, [form]);

  const resetToSavedLocation = useCallback(() => {
    const saved = savedLocationRef.current;
    if (!saved) return;
    setPosition(saved.position);
    setMarkerText(saved.address);
    form.setValue('latitude', saved.position?.[0] ?? null);
    form.setValue('longitude', saved.position?.[1] ?? null);
    form.setValue('mapAddress', saved.address ?? '');
  }, [form]);

  const clearLocation = useCallback(() => {
    setPosition(null);
    setMarkerText(null);
    form.setValue('latitude', null);
    form.setValue('longitude', null);
    form.setValue('mapAddress', '');
  }, [form]);

  const dismissResults = useCallback(() => {
    setResults([]);
    setHasSearched(false);
    setMatchPrecision(null);
  }, []);

  const selectResult = useCallback((result: GeocodeResult) => {
    handleLocationSelect([parseFloat(result.lat), parseFloat(result.lon)], result.display_name);
    dismissResults();
  }, [handleLocationSelect, dismissResults]);

  // Free-text search for what the user types in the search box
  const runSearch = useCallback(async (query: string) => {
    const q = query.trim();
    const searchId = ++searchIdRef.current;
    setLocating(false);
    if (q.length < 3) {
      dismissResults();
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchStatus(`Searching for “${q}”…`);
    setMatchPrecision(null);
    try {
      const found = await nominatimSearch({ q });
      if (searchId !== searchIdRef.current) return;
      setResults(found);
      setHasSearched(true);
    } catch (err) {
      if (searchId !== searchIdRef.current) return;
      console.error("Geocoding failed", err);
      setResults([]);
      toast.error("Address search failed — please try again");
    } finally {
      if (searchId === searchIdRef.current) {
        setSearching(false);
        setSearchStatus(null);
      }
    }
  }, [dismissResults]);

  // Debounced search on the query the user is CURRENTLY typing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearch(query);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => runSearch(query), 500);
  }, [runSearch]);

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  }, []);

  // Try the address from most to least precise and list the first tier that
  // finds places in the selected province. Nothing is pinned until the user picks.
  const locateTypedAddress = useCallback(async () => {
    if (addressQueries.length === 0) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const searchId = ++searchIdRef.current;
    setSearching(true);
    setLocating(true);
    setResults([]);
    setHasSearched(false);
    setMatchPrecision(null);
    try {
      for (const [index, query] of addressQueries.entries()) {
        if (index > 0) await wait(NOMINATIM_REQUEST_GAP_MS);
        if (searchId !== searchIdRef.current) return;
        setSearch(query.label);
        setSearchStatus(`Searching for “${query.label}”…`);
        const found = filterToProvince(await nominatimSearch(query.params), addressParts?.province);
        if (searchId !== searchIdRef.current) return;
        if (found.length > 0) {
          setResults(found);
          setMatchPrecision(query.precision);
          setHasSearched(true);
          return;
        }
      }
      setResults([]);
      setHasSearched(true);
    } catch (err) {
      if (searchId !== searchIdRef.current) return;
      console.error("Geocoding failed", err);
      toast.error("Address search failed — please try again");
    } finally {
      if (searchId === searchIdRef.current) {
        setSearching(false);
        setLocating(false);
        setSearchStatus(null);
      }
    }
  }, [addressQueries, addressParts?.province]);

  const autoLocate = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support geolocation");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (geo) => {
        const coords: [number, number] = [geo.coords.latitude, geo.coords.longitude];
        const address = await reverseGeocode(coords);
        handleLocationSelect(coords, address || "Current location");
      },
      () => {
        toast.error("Could not get your location — check browser location permissions");
      }
    );
  }, [handleLocationSelect]);

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={locateTypedAddress}
          type="button"
          disabled={addressQueries.length === 0 || locating}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={addressQueries.length > 0 ? "Find the physical address entered above" : "Fill in the physical address first"}
        >
          {locating
            ? <LoaderCircle className="h-4 w-4 animate-spin" />
            : <MapPinned className="h-4 w-4" />}
          {locating ? "Locating…" : "Locate address on map"}
        </button>
        <button
          onClick={autoLocate}
          type="button"
          className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
          title="Use this device's current location"
        >
          <LocateFixed className="h-4 w-4" />
          Auto locate
        </button>
        {savedLocationRef.current?.position && (
          !position ||
          position[0] !== savedLocationRef.current.position[0] ||
          position[1] !== savedLocationRef.current.position[1]
        ) && (
          <button
            onClick={resetToSavedLocation}
            type="button"
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            title="Put the pin back where it was when you opened this dialog"
          >
            <RotateCcw className="h-4 w-4" />
            Revert to saved location
          </button>
        )}
        {position && (
          <button
            onClick={clearLocation}
            type="button"
            className="flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
            title="Remove the saved location"
          >
            <MapPinX className="h-4 w-4" />
            Clear location
          </button>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={search}
          placeholder="Search for an address..."
          onChange={handleSearchChange}
          className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-base"
        />
        {searching && (
          <LoaderCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
        )}
      </div>

      {searching && searchStatus && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
          {searchStatus}
        </div>
      )}

      {!searching && hasSearched && (
        results.length > 0 ? (
          <div className="rounded-lg border-2 border-slate-900/80 bg-white shadow-md">
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Select the correct location ({results.length} found)
                </p>
                {matchPrecision && PRECISION_NOTES[matchPrecision] && (
                  <p className="mt-0.5 text-xs text-amber-700">{PRECISION_NOTES[matchPrecision]}</p>
                )}
              </div>
              <button
                type="button"
                onClick={dismissResults}
                aria-label="Close results"
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
              {results.map((result) => {
                const [title, ...rest] = result.display_name.split(", ");
                return (
                  <li key={result.place_id}>
                    <button
                      type="button"
                      onClick={() => selectResult(result)}
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{title}</span>
                        {rest.length > 0 && (
                          <span className="block truncate text-xs text-slate-500">{rest.join(", ")}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-amber-700">No locations found — refine the search or click the map to place the marker manually.</p>
        )
      )}

      <p className="text-sm text-slate-500">
        Use <span className="font-bold">locate address on map</span> to find the address entered above,
        search for a place, click the map, or use <span className="font-bold">auto locate</span> for this device&apos;s position.
      </p>

      <div
        style={{
          height: "380px",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f0f0f0",
          borderRadius: "0.5rem",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          position: "relative",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        }}
      >
      <MapContainer
        center={position ?? initialCenter}
        zoom={position ? 13 : initialZoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution={"&copy; <a href='https://www.openstreetmap.org/'>OpenStreetMap</a> contributors"}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {position && <CurrentLocationMarker position={position} text={markerText || ""} />}
        <ClickHandler handleLocationSelect={handleLocationSelect}/>
        <ZoomControl position="bottomright" />
        <FullscreenControl />
      </MapContainer>
    </div>
    </div>
  );
}

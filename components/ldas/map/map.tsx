"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
// Import fullscreen control
import "leaflet.fullscreen/Control.FullScreen.css";
import "leaflet.fullscreen/Control.FullScreen.js";
import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import { LocateFixed, LoaderCircle, MapPinX, MapPinned } from "lucide-react";
import { toast } from "sonner";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../manage-lda/form-schema";

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

const defaultIcon = L.icon({
  iconUrl: iconUrl.src,
  shadowUrl: iconShadow.src,
});
L.Marker.prototype.options.icon = defaultIcon;

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
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
  /** Address composed from the physical-address fields; enables "Locate address on map". */
  findAddress?: string,
}

export default function Map({ form, findAddress }: MapProps) {

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
  const [search, setSearch] = useState<string>("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleLocationSelect = useCallback((coords: [number, number], address: string) => {
    setPosition(coords);
    setMarkerText(address);
    form.setValue('latitude', coords[0]);
    form.setValue('longitude', coords[1]);
    form.setValue('mapAddress', address);
  }, [form]);

  const clearLocation = useCallback(() => {
    setPosition(null);
    setMarkerText(null);
    form.setValue('latitude', null);
    form.setValue('longitude', null);
    form.setValue('mapAddress', '');
  }, [form]);

  const selectResult = useCallback((result: NominatimResult) => {
    handleLocationSelect([parseFloat(result.lat), parseFloat(result.lon)], result.display_name);
    setResults([]);
    setHasSearched(false);
  }, [handleLocationSelect]);

  // Geocode a query and show up to 5 candidates; optionally pin the first hit
  const runSearch = useCallback(async (query: string, autoSelectFirst = false) => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ format: "json", limit: "5", q });
      if (searchCountryCodes) params.set("countrycodes", searchCountryCodes);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      const data: NominatimResult[] = await res.json();
      const found = Array.isArray(data) ? data : [];
      setResults(found);
      if (autoSelectFirst && found[0]) {
        handleLocationSelect([parseFloat(found[0].lat), parseFloat(found[0].lon)], found[0].display_name);
      }
    } catch (err) {
      console.error("Geocoding failed", err);
      setResults([]);
      toast.error("Address search failed — please try again");
    } finally {
      setSearching(false);
    }
  }, [handleLocationSelect]);

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

  const locateTypedAddress = useCallback(() => {
    if (findAddress) runSearch(findAddress, true);
  }, [findAddress, runSearch]);

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
          disabled={!findAddress || searching}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={findAddress ? `Locate: ${findAddress}` : "Fill in the physical address first"}
        >
          <MapPinned className="h-4 w-4" />
          Locate address on map
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
          className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-base"
        />
        {searching && (
          <LoaderCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
        )}
      </div>

      {!searching && hasSearched && (
        results.length > 0 ? (
          <ul className="border border-slate-200 rounded-md divide-y divide-slate-100 bg-white shadow-sm">
            {results.map((result) => (
              <li key={result.place_id}>
                <button
                  type="button"
                  onClick={() => selectResult(result)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                >
                  {result.display_name}
                </button>
              </li>
            ))}
          </ul>
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

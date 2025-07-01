"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
// Import fullscreen control
import "leaflet.fullscreen/Control.FullScreen.css";
import "leaflet.fullscreen/Control.FullScreen.js";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from "react-leaflet";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../form-schema";

// South Africa coordinates
const southAfricaCenter: [number, number] = [-30.5595, 22.9375];
const defaultZoom = 5;
const defaultIcon = L.icon({
  iconUrl: iconUrl.src,
  shadowUrl: iconShadow.src,
});
L.Marker.prototype.options.icon = defaultIcon;

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
    map.setView(position, 13);
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

      // Reverse geocode
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}`
        );
        const data = await res.json();
        handleLocationSelect(coords, data?.display_name || "Unknown location");
      } catch (err) {
        console.error("Reverse geocoding failed", err);
        handleLocationSelect(coords, "Location selected");
      }
    },
  });
  return null;
}

interface MapProps {
  form: UseFormReturn<FormValues>,
}

export default function Map({ form }: MapProps) {

  const coordinates = useMemo(() => {
    if (form.getValues('latitude') && form.getValues('longitude')) {
      return [form.getValues('latitude'), form.getValues('longitude')];
    }
    return null;
  }, [form]);

  const mapAddress = useMemo(() => {
    if (form.getValues('mapAddress')) {
      return form.getValues('mapAddress');
    }
    return "";
  }, [form]);

  const [position, setPosition] = useState<[number, number] | null>(coordinates);
  const [markerText, setMarkerText] = useState<string>(mapAddress);
  const [search, setSearch] = useState<string>("");
  
  // Handle location selection and notify parent component if callback provided
  const handleLocationSelect = useCallback((coords: [number, number], address: string) => {
    setPosition(coords);
    setMarkerText(address);
    form.setValue('latitude', coords[0]);
    form.setValue('longitude', coords[1]);
    form.setValue('mapAddress', address);
  }, [form, setPosition, setMarkerText]);

  const autoLocate = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const coords: [number, number] = [latitude, longitude];
        // Notify parent component if callback provided
        handleLocationSelect(coords, "You are here");
      });
    }
  }, [handleLocationSelect]);

  const handleSearch = useCallback(async () => {
    if (!search) return;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}`
    );
    const data = await response.json();
    if (data && data[0]) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      const coords: [number, number] = [lat, lon];      
      // Notify parent component if callback provided
      handleLocationSelect(coords, data[0].display_name);
    }
  }, [search, handleLocationSelect]);

  // Debounce timer reference
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setSearch(query);
      handleSearch();
    }, 500); // 500ms delay
  }, [handleSearch]);

  // Handle search input change with debounce
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearch(query); // Update the input field immediately for better UX
    debouncedSearch(query); // Debounce the actual search API call
  }, [setSearch, debouncedSearch]);

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex gap-2">
        <button
          onClick={autoLocate}
          type="button" 
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors min-w-[140px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="1"/>
          </svg>
          Auto locate
        </button>
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            placeholder="Search for an address..."
            onChange={handleSearchChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-base"
          />
        </div>
      </div>
      
      <p className="text-sm text-slate-500">Click <span className="font-bold">auto locate</span> to use your current location, search for a location or click the map.</p>
      
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
        center={southAfricaCenter}
        zoom={defaultZoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution={"&copy; <a href='https://www.openstreetmap.org/'>OpenStreetMap</a> contributors"}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {position && <CurrentLocationMarker position={position} text={markerText} />}
        <ClickHandler handleLocationSelect={handleLocationSelect}/>
        <ZoomControl position="bottomright" />
        <FullscreenControl />
      </MapContainer>
    </div>
    </div>
  );
}
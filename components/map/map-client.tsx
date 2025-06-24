"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// South Africa coordinates
const southAfricaCenter: [number, number] = [-30.5595, 22.9375];
const defaultZoom = 6;

// MapClickHandler component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (!onLocationSelect) return;
    
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onLocationSelect({ lat, lng });
    };
    
    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onLocationSelect]);
  
  return null;
}

// Fix Leaflet marker icons globally
function fixLeafletIcons() {
  // Fix Leaflet default icon issues
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// Only run this once
if (typeof window !== 'undefined') {
  fixLeafletIcons();
}

export default function MapClient(props: any) {
  const {
    center = southAfricaCenter,
    zoom = defaultZoom,
    height = "400px",
    width = "100%",
    markerPosition = null,
    markerPopup,
    onLocationSelect
  } = props;

  // Ensure markerPosition is valid
  const validMarkerPosition = markerPosition && 
    typeof markerPosition.lat === 'number' && 
    typeof markerPosition.lng === 'number' && 
    !isNaN(markerPosition.lat) && 
    !isNaN(markerPosition.lng) && 
    markerPosition.lat !== 0 && 
    markerPosition.lng !== 0 ? 
    markerPosition : null;

  return (
    <div style={{ height, width }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validMarkerPosition && (
          <Marker position={[validMarkerPosition.lat, validMarkerPosition.lng]}>
            {markerPopup && <Popup>{markerPopup}</Popup>}
          </Marker>
        )}
        {onLocationSelect && <MapClickHandler onLocationSelect={onLocationSelect} />}
      </MapContainer>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons globally
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// South Africa coordinates
const southAfricaCenter = [-30.5595, 22.9375];
const defaultZoom = 6;

export default function LeafletMap({
  center = southAfricaCenter,
  zoom = defaultZoom,
  height = "400px",
  width = "100%",
  markerPosition = null,
  markerPopup = "Selected location",
  onLocationSelect = null
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    // Create map if it doesn't exist
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(center, zoom);
      
      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current);
      
      // Add click handler
      if (onLocationSelect) {
        mapInstanceRef.current.on('click', (e) => {
          const { lat, lng } = e.latlng;
          onLocationSelect({ lat, lng });
        });
      }
    } else {
      // Update view if center or zoom changes
      mapInstanceRef.current.setView(center, zoom);
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapRef.current]);

  // Handle marker updates
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Add new marker if position is valid
    if (markerPosition && 
        typeof markerPosition.lat === 'number' && 
        typeof markerPosition.lng === 'number' && 
        !isNaN(markerPosition.lat) && 
        !isNaN(markerPosition.lng) && 
        (markerPosition.lat !== 0 || markerPosition.lng !== 0)) {
      
      markerRef.current = L.marker([markerPosition.lat, markerPosition.lng])
        .addTo(mapInstanceRef.current);
      
      if (markerPopup) {
        markerRef.current.bindPopup(markerPopup).openPopup();
      }
    }
  }, [markerPosition, markerPopup, mapInstanceRef.current]);

  return (
    <div style={{ height, width }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: "100%", 
          width: "100%", 
          borderRadius: "0.5rem",
          background: "#f0f0f0" 
        }}
      />
    </div>
  );
}

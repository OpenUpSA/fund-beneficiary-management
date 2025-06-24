"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

// South Africa coordinates
const southAfricaCenter: [number, number] = [-30.5595, 22.9375];
const defaultZoom = 6;


export default function Map() {
  return (
      <MapContainer
        center={southAfricaCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={southAfricaCenter}>
          <Popup>South Africa</Popup>
        </Marker>
      </MapContainer>
  );
}
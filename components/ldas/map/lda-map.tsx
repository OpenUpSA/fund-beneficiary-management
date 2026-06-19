"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.fullscreen/Control.FullScreen.css";
import "leaflet.fullscreen/Control.FullScreen.js";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import { LocalDevelopmentAgencyListItem } from "@/types/models";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// South Africa coordinates
const southAfricaCenter: [number, number] = [-30.5595, 22.9375];
const defaultZoom = 5;

// Set up the default icon for markers
const defaultIcon = L.icon({
  iconUrl: iconUrl.src,
  shadowUrl: iconShadow.src,
});
L.Marker.prototype.options.icon = defaultIcon;

// Custom component to add fullscreen control
function FullscreenControl() {
  const map = useMap();
  
  useEffect(() => {
    // Check if fullscreen control already exists
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

// Component to fit map bounds to markers
function FitBoundsToMarkers({ markers }: { markers: Array<[number, number]> }) {
  const map = useMap();
  
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(coords => L.latLng(coords[0], coords[1])));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, markers]);
  
  return null;
}

const MINIMIZE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="10" y1="14" x2="3" y2="21"></line><line x1="21" y1="3" x2="14" y2="10"></line></svg>`

function MinimizeControl({ onMinimize }: { onMinimize: () => void }) {
  const map = useMap()
  const callbackRef = useRef(onMinimize)

  useEffect(() => { callbackRef.current = onMinimize }, [onMinimize])

  useEffect(() => {
    const MinCtrl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
        const link = L.DomUtil.create('a', '', container) as HTMLAnchorElement
        link.href = '#'
        link.title = 'Minimize map'
        link.setAttribute('role', 'button')
        link.style.cssText = 'display:flex;align-items:center;justify-content:center;width:26px;height:26px;'
        link.innerHTML = MINIMIZE_SVG
        L.DomEvent.on(link, 'click', (e) => {
          L.DomEvent.stopPropagation(e)
          L.DomEvent.preventDefault(e)
          callbackRef.current()
        })
        return container
      },
      onRemove() {},
    })
    const ctrl = new MinCtrl()
    ctrl.addTo(map)
    return () => { ctrl.remove() }
  }, [map])

  return null
}

interface LDAMapProps {
  ldas: LocalDevelopmentAgencyListItem[];
  width?: string | number;
  height?: string | number;
  onMinimize?: () => void;
}

export default function LDAMap({ ldas, width = "100%", height = "500px", onMinimize }: LDAMapProps) {
  // Filter LDAs with valid coordinates
  const validLDAs = ldas.filter(lda => 
    lda.organisationDetail?.latitude && 
    lda.organisationDetail?.longitude
  );
  
  // Extract marker coordinates for bounds fitting
  const markerCoordinates = validLDAs.map(lda => [
    Number(lda.organisationDetail?.latitude),
    Number(lda.organisationDetail?.longitude)
  ] as [number, number]);

  // Format address from LDA details
  const formatAddress = (lda: LocalDevelopmentAgencyListItem): string => {
    const details = lda.organisationDetail;
    if (!details) return "No address information";
    
    const addressParts = [];
    
    if (details.physicalComplexName) 
      addressParts.push(details.physicalComplexName);
    
    if (details.physicalComplexNumber) 
      addressParts.push(`No. ${details.physicalComplexNumber}`);
    
    if (details.physicalStreet) 
      addressParts.push(details.physicalStreet);
    
    if (details.physicalCity) 
      addressParts.push(details.physicalCity);
    
    if (details.physicalDistrict) 
      addressParts.push(details.physicalDistrict);
    
    if (details.physicalProvince) 
      addressParts.push(details.physicalProvince);
    
    if (details.physicalPostalCode) 
      addressParts.push(details.physicalPostalCode);
    
    return addressParts.join(", ");
  };

  return (
    <div 
      style={{ 
        height, 
        width, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "#f0f0f0",
        borderRadius: "0.5rem",
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        position: "relative",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        zIndex: 10
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
        
        {validLDAs.map((lda) => {
          const lat = Number(lda.organisationDetail?.latitude);
          const lng = Number(lda.organisationDetail?.longitude);
          
          return (
            <Marker 
              key={`lda-marker-${lda.id}`} 
              position={[lat, lng]}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold mb-1">{lda.name}</h3>
                  <p className="text-gray-600">{formatAddress(lda)}</p>
                  {lda.fundingStatus && (
                    <p className="mt-1">
                      <span className="font-medium">Status:</span> {lda.fundingStatus.label}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {markerCoordinates.length > 0 && <FitBoundsToMarkers markers={markerCoordinates} />}
        <ZoomControl position="bottomright" />
        <FullscreenControl />
        {onMinimize && <MinimizeControl onMinimize={onMinimize} />}
      </MapContainer>
    </div>
  );
}

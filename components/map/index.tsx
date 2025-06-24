import dynamic from "next/dynamic";

// Define the props interface
export interface MapProps {
  center?: [number, number];
  zoom?: number;
  height?: string | number;
  width?: string | number;
  markerPosition?: { lat: number; lng: number } | null;
  markerPopup?: string;
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void;
}

// Create a simple loading placeholder
const LoadingPlaceholder = () => (
  <div 
    style={{ 
      height: "400px", 
      width: "100%", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      backgroundColor: "#f0f0f0",
      borderRadius: "0.5rem"
    }}
  >
    Loading map...
  </div>
);

// Dynamically import the vanilla JS Leaflet map with no SSR
const Map = dynamic(
  () => import("./leaflet-map"),
  {
    ssr: false,
    loading: () => <LoadingPlaceholder />
  }
);

export default Map;
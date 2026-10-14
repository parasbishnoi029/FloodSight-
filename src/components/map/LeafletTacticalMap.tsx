import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GlobalDisasterLocation } from '../../data/globalDisasters';
import { HydrologyObservation, SatelliteCatalogProduct } from '../../types';
import { formatFreshness } from '../../services/dataFreshness';

export interface LeafletTacticalMapProps {
  selectedLocation: GlobalDisasterLocation;
  satelliteProduct?: SatelliteCatalogProduct | null;
  hydrology?: HydrologyObservation | null;
  basemapMode?: 'satellite' | 'roadmap' | 'terrain';
  className?: string;
}

const BASEMAP_TILES = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
    maxNativeZoom: 17
  },
  roadmap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17
  }
};

export const LeafletTacticalMap: React.FC<LeafletTacticalMapProps> = ({
  selectedLocation,
  satelliteProduct,
  hydrology,
  basemapMode = 'satellite',
  className = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [selectedLocation.lat, selectedLocation.lon],
        zoom: 8,
        zoomControl: false,
        attributionControl: true
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      layersGroupRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Basemap Tiles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = BASEMAP_TILES[basemapMode] || BASEMAP_TILES.satellite;
    const tileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [basemapMode]);

  // Update Location, STAC Footprint, and Hydrology Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Center map on target disaster
    map.setView([selectedLocation.lat, selectedLocation.lon], 8, { animate: true });

    // 1. Primary Disaster Epicenter Marker
    const epicenterMarker = L.circleMarker([selectedLocation.lat, selectedLocation.lon], {
      radius: 9,
      fillColor: '#06b6d4',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85
    });

    epicenterMarker.bindPopup(`
      <div style="font-family: monospace; font-size: 12px; color: #0f172a; padding: 4px;">
        <strong style="color: #0369a1;">${selectedLocation.name}</strong><br/>
        <span>Region: ${selectedLocation.region}, ${selectedLocation.country}</span><br/>
        <span>Event: ${selectedLocation.event}</span><br/>
        <span>Coords: ${selectedLocation.lat.toFixed(4)}°, ${selectedLocation.lon.toFixed(4)}°</span>
      </div>
    `);

    epicenterMarker.bindTooltip(`
      <div style="font-family: monospace; font-weight: bold; font-size: 11px; color: #ffffff; background-color: #0f172a; border: 1px solid #06b6d4; padding: 2px 6px; border-radius: 4px;">
        📍 ${selectedLocation.country}: ${selectedLocation.name}
      </div>
    `, {
      permanent: true,
      direction: 'top',
      offset: [0, -10]
    });

    group.addLayer(epicenterMarker);

    // 2. Copernicus Sentinel-2 STAC Footprint Polygon (Real observation boundary)
    if (satelliteProduct?.footprint_geometry?.coordinates?.[0]) {
      try {
        const ring = satelliteProduct.footprint_geometry.coordinates[0];
        const latLngs: [number, number][] = ring.map((pt: [number, number]) => [pt[1], pt[0]]);
        
        const footprintPolygon = L.polygon(latLngs, {
          color: '#38bdf8',
          weight: 2,
          opacity: 0.9,
          fillColor: '#0284c7',
          fillOpacity: 0.12,
          dashArray: '4, 4'
        });

        footprintPolygon.bindPopup(`
          <div style="font-family: monospace; font-size: 11px; color: #0f172a; padding: 4px;">
            <strong style="color: #0284c7;">Copernicus Sentinel-2 Acquisition Footprint</strong><br/>
            <span>Product: ${satelliteProduct.product_id || 'Sentinel-2 L2A'}</span><br/>
            <span>Platform: ${satelliteProduct.platform || 'Sentinel-2'}</span><br/>
            <span>Acquisition: ${satelliteProduct.acquisition_timestamp ? satelliteProduct.acquisition_timestamp.replace('T', ' ').slice(0, 19) + ' UTC' : 'N/A'}</span><br/>
            <span>Cloud Cover: ${satelliteProduct.cloud_cover_percent != null ? satelliteProduct.cloud_cover_percent + '%' : 'N/A'}</span>
          </div>
        `);
        group.addLayer(footprintPolygon);
      } catch {}
    }

    // 3. GloFAS Hydrological Station Marker
    if (hydrology && hydrology.current_river_discharge_m3s != null) {
      const hydroMarker = L.circleMarker([selectedLocation.lat + 0.02, selectedLocation.lon + 0.02], {
        radius: 7,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      });

      hydroMarker.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; color: #0f172a; padding: 4px;">
          <strong style="color: #2563eb;">ECMWF GloFAS River Gauging Point</strong><br/>
          <span>Discharge: <strong>${hydrology.current_river_discharge_m3s} m³/s</strong></span><br/>
          <span>Observation Time: ${hydrology.source_timestamp ? hydrology.source_timestamp.slice(0, 10) + ' UTC' : 'N/A'}</span><br/>
          <span>Freshness: ${formatFreshness(hydrology.retrieval_timestamp)}</span><br/>
          <span>Status: ${hydrology.status}</span>
        </div>
      `);
      group.addLayer(hydroMarker);
    }
  }, [selectedLocation, satelliteProduct, hydrology]);

  return (
    <div className={`relative w-full h-[620px] rounded-xl overflow-hidden border border-slate-800 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Top Cartography Notice */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 backdrop-blur-md shadow-lg text-xs font-mono text-slate-300 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>Open Cartography Mode (Keyless Leaflet Engine)</span>
      </div>
    </div>
  );
};

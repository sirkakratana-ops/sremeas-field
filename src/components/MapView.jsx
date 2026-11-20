import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Flame, MapPin, Layers, Info } from 'lucide-react';

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function MapView({ visits, onSelectVisit }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const heatLayerRef = useRef(null);

  // Map Mode: 'heat' (Heatmap only) | 'both' (Heatmap + Pins) | 'markers' (Pins only)
  const [mapMode, setMapMode] = useState('heat');
  const [heatMetric, setHeatMetric] = useState('count'); // 'count' (ដង់ស៊ីតេការចុះ) | 'size' (ទំហំដីហិកតា)

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centered on Cambodia
      const map = L.map(mapContainerRef.current).setView([12.2, 105.1], 8);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount if needed
    };
  }, []);

  // Update Layers when visits, mapMode, or heatMetric changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    const validVisits = visits.filter(v => v.latitude && v.longitude);
    if (validVisits.length === 0) return;

    const bounds = [];
    const heatPoints = [];

    // Calculate max size for normalization if metric is size
    const maxFarmSize = Math.max(...validVisits.map(v => parseFloat(v.farm_size_ha) || 1), 1);

    validVisits.forEach(v => {
      const lat = parseFloat(v.latitude);
      const lng = parseFloat(v.longitude);
      bounds.push([lat, lng]);

      // Calculate intensity (0.4 to 1.0)
      let intensity = 0.8;
      if (heatMetric === 'size' && v.farm_size_ha) {
        intensity = Math.min(1.0, 0.3 + (parseFloat(v.farm_size_ha) / maxFarmSize) * 0.7);
      }
      heatPoints.push([lat, lng, intensity]);

      // Create Marker Pin
      if (mapMode === 'markers' || mapMode === 'both') {
        const marker = L.marker([lat, lng], { icon: defaultIcon });

        const popupContent = `
          <div style="font-family: system-ui; font-size: 12px; line-height: 1.4; min-width: 160px;">
            <strong style="font-size: 13px; color: #047857; display: block; margin-bottom: 2px;">
              ${v.customers?.name || 'ម្ចាស់ចំការ'}
            </strong>
            <span style="color: #475569; font-size: 11px;">🌱 ដំណាំ: <b>${v.crop_type || '—'}</b> ${v.farm_size_ha ? `(${v.farm_size_ha} ហ.ត)` : ''}</span><br/>
            <span style="color: #475569;">👤 បុគ្គលិក: <b>${v.staff_name || '—'}</b></span><br/>
            <span style="color: #64748b; font-size: 10px;">📅 ${new Date(v.visit_date).toLocaleDateString('km-KH')}</span><br/>
            <div style="margin-top: 8px; display: flex; gap: 8px;">
              <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="color: #2563eb; font-weight: bold; font-size: 10px; text-decoration: underline;">
                Google Maps ↗
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersLayer.addLayer(marker);
      }
    });

    // Create Heatmap Layer
    if (mapMode === 'heat' || mapMode === 'both') {
      const heat = L.heatLayer(heatPoints, {
        radius: 30,
        blur: 20,
        maxZoom: 15,
        max: 1.0,
        minOpacity: 0.35,
        gradient: {
          0.2: '#0284c7', // Sky Blue
          0.4: '#10b981', // Emerald Green
          0.6: '#eab308', // Amber / Yellow
          0.8: '#f97316', // Orange
          1.0: '#dc2626'  // Red (High density)
        }
      });
      heat.addTo(map);
      heatLayerRef.current = heat;
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }

  }, [visits, mapMode, heatMetric]);

  const validCount = visits.filter(v => v.latitude && v.longitude).length;

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[460px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
      
      {/* TOP FLOATING CONTROLS */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Mode Toggle Buttons */}
        <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-1 pointer-events-auto">
          <button
            onClick={() => setMapMode('heat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mapMode === 'heat' 
                ? 'bg-rose-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Flame size={14} className={mapMode === 'heat' ? 'text-amber-200' : 'text-rose-500'} />
            <span>Heat Map 🔥</span>
          </button>

          <button
            onClick={() => setMapMode('both')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mapMode === 'both' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers size={14} />
            <span>Heat + Pins</span>
          </button>

          <button
            onClick={() => setMapMode('markers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mapMode === 'markers' 
                ? 'bg-slate-800 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MapPin size={14} className={mapMode === 'markers' ? 'text-emerald-300' : 'text-slate-500'} />
            <span>Pins 📍</span>
          </button>
        </div>

        {/* Metric Selector (Only shown for Heatmap) */}
        {(mapMode === 'heat' || mapMode === 'both') && (
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200 flex items-center gap-2 pointer-events-auto text-xs">
            <span className="font-bold text-slate-500 hidden sm:inline">កម្រិតកម្តៅតាម៖</span>
            <select
              value={heatMetric}
              onChange={e => setHeatMetric(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="count">ដង់ស៊ីតេចុះចំការ (Frequency)</option>
              <option value="size">ទំហំដី (Farm Hectares)</option>
            </select>
          </div>
        )}

      </div>

      {/* HEATMAP COLOR LEGEND */}
      {(mapMode === 'heat' || mapMode === 'both') && validCount > 0 && (
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-200 text-xs pointer-events-auto">
          <div className="font-bold text-slate-700 text-[11px] mb-1.5 flex items-center gap-1">
            <Flame size={12} className="text-rose-500" />
            <span>កម្រិតដង់ស៊ីតេចំការ (Heat Density)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold">ទាប</span>
            <div className="w-28 h-2.5 rounded-full shadow-inner" style={{
              background: 'linear-gradient(to right, #0284c7, #10b981, #eab308, #f97316, #dc2626)'
            }} />
            <span className="text-[10px] text-rose-600 font-bold">ខ្ពស់ (កុះករ)</span>
          </div>
        </div>
      )}

      {/* MAP CONTAINER */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      
      {/* EMPTY GPS ALERT */}
      {validCount === 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-xs px-4 py-2.5 rounded-xl shadow-lg border border-slate-200 text-xs text-slate-600 font-bold flex items-center gap-2">
          <Info size={16} className="text-amber-500 shrink-0" />
          <span>មិនទាន់មានទិន្នន័យ GPS សម្រាប់គូស Heat Map នៅឡើយទេ (សូមចុច "ចុះចំការថ្មី" ដើម្បីចាប់យក GPS)</span>
        </div>
      )}

    </div>
  );
}

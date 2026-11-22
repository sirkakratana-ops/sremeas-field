import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { HeatLayer } from 'leaflet.heat';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Flame, MapPin, Layers, AlertTriangle, Filter } from 'lucide-react';

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
  const heatLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  // View modes: 'heat' (Heatmap only), 'markers' (Markers only), 'both' (Heatmap + Markers)
  const [mapMode, setMapMode] = useState('heat');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'issues_only'

  // Filter visits having valid GPS coordinates
  const validVisits = visits.filter(v => v.latitude && v.longitude);
  const displayVisits = validVisits.filter(v => {
    if (filterType === 'issues_only') {
      return v.crop_status === 'មានបញ្ហា/ជំងឺ' || Boolean(v.issues_identified);
    }
    return true;
  });

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center roughly around Cambodia
      const map = L.map(mapContainerRef.current).setView([12.2, 105.1], 8);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, []);

  // 2. Update Heatmap & Markers on visits / mode / filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // A. Clean up old layers
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }

    const bounds = [];

    // B. Setup Heatmap data [lat, lng, intensity]
    if (mapMode === 'heat' || mapMode === 'both') {
      const heatPoints = displayVisits.map(v => {
        const lat = parseFloat(v.latitude);
        const lng = parseFloat(v.longitude);
        bounds.push([lat, lng]);

        // Intensity: higher intensity for visits with issues or larger farms
        let intensity = 0.8;
        if (v.crop_status === 'មានបញ្ហា/ជំងឺ') intensity = 1.0;
        else if (v.farm_size_ha && v.farm_size_ha > 3) intensity = 0.9;

        return [lat, lng, intensity];
      });

      if (heatPoints.length > 0) {
        const heat = new HeatLayer(heatPoints, {
          radius: 35,
          blur: 20,
          maxZoom: 16,
          max: 1.0,
          minOpacity: 0.25,
          gradient: {
            0.2: '#3b82f6', // Blue (Low)
            0.4: '#10b981', // Emerald
            0.6: '#eab308', // Yellow
            0.8: '#f97316', // Orange
            1.0: '#ef4444', // Red (High Heat)
          }
        });
        heat.addTo(map);
        heatLayerRef.current = heat;
      }
    }

    // C. Setup Markers Layer
    if (mapMode === 'markers' || mapMode === 'both') {
      displayVisits.forEach(v => {
        const lat = parseFloat(v.latitude);
        const lng = parseFloat(v.longitude);
        bounds.push([lat, lng]);

        const marker = L.marker([lat, lng], { icon: defaultIcon });

        const isProblem = v.crop_status === 'មានបញ្ហា/ជំងឺ';
        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.4; min-width: 170px;">
            <strong style="font-size: 13px; color: ${isProblem ? '#dc2626' : '#047857'}; display: block; margin-bottom: 2px;">
              ${v.customers?.name || 'ម្ចាស់ចំការ'}
            </strong>
            <span style="color: #475569; font-size: 11px;">ដំណាំ៖ <b>${v.crop_type || '—'}</b> ${v.farm_size_ha ? `(${v.farm_size_ha} ហ.ត)` : ''}</span><br/>
            <span style="color: #475569;">បុគ្គលិក៖ <b>${v.staff_name || '—'}</b></span><br/>
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; margin: 4px 0; background: ${isProblem ? '#fee2e2; color: #991b1b;' : '#d1fae5; color: #065f46;'}">
              ស្ថានភាព៖ ${v.crop_status || '—'}
            </span><br/>
            ${v.issues_identified ? `<div style="font-size: 10px; color: #b45309; background: #fffbeb; padding: 3px 6px; border-radius: 4px; margin-bottom: 4px;">${v.issues_identified}</div>` : ''}
            <span style="color: #94a3b8; font-size: 10px;">${new Date(v.visit_date).toLocaleDateString('km-KH')}</span>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersLayerRef.current.addLayer(marker);
      });
    }

    // Auto fit map bounds if we have points
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }

  }, [displayVisits, mapMode, filterType]);

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[460px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
      
      {/* Top Map Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Mode Switcher Buttons */}
        <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-1 pointer-events-auto">
          <button
            onClick={() => setMapMode('heat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mapMode === 'heat'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Flame size={14} className={mapMode === 'heat' ? 'text-amber-300' : 'text-rose-500'} />
            <span>Heat Map</span>
          </button>

          <button
            onClick={() => setMapMode('markers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mapMode === 'markers'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MapPin size={14} />
            <span>Pins</span>
          </button>

          <button
            onClick={() => setMapMode('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mapMode === 'both'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers size={14} />
            <span>ទាំងពីរ</span>
          </button>
        </div>

        {/* Filter Selection */}
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-2 pointer-events-auto">
          <Filter size={13} className="text-slate-400" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-transparent py-1 focus:outline-none cursor-pointer"
          >
            <option value="all">គ្រប់ចំការទាំងអស់ ({validVisits.length})</option>
            <option value="issues_only">ចំការមានជំងឺ/បញ្ហា ({validVisits.filter(v => v.crop_status === 'មានបញ្ហា/ជំងឺ' || v.issues_identified).length})</option>
          </select>
        </div>

      </div>

      {/* Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Heatmap Legend (Bottom Right) */}
      {(mapMode === 'heat' || mapMode === 'both') && displayVisits.length > 0 && (
        <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-slate-700 pointer-events-auto text-[11px] space-y-1">
          <div className="flex items-center gap-1 font-bold text-slate-800">
            <Flame size={12} className="text-rose-500" />
            <span>កម្រិតដង់ស៊ីតេចុះចំការ (Heatmap)</span>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-500 font-bold">ទាប</span>
            <div 
              className="w-24 h-2.5 rounded-full" 
              style={{ background: 'linear-gradient(to right, #3b82f6, #10b981, #eab308, #f97316, #ef4444)' }} 
            />
            <span className="text-[10px] text-rose-600 font-bold">កុះករ/ខ្ពស់</span>
          </div>
        </div>
      )}

      {/* Empty State Overlay */}
      {displayVisits.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl border border-slate-200 text-center space-y-1">
          <p className="font-bold text-sm text-slate-800 flex items-center justify-center gap-1">
            <MapPin size={16} className="text-slate-400" />
            <span>មិនទាន់មានទិន្នន័យ GPS នៅឡើយ</span>
          </p>
          <p className="text-xs text-slate-500">ពេលបុគ្គលិកចុះចំការ ចុចប៊ូតុង "ចាប់យក GPS" ទិន្នន័យ Heatmap នឹងបង្ហាញលើផែនទីនេះដោយស្វ័យប្រវត្តិ។</p>
        </div>
      )}

    </div>
  );
}

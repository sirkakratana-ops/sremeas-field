import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

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

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map centered on Cambodia (Kampong Cham / Center)
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([12.2, 105.1], 8);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    const validVisits = visits.filter(v => v.latitude && v.longitude);
    const bounds = [];

    validVisits.forEach(v => {
      const lat = parseFloat(v.latitude);
      const lng = parseFloat(v.longitude);
      bounds.push([lat, lng]);

      const marker = L.marker([lat, lng], { icon: defaultIcon });

      const popupContent = `
        <div style="font-family: system-ui; font-size: 12px; line-height: 1.4;">
          <strong style="font-size: 13px; color: #047857; display: block;">${v.customers?.name || 'ម្ចាស់ចំការ'}</strong>
          <span style="color: #64748b; font-size: 11px;">🌱 ${v.crop_type || 'មិនបញ្ជាក់'} ${v.farm_size_ha ? `(${v.farm_size_ha} ហ.ត)` : ''}</span><br/>
          <span style="color: #334155;">👤 បុគ្គលិក: <b>${v.staff_name || '—'}</b></span><br/>
          <span style="color: #94a3b8; font-size: 10px;">📅 ${new Date(v.visit_date).toLocaleDateString('km-KH')}</span><br/>
          <div style="margin-top: 6px;">
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="color: #2563eb; font-weight: bold; font-size: 10px; text-decoration: underline;">
              បើក Google Maps ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

  }, [visits]);

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[400px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      
      {visits.filter(v => v.latitude && v.longitude).length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-xs px-4 py-2 rounded-xl shadow-md border border-slate-200 text-xs text-slate-600 font-bold">
          📍 មិនទាន់មានទិន្នន័យ GPS សម្រាប់បង្ហាញលើផែនទីនៅឡើយទេ
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Search, MapPin, Calendar, User, Sprout, Image, ChevronRight, AlertTriangle } from 'lucide-react';

export default function VisitList({ visits, onSelectVisit, onOpenNewVisit }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCrop, setFilterCrop] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const cropTypes = ['All', ...Array.from(new Set(visits.map(v => v.crop_type).filter(Boolean)))];

  const filtered = visits.filter(v => {
    const s = searchTerm.toLowerCase();
    const matchSearch = 
      (v.customers?.name || '').toLowerCase().includes(s) ||
      (v.staff_name || '').toLowerCase().includes(s) ||
      (v.location_address || '').toLowerCase().includes(s) ||
      (v.issues_identified || '').toLowerCase().includes(s) ||
      (v.products_recommended || '').toLowerCase().includes(s);

    const matchCrop = filterCrop === 'All' || v.crop_type === filterCrop;
    const matchStatus = filterStatus === 'All' || v.crop_status === filterStatus;

    return matchSearch && matchCrop && matchStatus;
  });

  return (
    <div className="space-y-4">
      
      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="ស្វែងរកតាមម្ចាស់ចំការ, បុគ្គលិក, ទីតាំង ឬបញ្ហា..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={filterCrop} 
            onChange={e => setFilterCrop(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
          >
            {cropTypes.map((c, i) => (
              <option key={i} value={c}>{c === 'All' ? '🌱 គ្រប់ដំណាំ' : c}</option>
            ))}
          </select>

          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
          >
            <option value="All">🩺 គ្រប់ស្ថានភាព</option>
            <option value="ល្អ">ល្អ 🌿</option>
            <option value="មធ្យម">មធ្យម ⚠️</option>
            <option value="មានបញ្ហា/ជំងឺ">មានបញ្ហា/ជំងឺ 🚨</option>
          </select>

          <div className="ml-auto text-xs text-slate-500 font-bold">
            សរុប៖ <span className="text-slate-800">{filtered.length} កំណត់ត្រា</span>
          </div>
        </div>
      </div>

      {/* Visits Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          មិនមានកំណត់ត្រាចុះចំការត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(visit => {
            const hasPhotos = visit.photos && visit.photos.length > 0;
            const primaryPhoto = hasPhotos ? visit.photos[0] : null;

            return (
              <div 
                key={visit.id} 
                onClick={() => onSelectVisit(visit)}
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Photo Banner if exists */}
                  {primaryPhoto ? (
                    <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
                      <img src={primaryPhoto} alt="Farm photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                      
                      {/* Photo counter */}
                      {visit.photos.length > 1 && (
                        <span className="absolute top-2 right-2 bg-slate-900/70 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-xs">
                          <Image size={10} /> +{visit.photos.length - 1}
                        </span>
                      )}

                      <div className="absolute bottom-2 left-3 right-3 text-white">
                        <h4 className="font-bold text-sm drop-shadow-sm truncate">{visit.customers?.name || 'ម្ចាស់ចំការ'}</h4>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-slate-800 truncate">{visit.customers?.name || 'ម្ចាស់ចំការ'}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          visit.crop_status === 'ល្អ' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : visit.crop_status === 'មធ្យម'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {visit.crop_status}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="p-3.5 space-y-2 text-xs text-slate-600">
                    {/* Status Pill if photo exists */}
                    {primaryPhoto && (
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-500">ស្ថានភាព៖</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          visit.crop_status === 'ល្អ' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : visit.crop_status === 'មធ្យម'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {visit.crop_status}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1 font-bold text-emerald-800">
                        <Sprout size={13} className="text-emerald-600" />
                        {visit.crop_type || '—'} {visit.farm_size_ha ? `(${visit.farm_size_ha} ហ.ត)` : ''}
                      </span>
                      <span className="font-mono text-slate-400 text-[10px]">
                        {new Date(visit.visit_date).toLocaleDateString('km-KH')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">បុគ្គលិក: <strong>{visit.staff_name}</strong></span>
                    </div>

                    {(visit.location_address || visit.customers?.village) && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin size={13} className="text-rose-400 shrink-0" />
                        <span className="truncate">{visit.location_address || visit.customers?.village}</span>
                      </div>
                    )}

                    {visit.issues_identified && (
                      <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1">
                        <AlertTriangle size={12} className="text-amber-600 shrink-0 mt-0.5" />
                        <span className="truncate">{visit.issues_identified}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  {visit.latitude && visit.longitude ? (
                    <a 
                      href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <MapPin size={12} /> ទីតាំង Maps
                    </a>
                  ) : (
                    <span className="text-slate-400 text-[10px]">គ្មាន GPS</span>
                  )}
                  
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>លម្អិត</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

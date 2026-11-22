import React, { useState } from 'react';
import { Search, MapPin, Calendar, User, Sprout, Image, AlertTriangle, Eye, Edit, Trash2, Table as TableIcon, LayoutGrid, Phone } from 'lucide-react';

export default function VisitList({ visits, onSelectVisit, onEditVisit, onDeleteVisit, onOpenNewVisit }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCrop, setFilterCrop] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  const cropTypes = ['All', ...Array.from(new Set(visits.map(v => v.crop_type).filter(Boolean)))];

  const filtered = visits.filter(v => {
    const s = searchTerm.toLowerCase();
    const matchSearch = 
      (v.customers?.name || '').toLowerCase().includes(s) ||
      (v.customers?.phone || '').toLowerCase().includes(s) ||
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
      
      {/* Top Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="ស្វែងរកតាមម្ចាស់ចំការ, លេខទូរស័ព្ទ, បុគ្គលិក, ទីតាំង ឬបញ្ហា..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          
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
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button 
                type="button"
                onClick={() => setViewMode('table')} 
                title="ទម្រង់តារាង"
                className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <TableIcon size={14} />
                <span className="hidden sm:inline">តារាង</span>
              </button>

              <button 
                type="button"
                onClick={() => setViewMode('cards')} 
                title="ទម្រង់កាត"
                className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">កាត</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-bold">
              សរុប៖ <span className="text-slate-800">{filtered.length}</span>
            </div>
          </div>

        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          មិនមានកំណត់ត្រាចុះចំការត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ
        </div>
      ) : viewMode === 'table' ? (

        /* ======================== TABLE VIEW (តារាងទិន្នន័យ) ======================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">កាលបរិច្ឆេទ</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">ម្ចាស់ចំការ</th>
                  <th className="py-3 px-3 whitespace-nowrap">ដំណាំ / ទំហំដី</th>
                  <th className="py-3 px-3 whitespace-nowrap">ស្ថានភាព</th>
                  <th className="py-3 px-3 whitespace-nowrap">បញ្ហា / ផលិតផលណែនាំ</th>
                  <th className="py-3 px-3 whitespace-nowrap">ទីតាំង / GPS</th>
                  <th className="py-3 px-3 whitespace-nowrap">បុគ្គលិកចុះ</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">រូបភាព</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap sticky right-0 bg-slate-50 shadow-xs">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(visit => {
                  const hasPhotos = visit.photos && visit.photos.length > 0;
                  const isProblem = visit.crop_status === 'មានបញ្ហា/ជំងឺ';

                  return (
                    <tr key={visit.id} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* Date */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-800">
                          {new Date(visit.visit_date).toLocaleDateString('km-KH')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(visit.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3.5">
                        <strong className="text-slate-900 block truncate max-w-[140px]">
                          {visit.customers?.name || 'ម្ចាស់ចំការ'}
                        </strong>
                        {visit.customers?.phone && (
                          <a 
                            href={`tel:${visit.customers.phone}`} 
                            className="font-mono text-[11px] text-emerald-700 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Phone size={10} /> {visit.customers.phone}
                          </a>
                        )}
                      </td>

                      {/* Crop & Size */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-800 block">
                          🌱 {visit.crop_type || '—'}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {visit.farm_size_ha ? `${visit.farm_size_ha} ហិកតា` : '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          visit.crop_status === 'ល្អ' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : visit.crop_status === 'មធ្យម'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {visit.crop_status}
                        </span>
                      </td>

                      {/* Issues & Recommendations */}
                      <td className="py-2.5 px-3 max-w-[180px]">
                        {visit.issues_identified ? (
                          <div className="text-rose-700 font-medium truncate" title={visit.issues_identified}>
                            ⚠️ {visit.issues_identified}
                          </div>
                        ) : null}
                        {visit.products_recommended ? (
                          <div className="text-slate-600 truncate text-[11px]" title={visit.products_recommended}>
                            📦 {visit.products_recommended}
                          </div>
                        ) : null}
                        {!visit.issues_identified && !visit.products_recommended && (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Location & Maps */}
                      <td className="py-2.5 px-3 max-w-[150px]">
                        <span className="text-slate-700 block truncate" title={visit.location_address || visit.customers?.village}>
                          {visit.location_address || visit.customers?.village || '—'}
                        </span>
                        {visit.latitude && visit.longitude && (
                          <a 
                            href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline font-bold"
                          >
                            <MapPin size={10} className="text-rose-500" /> Maps ↗
                          </a>
                        )}
                      </td>

                      {/* Staff */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[11px] border border-slate-200">
                          👤 {visit.staff_name}
                        </span>
                      </td>

                      {/* Photos thumbnail */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {hasPhotos ? (
                          <button 
                            type="button"
                            onClick={() => onSelectVisit(visit)}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-700 font-mono text-[11px] font-bold bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border border-slate-200 transition-colors"
                          >
                            <Image size={12} />
                            <span>{visit.photos.length}</span>
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Actions: View, Edit, Delete */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50/80 transition-colors shadow-xs">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* View Detail */}
                          <button 
                            type="button" 
                            onClick={() => onSelectVisit(visit)} 
                            title="មើលព័ត៌មានលម្អិត"
                            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Edit */}
                          <button 
                            type="button" 
                            onClick={() => onEditVisit(visit)} 
                            title="កែប្រែ"
                            className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                          >
                            <Edit size={13} />
                          </button>

                          {/* Delete */}
                          <button 
                            type="button" 
                            onClick={() => onDeleteVisit(visit)} 
                            title="លុប"
                            className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                          >
                            <Trash2 size={13} />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* ======================== CARDS VIEW (ទម្រង់កាត) ======================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(visit => {
            const hasPhotos = visit.photos && visit.photos.length > 0;
            const primaryPhoto = hasPhotos ? visit.photos[0] : null;

            return (
              <div 
                key={visit.id} 
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Photo Banner if exists */}
                  {primaryPhoto ? (
                    <div 
                      onClick={() => onSelectVisit(visit)}
                      className="relative h-32 w-full bg-slate-100 overflow-hidden cursor-pointer group"
                    >
                      <img src={primaryPhoto} alt="Farm photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                      
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

                {/* Card Actions Footer */}
                <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  {visit.latitude && visit.longitude ? (
                    <a 
                      href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <MapPin size={12} /> ទីតាំង Maps
                    </a>
                  ) : (
                    <span className="text-slate-400 text-[10px]">គ្មាន GPS</span>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <button 
                      type="button" 
                      onClick={() => onSelectVisit(visit)} 
                      title="មើលលម្អិត"
                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    >
                      <Eye size={13} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => onEditVisit(visit)} 
                      title="កែប្រែ"
                      className="p-1.5 text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                    >
                      <Edit size={13} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => onDeleteVisit(visit)} 
                      title="លុប"
                      className="p-1.5 text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

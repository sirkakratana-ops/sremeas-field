import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, MapPin, Calendar, User, Sprout, Image, 
  AlertTriangle, Eye, Edit, Trash2, Table as TableIcon, 
  LayoutGrid, Phone, Package, ExternalLink, Building, Users,
  Send, UserCheck, X, Check, Filter, RotateCcw, Plus, Copy,
  Activity
} from 'lucide-react';
import { parseCrops, hasPermission, formatPhoneNumber } from '../staffUtils';
import ShareVisitModal from './ShareVisitModal';

function getLocalDateString(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
}

function getVisitDateKey(visitDateVal) {
  if (!visitDateVal) return '';
  try {
    const d = new Date(visitDateVal);
    if (!isNaN(d.getTime())) {
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  } catch {}
  if (typeof visitDateVal === 'string' && visitDateVal.length >= 10) {
    const match = visitDateVal.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  return '';
}

export default function VisitList({ visits, onSelectVisit, onEditVisit, onDuplicateVisit, onDeleteVisit, onOpenNewVisit, currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCrop, setFilterCrop] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState(''); // 'YYYY-MM-DD' or ''
  const [filterStaff, setFilterStaff] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [sharingVisit, setSharingVisit] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const canViewVisits = hasPermission(currentUser, 'can_view_visits', true);
  const canCreateVisit = hasPermission(currentUser, 'can_create_visit', true);
  const canEditVisit = hasPermission(currentUser, 'can_edit_visit', true);
  const canDeleteVisit = hasPermission(currentUser, 'can_delete_visit', false);

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return getLocalDateString(y);
  }, []);

  const staffNames = useMemo(() => {
    const set = new Set();
    if (currentUser?.name) {
      set.add(currentUser.name.trim());
    }
    visits.forEach(v => {
      if (v.staff_name && v.staff_name.trim()) set.add(v.staff_name.trim());
      if (Array.isArray(v.team_members)) {
        v.team_members.forEach(m => { if (m && m.trim()) set.add(m.trim()); });
      }
    });
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [visits, currentUser]);

  const cropTypes = ['All', ...Array.from(new Set(
    visits.flatMap(v => {
      const crops = parseCrops(v.crops, v.crop_type, v.farm_size_ha);
      return crops.map(c => c.crop_type);
    }).filter(Boolean)
  ))];

  const filtered = visits.filter(v => {
    const s = searchTerm.toLowerCase();
    const crops = parseCrops(v.crops, v.crop_type, v.farm_size_ha);
    const cropsMatchSearch = crops.some(cr => 
      (cr.crop_type || '').toLowerCase().includes(s) ||
      (cr.variety || '').toLowerCase().includes(s)
    );

    const teamStr = Array.isArray(v.team_members) ? v.team_members.join(' ') : (typeof v.team_members === 'string' ? v.team_members : '');

    const matchSearch = 
      (v.customers?.name || '').toLowerCase().includes(s) ||
      (v.customers?.phone || '').toLowerCase().includes(s) ||
      (v.staff_name || '').toLowerCase().includes(s) ||
      (v.branch || '').toLowerCase().includes(s) ||
      teamStr.toLowerCase().includes(s) ||
      (v.location_address || '').toLowerCase().includes(s) ||
      (v.issues_identified || '').toLowerCase().includes(s) ||
      (v.products_recommended || '').toLowerCase().includes(s) ||
      cropsMatchSearch;

    const matchCrop = filterCrop === 'All' || crops.some(cr => cr.crop_type === filterCrop) || v.crop_type === filterCrop;
    const matchStatus = filterStatus === 'All' || (v.crop_status && (v.crop_status === filterStatus || v.crop_status.includes(filterStatus)));

    // Filter by staff
    const matchStaff = filterStaff === 'All' || 
      (v.staff_name && v.staff_name.toLowerCase().trim() === filterStaff.toLowerCase().trim()) ||
      (Array.isArray(v.team_members) && v.team_members.some(m => (m || '').toLowerCase().trim() === filterStaff.toLowerCase().trim())) ||
      (typeof v.team_members === 'string' && v.team_members.toLowerCase().includes(filterStaff.toLowerCase().trim()));

    // Filter by date
    const vDateKey = getVisitDateKey(v.visit_date);
    const vDateRaw = typeof v.visit_date === 'string' ? v.visit_date.slice(0, 10) : '';
    const matchDate = !filterDate || vDateKey === filterDate || vDateRaw === filterDate;

    return matchSearch && matchCrop && matchStatus && matchStaff && matchDate;
  });

  // Reset page to 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCrop, filterStatus, filterStaff, filterDate]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedVisits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const hasActiveFilters = Boolean(filterDate || filterStaff !== 'All' || filterCrop !== 'All' || filterStatus !== 'All' || searchTerm);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterCrop('All');
    setFilterStatus('All');
    setFilterDate('');
    setFilterStaff('All');
  };

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

        {/* Date & Staff Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          
          {/* Date Filter & Quick Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 shrink-0">
              <Calendar size={13} className="text-emerald-600" />
              កាលបរិច្ឆេទ:
            </span>

            <button
              type="button"
              onClick={() => setFilterDate('')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                !filterDate 
                  ? 'bg-slate-800 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ទាំងអស់
            </button>
            <button
              type="button"
              onClick={() => setFilterDate(todayStr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterDate === todayStr 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ថ្ងៃនេះ
            </button>
            <button
              type="button"
              onClick={() => setFilterDate(yesterdayStr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterDate === yesterdayStr 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ម្សិលមិញ
            </button>

            {/* Custom Date Input */}
            <div className="flex items-center gap-1">
              <input 
                type="date" 
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className={`bg-slate-50 border rounded-lg px-2 py-0.5 text-xs text-slate-800 font-medium ${
                  filterDate ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/20' : 'border-slate-200'
                }`}
              />
              {filterDate && (
                <button
                  type="button"
                  onClick={() => setFilterDate('')}
                  title="លុបកាលបរិច្ឆេទ"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Staff Filter & My Visits Button */}
          <div className="flex flex-wrap items-center gap-1.5">
            {currentUser?.name && (
              <button
                type="button"
                onClick={() => setFilterStaff(prev => prev === currentUser.name ? 'All' : currentUser.name)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterStaff === currentUser.name
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
                title="បង្ហាញតែកំណត់ត្រាចុះចំការរបស់ខ្ញុំ ដើម្បីងាយស្រួល Share ទៅ Telegram"
              >
                <UserCheck size={13} />
                <span>កំណត់ត្រារបស់ខ្ញុំ</span>
                {filterStaff === currentUser.name && <Check size={12} className="ml-0.5" />}
              </button>
            )}

            <div className="flex items-center gap-1">
              <User size={13} className="text-slate-400 shrink-0" />
              <select
                value={filterStaff}
                onChange={e => setFilterStaff(e.target.value)}
                className={`bg-slate-50 border rounded-lg px-2 py-1 text-xs text-slate-700 font-bold max-w-[160px] truncate ${
                  filterStaff !== 'All' ? 'border-emerald-500 text-emerald-800 bg-emerald-50/30' : 'border-slate-200'
                }`}
              >
                <option value="All">គ្រប់បុគ្គលិក ({staffNames.length - 1} នាក់)</option>
                {staffNames.filter(name => name !== 'All').map((st, i) => (
                  <option key={i} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          
          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={filterCrop} 
              onChange={e => setFilterCrop(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
            >
              {cropTypes.map((c, i) => (
                <option key={i} value={c}>{c === 'All' ? 'គ្រប់ដំណាំ' : c}</option>
              ))}
            </select>

            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់ស្ថានភាព</option>
              <option value="ល្អ">ល្អ</option>
              <option value="មធ្យម">មធ្យម</option>
              <option value="មានបញ្ហា/ជំងឺ">មានបញ្ហា/ជំងឺ</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors font-medium border border-rose-200"
                title="សម្អាតការស្វែងរក និងតម្រងទាំងអស់"
              >
                <RotateCcw size={12} />
                <span>សម្អាតតម្រង</span>
              </button>
            )}
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
              សរុប៖ <span className="text-slate-800">{filtered.length}</span> / {visits.length}
            </div>

            {onOpenNewVisit && canCreateVisit && (
              <button
                type="button"
                onClick={onOpenNewVisit}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>+ ចុះចំការថ្មី</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs space-y-3">
          <p>មិនមានកំណត់ត្រាចុះចំការត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ</p>
          {onOpenNewVisit && canCreateVisit && (
            <button
              type="button"
              onClick={onOpenNewVisit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>+ កត់ត្រាការចុះចំការថ្មី</span>
            </button>
          )}
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
                {paginatedVisits.map(visit => {
                  const hasPhotos = visit.photos && visit.photos.length > 0;
                  const crops = parseCrops(visit.crops, visit.crop_type, visit.farm_size_ha);

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
                            <Phone size={10} /> {formatPhoneNumber(visit.customers.phone)}
                          </a>
                        )}
                      </td>

                      {/* Crop & Size */}
                      <td className="py-2.5 px-3 min-w-[180px]">
                        {crops.length > 0 ? (
                          <div className="space-y-1">
                            {crops.map((c, idx) => (
                              <div key={idx} className="text-xs">
                                <div className="font-bold text-slate-800 flex items-center gap-1">
                                  <Sprout size={12} className="text-emerald-600 shrink-0" />
                                  <span>{c.crop_type}</span>
                                  {c.variety && (
                                    <span className="text-[11px] font-normal text-slate-500">
                                      ({c.variety})
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 pl-4 flex flex-wrap items-center gap-1">
                                  {c.farm_size_ha ? (
                                    <span className="bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-medium">
                                      {c.farm_size_ha} ហ.ត
                                    </span>
                                  ) : null}
                                  {c.plant_count ? (
                                    <span className="bg-slate-100 text-slate-700 px-1 py-0.2 rounded">
                                      {parseInt(c.plant_count, 10).toLocaleString()} ដើម
                                    </span>
                                  ) : null}
                                  {c.crop_age ? (
                                    <span className="text-slate-400">{c.crop_age}</span>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Status / Condition (Text, not Tag) */}
                      <td className="py-2.5 px-3 min-w-[170px] max-w-[240px]">
                        {visit.crop_status ? (
                          <div className="text-slate-700 text-xs line-clamp-2 leading-relaxed" title={visit.crop_status}>
                            {visit.crop_status}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Issues & Recommendations */}
                      <td className="py-2.5 px-3 max-w-[180px]">
                        {visit.issues_identified ? (
                          <div className="text-rose-700 font-medium truncate flex items-center gap-1" title={visit.issues_identified}>
                            <AlertTriangle size={12} className="shrink-0 text-rose-500" />
                            <span className="truncate">{visit.issues_identified}</span>
                          </div>
                        ) : null}
                        {visit.products_recommended ? (
                          <div className="text-slate-600 truncate text-[11px] flex items-center gap-1" title={visit.products_recommended}>
                            <Package size={12} className="shrink-0 text-slate-400" />
                            <span className="truncate">{visit.products_recommended}</span>
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
                            <MapPin size={10} className="text-rose-500" />
                            <span>Maps</span>
                            <ExternalLink size={9} />
                          </a>
                        )}
                      </td>

                      {/* Staff & Branch */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold text-[11px] border border-slate-200">
                          <User size={11} className="text-slate-500" />
                          <span>{visit.staff_name}</span>
                        </span>
                        {visit.branch && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building size={10} className="text-slate-400" />
                            <span>{visit.branch}</span>
                          </div>
                        )}
                        {Array.isArray(visit.team_members) && visit.team_members.length > 0 && (
                          <div className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5" title={`រួមដំណើរ៖ ${visit.team_members.join(', ')}`}>
                            <Users size={10} className="text-emerald-600" />
                            <span>+{visit.team_members.length} នាក់</span>
                          </div>
                        )}
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
                          
                          {/* Share to Telegram */}
                          <button 
                            type="button" 
                            onClick={() => setSharingVisit(visit)} 
                            title="ផ្ញើទៅកាន់ Telegram Group"
                            className="p-1.5 text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200"
                          >
                            <Send size={13} />
                          </button>

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
                          {canEditVisit && (
                            <button 
                              type="button" 
                              onClick={() => onEditVisit(visit)} 
                              title="កែប្រែ"
                              className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 cursor-pointer"
                            >
                              <Edit size={13} />
                            </button>
                          )}

                          {/* Duplicate */}
                          {onDuplicateVisit && canCreateVisit && (
                            <button 
                              type="button" 
                              onClick={() => onDuplicateVisit(visit)} 
                              title="ចម្លងកំណត់ត្រានេះ (Duplicate)"
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                            >
                              <Copy size={13} />
                            </button>
                          )}

                          {/* Delete */}
                          {canDeleteVisit && (
                            <button 
                              type="button" 
                              onClick={() => onDeleteVisit(visit)} 
                              title="លុប"
                              className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

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
          {paginatedVisits.map(visit => {
            const hasPhotos = visit.photos && visit.photos.length > 0;
            const primaryPhoto = hasPhotos ? visit.photos[0] : null;
            const cardCrops = parseCrops(visit.crops, visit.crop_type, visit.farm_size_ha);

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
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-sm text-slate-800 truncate">{visit.customers?.name || 'ម្ចាស់ចំការ'}</h4>
                        <span className="font-mono text-slate-400 text-[11px] shrink-0">
                          {new Date(visit.visit_date).toLocaleDateString('km-KH')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="p-3.5 space-y-2 text-xs text-slate-600">
                    {/* General Condition / Status (as text, not tag) */}
                    {visit.crop_status && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1">
                          <Activity size={13} className="text-emerald-600 shrink-0" />
                          <span>ស្ថានភាពទូទៅ៖</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed text-xs line-clamp-3" title={visit.crop_status}>
                          {visit.crop_status}
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-[11px] font-bold text-slate-500">ដំណាំ៖</span>
                        {primaryPhoto && (
                          <span className="font-mono text-slate-400 text-[10px]">
                            {new Date(visit.visit_date).toLocaleDateString('km-KH')}
                          </span>
                        )}
                      </div>
                      {cardCrops.length > 0 ? (
                        <div className="space-y-1">
                          {cardCrops.map((c, idx) => (
                            <div key={idx} className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 font-bold text-emerald-800">
                                <Sprout size={12} className="text-emerald-600 shrink-0" />
                                <span>{c.crop_type}</span>
                                {c.variety && <span className="font-normal text-slate-500 text-[11px]">({c.variety})</span>}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                {c.farm_size_ha && <span className="bg-white px-1 py-0.2 rounded border border-slate-200">{c.farm_size_ha} ហ.ត</span>}
                                {c.plant_count && <span>• {parseInt(c.plant_count, 10).toLocaleString()} ដើម</span>}
                                {c.crop_age && <span>• {c.crop_age}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-xs">—</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 text-slate-500">
                      <div className="flex items-center gap-1.5 truncate">
                        <User size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">បុគ្គលិក: <strong>{visit.staff_name}</strong></span>
                      </div>
                      {visit.branch && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium shrink-0 flex items-center gap-0.5">
                          <Building size={10} /> {visit.branch}
                        </span>
                      )}
                    </div>

                    {Array.isArray(visit.team_members) && visit.team_members.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50/70 px-2 py-1 rounded-lg border border-emerald-100">
                        <Users size={12} className="text-emerald-600 shrink-0" />
                        <span className="truncate">ក្រុមការងារ៖ {visit.team_members.join(', ')}</span>
                      </div>
                    )}

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
                      onClick={() => setSharingVisit(visit)} 
                      title="ផ្ញើទៅកាន់ Telegram Group"
                      className="p-1.5 text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200"
                    >
                      <Send size={13} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => onSelectVisit(visit)} 
                      title="មើលលម្អិត"
                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    >
                      <Eye size={13} />
                    </button>
                    {canEditVisit && (
                      <button 
                        type="button" 
                        onClick={() => onEditVisit(visit)} 
                        title="កែប្រែ"
                        className="p-1.5 text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 cursor-pointer"
                      >
                        <Edit size={13} />
                      </button>
                    )}
                    {onDuplicateVisit && canCreateVisit && (
                      <button 
                        type="button" 
                        onClick={() => onDuplicateVisit(visit)} 
                        title="ចម្លងកំណត់ត្រានេះ (Duplicate)"
                        className="p-1.5 text-emerald-600 hover:text-emerald-800 bg-white hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                      >
                        <Copy size={13} />
                      </button>
                    )}
                    {canDeleteVisit && (
                      <button 
                        type="button" 
                        onClick={() => onDeleteVisit(visit)} 
                        title="លុប"
                        className="p-1.5 text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filtered.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs text-xs">
          <div className="text-slate-500 font-medium">
            បង្ហាញទំព័រទី <span className="font-bold text-slate-800">{currentPage}</span> នៃ <span className="font-bold text-slate-800">{totalPages}</span> (បង្ហាញ {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filtered.length)} នៃសរុប {filtered.length} កំណត់ត្រា)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent font-medium"
            >
              ដំបូង
            </button>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent font-medium"
            >
              ថយក្រោយ
            </button>
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200">
              {currentPage} / {totalPages}
            </div>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent font-medium"
            >
              បន្ទាប់
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent font-medium"
            >
              ចុងក្រោយ
            </button>
          </div>
        </div>
      )}

      {/* Share to Telegram Group Modal */}
      <ShareVisitModal
        visit={sharingVisit}
        isOpen={Boolean(sharingVisit)}
        onClose={() => setSharingVisit(null)}
      />

    </div>
  );
}

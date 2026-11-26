import React, { useState, useMemo } from 'react';
import { 
  Phone, Plus, Search, Calendar, User, Building, 
  MapPin, CheckCircle2, AlertCircle, Sparkles, Send, 
  Eye, Edit, Trash2, Download, FileSpreadsheet, Filter, 
  RotateCcw, Clock, Sprout, Tag, Check, Users
} from 'lucide-react';
import { 
  CALL_TYPES, 
  DECISION_SUGGESTIONS, 
  formatCallDate, 
  formatCallDateShort, 
  deleteCustomerCall 
} from '../callUtils';
import { formatPhoneNumber, formatProvince, cleanBranchName } from '../staffUtils';
import NewCallModal from './NewCallModal';
import CallDetailModal from './CallDetailModal';
import ShareCallModal from './ShareCallModal';

export default function CallList({ 
  calls = [], 
  onRefreshCalls, 
  customers = [], 
  currentUser, 
  staffList = [], 
  supabase 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStaff, setFilterStaff] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterDecision, setFilterDecision] = useState('All');
  const [datePreset, setDatePreset] = useState('All'); // 'All' | 'today' | 'yesterday' | 'last7' | 'thisMonth'

  const [selectedCallDetail, setSelectedCallDetail] = useState(null);
  const [callToEdit, setCallToEdit] = useState(null);
  const [isNewCallOpen, setIsNewCallOpen] = useState(false);
  const [sharingCall, setSharingCall] = useState(null);

  // Filter options
  const availableBranches = useMemo(() => {
    const set = new Set();
    calls.forEach(c => {
      const b = cleanBranchName(c.branch);
      if (b) set.add(b);
    });
    staffList.forEach(s => {
      const b = cleanBranchName(s.branch);
      if (b) set.add(b);
    });
    return ['All', ...Array.from(set).sort()];
  }, [calls, staffList]);

  const availableStaff = useMemo(() => {
    const set = new Set();
    calls.forEach(c => {
      if (c.staff_name) set.add(c.staff_name.trim());
    });
    staffList.forEach(s => {
      if (s.name) set.add(s.name.trim());
    });
    return ['All', ...Array.from(set).sort()];
  }, [calls, staffList]);

  // Date Filter Helper
  const isDateInPreset = (callDateStr, preset) => {
    if (preset === 'All' || !callDateStr) return true;
    const d = new Date(callDateStr);
    if (isNaN(d.getTime())) return true;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const cDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today - cDate) / (24 * 60 * 60 * 1000));

    if (preset === 'today') return diffDays === 0;
    if (preset === 'yesterday') return diffDays === 1;
    if (preset === 'last7') return diffDays >= 0 && diffDays <= 7;
    if (preset === 'thisMonth') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    return true;
  };

  // Filtered Calls
  const filteredCalls = useMemo(() => {
    return calls.filter(c => {
      // Date filter
      if (!isDateInPreset(c.call_date, datePreset)) return false;

      // Staff filter
      if (filterStaff !== 'All' && (c.staff_name || '').trim().toLowerCase() !== filterStaff.trim().toLowerCase()) {
        return false;
      }

      // Branch filter
      if (filterBranch !== 'All') {
        const b = cleanBranchName(c.branch).toLowerCase();
        if (b !== cleanBranchName(filterBranch).toLowerCase()) return false;
      }

      // Type filter
      if (filterType !== 'All' && (c.call_type || 'សួរសុខទុក្ខទូទៅ') !== filterType) {
        return false;
      }

      // Decision filter
      if (filterDecision !== 'All') {
        if (!(c.customer_decision || '').includes(filterDecision)) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const match = 
          (c.customer_name || '').toLowerCase().includes(q) ||
          (c.customer_phone || '').includes(q) ||
          (c.staff_name || '').toLowerCase().includes(q) ||
          (c.customer_feedback || '').toLowerCase().includes(q) ||
          (c.team_advice || '').toLowerCase().includes(q) ||
          (c.customer_decision || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [calls, datePreset, filterStaff, filterBranch, filterType, filterDecision, searchTerm]);

  // Statistics KPI counts
  const stats = useMemo(() => {
    const totalCalls = filteredCalls.length;
    const uniqueCustomers = new Set(filteredCalls.map(c => c.customer_id || c.customer_name).filter(Boolean)).size;
    let agreedAdviceCount = 0;
    let agreedPurchaseCount = 0;

    filteredCalls.forEach(c => {
      const dec = c.customer_decision || '';
      if (dec.includes('យល់ព្រមអនុវត្ត')) agreedAdviceCount++;
      if (dec.includes('បញ្ជាទិញ')) agreedPurchaseCount++;
    });

    return {
      totalCalls,
      uniqueCustomers,
      agreedAdviceCount,
      agreedPurchaseCount
    };
  }, [filteredCalls]);

  const handleDelete = async (id) => {
    await deleteCustomerCall(supabase, id);
    if (onRefreshCalls) onRefreshCalls();
  };

  const handleExportCSV = () => {
    if (filteredCalls.length === 0) {
      alert("មិនមានទិន្នន័យសម្រាប់ទាញយកទេ!");
      return;
    }

    const headers = [
      "កាលបរិច្ឆេទខល",
      "ឈ្មោះអតិថិជន",
      "លេខទូរស័ព្ទ",
      "អ្នកខល (Staff)",
      "សាខា",
      "ប្រភេទការខល",
      "ព័ត៌មានទទួលបានពីអតិថិជន",
      "ការណែនាំរបស់ក្រុមការងារ",
      "ការសម្រេចចិត្តរបស់អតិថិជន",
      "កាលបរិច្ឆេទតាមដានបន្ត",
      "កំណត់សម្គាល់"
    ];

    const rows = filteredCalls.map(c => [
      `"${formatCallDate(c.call_date)}"`,
      `"${(c.customer_name || '').replace(/"/g, '""')}"`,
      `"${(c.customer_phone || '').replace(/"/g, '""')}"`,
      `"${(c.staff_name || '').replace(/"/g, '""')}"`,
      `"${(c.branch || '').replace(/"/g, '""')}"`,
      `"${(c.call_type || '').replace(/"/g, '""')}"`,
      `"${(c.customer_feedback || '').replace(/"/g, '""')}"`,
      `"${(c.team_advice || '').replace(/"/g, '""')}"`,
      `"${(c.customer_decision || '').replace(/"/g, '""')}"`,
      `"${c.next_followup_date || ''}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `កំណត់ត្រាខលសួរសុខទុក្ខ_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = Boolean(
    searchTerm || 
    datePreset !== 'All' || 
    filterStaff !== 'All' || 
    filterBranch !== 'All' || 
    filterType !== 'All' || 
    filterDecision !== 'All'
  );

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Top Banner & Action Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Phone size={20} className="text-sky-600" />
            <span>កំណត់ត្រាខលសួរសុខទុក្ខភ្ញៀវ ({filteredCalls.length})</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            កត់ត្រាព័ត៌មានពីកសិករ ការណែនាំបច្ចេកទេស និងការសម្រេចចិត្តក្រោយការខល
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 md:flex-initial bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <Download size={14} className="text-emerald-600" />
            <span>ទាញយក Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCallToEdit(null);
              setIsNewCallOpen(true);
            }}
            className="flex-1 md:flex-initial bg-sky-600 hover:bg-sky-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>+ កត់ត្រាការខលថ្មី</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">សរុបការខល</span>
          <div className="text-lg font-black text-slate-900 mt-0.5">{stats.totalCalls} លើក</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">អតិថិជនបានខល</span>
          <div className="text-lg font-black text-sky-700 mt-0.5">{stats.uniqueCustomers} នាក់</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">យល់ព្រមអនុវត្ត</span>
          <div className="text-lg font-black text-emerald-700 mt-0.5">{stats.agreedAdviceCount} ករណី</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">យល់ព្រមបញ្ជាទិញ</span>
          <div className="text-lg font-black text-amber-700 mt-0.5">{stats.agreedPurchaseCount} ករណី</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2.5 text-xs">
        {/* Search Bar */}
        <div className="relative">
          <input 
            type="text"
            placeholder="ស្វែងរកតាមឈ្មោះអតិថិជន, លេខទូរស័ព្ទ, អ្នកខល, ការណែនាំ, ការសម្រេចចិត្ត..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-8 text-xs text-slate-900 focus:bg-white focus:border-sky-500"
          />
          <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills & Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Preset */}
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់កាលបរិច្ឆេទ</option>
              <option value="today">ថ្ងៃនេះ</option>
              <option value="yesterday">ម្សិលមិញ</option>
              <option value="last7">៧ ថ្ងៃចុងក្រោយ</option>
              <option value="thisMonth">ខែនេះ</option>
            </select>

            {/* Staff Filter */}
            <select
              value={filterStaff}
              onChange={e => setFilterStaff(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់អ្នកខល</option>
              {availableStaff.filter(s => s !== 'All').map((st, i) => (
                <option key={i} value={st}>{st}</option>
              ))}
            </select>

            {/* Branch Filter */}
            <select
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់សាខា</option>
              {availableBranches.filter(b => b !== 'All').map((br, i) => (
                <option key={i} value={br}>{br}</option>
              ))}
            </select>

            {/* Decision Filter */}
            <select
              value={filterDecision}
              onChange={e => setFilterDecision(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់ការសម្រេចចិត្ត</option>
              {DECISION_SUGGESTIONS.map((dec, i) => (
                <option key={i} value={dec}>{dec}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDatePreset('All');
                setFilterStaff('All');
                setFilterBranch('All');
                setFilterType('All');
                setFilterDecision('All');
              }}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline"
            >
              <RotateCcw size={12} />
              <span>កំណត់ឡើងវិញ</span>
            </button>
          )}
        </div>
      </div>

      {/* Calls List Cards */}
      {filteredCalls.length > 0 ? (
        <div className="space-y-3">
          {filteredCalls.map((call) => {
            const isAgreed = (call.customer_decision || '').includes('យល់ព្រម');
            const phoneFormatted = formatPhoneNumber(call.customer_phone || call.customers?.phone);

            return (
              <div 
                key={call.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-sky-300 transition-all space-y-3"
              >
                {/* Card Top: Customer, Caller & Date */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold shrink-0 border border-sky-100">
                      <Phone size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900 text-sm hover:text-sky-600 cursor-pointer" onClick={() => setSelectedCallDetail(call)}>
                          {call.customer_name || 'មិនស្គាល់'}
                        </h3>
                        {phoneFormatted && (
                          <a 
                            href={`tel:${call.customer_phone || call.customers?.phone}`}
                            className="text-emerald-700 font-mono text-xs font-bold hover:underline flex items-center gap-1"
                          >
                            <Phone size={10} />
                            <span>{phoneFormatted}</span>
                          </a>
                        )}
                        <span className="bg-sky-50 text-sky-800 font-bold px-2 py-0.5 rounded-full text-[10px] border border-sky-200">
                          {call.call_type || 'សួរសុខទុក្ខទូទៅ'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>អ្នកខល៖ <b className="text-slate-800">{call.staff_name}</b></span>
                        <span>•</span>
                        <span>សាខា៖ <b>{call.branch || 'ការិយាល័យកណ្តាល'}</b></span>
                        <span>•</span>
                        <span className="text-slate-400 font-mono">{formatCallDate(call.call_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedCallDetail(call)}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                      title="មើលលម្អិត"
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSharingCall(call)}
                      className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors"
                      title="ផ្ញើ Telegram"
                    >
                      <Send size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCallToEdit(call);
                        setIsNewCallOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                      title="កែប្រែ"
                    >
                      <Edit size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`តើអ្នកពិតជាចង់លុបការខលទៅកាន់ «${call.customer_name}» មែនទេ?`)) {
                          handleDelete(call.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                      title="លុប"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Card Middle: 3 Pillars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                  {/* 1. Feedback */}
                  <div className="p-2.5 bg-emerald-50/40 rounded-xl border border-emerald-200/70 text-xs">
                    <span className="text-[10px] font-bold text-emerald-800 block uppercase tracking-wide mb-0.5">
                      ព័ត៌មានពីអតិថិជន
                    </span>
                    <p className="text-slate-800 line-clamp-3 leading-relaxed">
                      {call.customer_feedback || '—'}
                    </p>
                  </div>

                  {/* 2. Advice */}
                  <div className="p-2.5 bg-sky-50/40 rounded-xl border border-sky-200/70 text-xs">
                    <span className="text-[10px] font-bold text-sky-800 block uppercase tracking-wide mb-0.5">
                      ការណែនាំរបស់ក្រុមការងារ
                    </span>
                    <p className="text-slate-800 line-clamp-3 leading-relaxed">
                      {call.team_advice || '—'}
                    </p>
                  </div>

                  {/* 3. Decision */}
                  <div className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                    isAgreed ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 block uppercase tracking-wide mb-0.5 flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-amber-600" />
                        <span>ការសម្រេចចិត្តរបស់កសិករ</span>
                      </span>
                      <p className="text-slate-900 font-bold line-clamp-2 leading-relaxed">
                        {call.customer_decision || '—'}
                      </p>
                    </div>

                    {call.next_followup_date && (
                      <div className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1 pt-1 border-t border-amber-200/60">
                        <Calendar size={10} className="text-slate-400" />
                        <span>តាមដានបន្ត៖ <b>{formatCallDateShort(call.next_followup_date)}</b></span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
            <Phone size={28} />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">
            {hasActiveFilters ? 'រកមិនឃើញកំណត់ត្រាត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ' : 'មិនទាន់មានកំណត់ត្រាខលសួរសុខទុក្ខនៅឡើយទេ'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {hasActiveFilters 
              ? 'សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬចុចប៊ូតុងកំណត់ឡើងវិញ' 
              : 'ចាប់ផ្តើមកត់ត្រាការខលសួរសុខទុក្ខភ្ញៀវដំបូង ដើម្បីងាយស្រួលតាមដានការលូតលាស់ និងការសម្រេចចិត្តរបស់កសិករ'}
          </p>
          <button
            type="button"
            onClick={() => {
              setCallToEdit(null);
              setIsNewCallOpen(true);
            }}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>+ កត់ត្រាការខលថ្មី</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <NewCallModal 
        isOpen={isNewCallOpen}
        onClose={() => {
          setIsNewCallOpen(false);
          setCallToEdit(null);
        }}
        onCallSaved={() => {
          if (onRefreshCalls) onRefreshCalls();
        }}
        customers={customers}
        currentUser={currentUser}
        callToEdit={callToEdit}
        supabase={supabase}
      />

      <CallDetailModal 
        call={selectedCallDetail}
        isOpen={Boolean(selectedCallDetail)}
        onClose={() => setSelectedCallDetail(null)}
        onEditCall={(c) => {
          setCallToEdit(c);
          setIsNewCallOpen(true);
        }}
        onDeleteCall={handleDelete}
        currentUser={currentUser}
      />

      <ShareCallModal 
        call={sharingCall}
        isOpen={Boolean(sharingCall)}
        onClose={() => setSharingCall(null)}
      />

    </div>
  );
}

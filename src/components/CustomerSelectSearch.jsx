import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, User, Phone, MapPin, Sprout, Check, X, 
  UserPlus, RefreshCw, ChevronDown, CheckCircle2, 
  MapPinOff, Building, Tag, Loader2
} from 'lucide-react';
import { supabase } from '../supabase';
import { parseCrops, parseBranches, normalizePhone, formatProvince } from '../staffUtils';

export default function CustomerSelectSearch({
  customers = [],
  selectedCustomerId = '',
  onSelectCustomer,
  onAddNewCustomerClick,
  onResyncCustomerData,
  disabled = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Find currently selected customer
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => c.id === selectedCustomerId) || 
           remoteResults.find(c => c.id === selectedCustomerId) || 
           null;
  }, [selectedCustomerId, customers, remoteResults]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter in-memory customers (fast, responsive)
  const filteredLocal = useMemo(() => {
    if (!searchTerm.trim()) {
      return customers.slice(0, 30);
    }
    const q = searchTerm.toLowerCase().trim();
    const normQ = normalizePhone(q);
    return customers.filter(c => {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const village = (c.village || '').toLowerCase();
      const commune = (c.commune || '').toLowerCase();
      const district = (c.district || '').toLowerCase();
      const province = (c.province || '').toLowerCase();
      const crop = (c.primary_crop || '').toLowerCase();
      const branches = parseBranches(c.branches, c.branch);
      const branchesStr = branches.join(' ').toLowerCase();

      const phoneMatches = phone.includes(q) || (normQ.length >= 3 && normalizePhone(c.phone).includes(normQ));

      return name.includes(q) || 
             phoneMatches || 
             village.includes(q) || 
             commune.includes(q) || 
             district.includes(q) || 
             province.includes(q) || 
             crop.includes(q) ||
             branchesStr.includes(q);
    });
  }, [customers, searchTerm]);

  // Server-side remote query for large datasets (tens of thousands of farmers)
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term || term.length < 2) {
      setRemoteResults([]);
      setIsSearchingRemote(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingRemote(true);
        const normTerm = normalizePhone(term);
        const searchFilters = [
          `name.ilike.%${term}%`,
          `phone.ilike.%${term}%`,
          ...(normTerm.length >= 3 ? [`phone.ilike.%${normTerm.slice(-4)}%`] : []),
          `village.ilike.%${term}%`,
          `commune.ilike.%${term}%`,
          `district.ilike.%${term}%`,
          `province.ilike.%${term}%`,
          `primary_crop.ilike.%${term}%`
        ];
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .or(searchFilters.join(','))
          .limit(30);

        if (!error && data) {
          setRemoteResults(data);
        }
      } catch (err) {
        console.warn('Remote customer search error:', err);
      } finally {
        setIsSearchingRemote(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Combine and deduplicate local + remote matches
  const displayList = useMemo(() => {
    const map = new Map();
    // Prioritize remote if searched, supplemented by local
    remoteResults.forEach(c => map.set(c.id, c));
    filteredLocal.forEach(c => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values()).slice(0, 35);
  }, [filteredLocal, remoteResults]);

  const handleChoose = (customer) => {
    onSelectCustomer(customer);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onSelectCustomer(null);
    setSearchTerm('');
    setIsOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  return (
    <div className="relative" ref={containerRef}>
      
      {/* 1. SELECTED CUSTOMER CARD VIEW */}
      {selectedCustomer && !isOpen ? (
        <div className="bg-emerald-50/70 border border-emerald-300 rounded-2xl p-3.5 sm:p-3 shadow-2xs space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 text-base sm:text-sm flex items-center gap-1.5">
                  <User size={16} className="text-emerald-700" />
                  <span>{selectedCustomer.name}</span>
                </span>
                
                {selectedCustomer.gender && (
                  <span className="text-xs sm:text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                    {selectedCustomer.gender}
                  </span>
                )}

                {selectedCustomer.customer_type && (
                  <span className={`text-xs sm:text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    selectedCustomer.customer_type === 'ដេប៉ូ' 
                      ? 'bg-amber-100 text-amber-800 border-amber-200' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {selectedCustomer.customer_type}
                  </span>
                )}

                {/* Branches */}
                {parseBranches(selectedCustomer.branches, selectedCustomer.branch).map((b, idx) => (
                  <span key={idx} className="text-xs sm:text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold border border-slate-200 flex items-center gap-0.5">
                    <Building size={11} className="text-slate-500" />
                    <span>{b}</span>
                  </span>
                ))}
              </div>

              {selectedCustomer.phone && (
                <div className="text-sm sm:text-xs text-emerald-800 font-mono font-bold flex items-center gap-1.5 mt-1">
                  <Phone size={13} className="text-emerald-600" />
                  <span>{selectedCustomer.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {onResyncCustomerData && (
                <button
                  type="button"
                  onClick={() => onResyncCustomerData(selectedCustomer)}
                  title="ទាញយកទីតាំង និងដំណាំពីអតិថិជននេះម្តងទៀត"
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs sm:text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors min-h-[34px] sm:min-h-[28px]"
                >
                  <RefreshCw size={13} />
                  <span className="hidden sm:inline">ទាញយកទិន្នន័យឡើងវិញ</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors min-h-[34px] sm:min-h-[28px]"
              >
                <span>ប្តូរ</span>
                <ChevronDown size={13} />
              </button>
            </div>
          </div>

          {/* Location & Crops Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-[11px] text-slate-600 pt-2 border-t border-emerald-200/60">
            
            {/* Address */}
            <div className="flex items-start gap-1.5">
              <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
              <span className="truncate">
                {[selectedCustomer.village, selectedCustomer.commune, selectedCustomer.district, formatProvince(selectedCustomer.province)]
                  .filter(Boolean)
                  .join(', ') || 'មិនទាន់មានអាសយដ្ឋាន'}
              </span>
            </div>

            {/* GPS or Crops */}
            <div className="flex items-center gap-2 text-xs sm:text-[10px] text-slate-500">
              {selectedCustomer.latitude && selectedCustomer.longitude ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 font-bold">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  <span>មាន GPS</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <MapPinOff size={12} />
                  <span>គ្មាន GPS</span>
                </span>
              )}

              {selectedCustomer.primary_crop && (
                <span className="inline-flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 truncate">
                  <Sprout size={12} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{selectedCustomer.primary_crop}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (

        /* 2. SEARCH INPUT & DROPDOWN */
        <div className="space-y-1.5">
          <div className="relative">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              disabled={disabled}
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="ស្វែងរកតាមឈ្មោះ, លេខទូរស័ព្ទ, ភូមិ, ឃុំ, ស្រុក, ខេត្ត..."
              className="w-full pl-10 pr-20 py-2.5 sm:py-2 bg-white border border-slate-300 rounded-xl text-sm sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs min-h-[46px] sm:min-h-[40px]"
            />

            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isSearchingRemote && (
                <Loader2 size={15} className="animate-spin text-emerald-600" />
              )}
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <ChevronDown size={16} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
            </div>
          </div>

          {/* Search Result Count & Quick-Add prompt */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-80 flex flex-col">
              
              {/* Header inside dropdown */}
              <div className="p-3 bg-slate-50 text-xs sm:text-[11px] text-slate-500 flex items-center justify-between">
                <span>
                  {displayList.length > 0 
                    ? `បង្ហាញ ${displayList.length} នាក់ ${customers.length > displayList.length ? `(សរុប ${customers.length.toLocaleString()})` : ''}`
                    : 'គ្មានលទ្ធផល'}
                </span>
                {onAddNewCustomerClick && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNewCustomerClick();
                    }}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1.5 hover:underline text-xs sm:text-[11px]"
                  >
                    <UserPlus size={14} />
                    <span>+ បន្ថែមថ្មី</span>
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {displayList.length > 0 ? (
                  displayList.map(cust => {
                    const isSelected = cust.id === selectedCustomerId;
                    const crops = parseCrops(cust.crops, cust.primary_crop);
                    const branches = parseBranches(cust.branches, cust.branch);
                    const addr = [cust.village, cust.commune, cust.district, formatProvince(cust.province)].filter(Boolean).join(', ');

                    return (
                      <div
                        key={cust.id}
                        onClick={() => handleChoose(cust)}
                        className={`p-3 sm:p-2.5 hover:bg-emerald-50/70 cursor-pointer transition-colors flex items-start justify-between gap-2.5 min-h-[54px] sm:min-h-[46px] ${
                          isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 text-sm sm:text-xs truncate">
                              {cust.name}
                            </span>
                            {cust.gender && (
                              <span className="text-[10px] sm:text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                {cust.gender}
                              </span>
                            )}
                            <span className={`text-[10px] sm:text-[9px] px-2 py-0.2 rounded-full font-bold ${
                              cust.customer_type === 'ដេប៉ូ' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {cust.customer_type || 'កសិករ'}
                            </span>
                            {branches.map((b, idx) => (
                              <span key={idx} className="text-[10px] sm:text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold border border-slate-200 flex items-center gap-0.5">
                                <Building size={9} className="text-slate-500" />
                                <span>{b}</span>
                              </span>
                            ))}
                            {cust.phone && (
                              <span className="font-mono text-xs sm:text-[10px] text-slate-500 font-bold">
                                {cust.phone}
                              </span>
                            )}
                          </div>

                          {addr && (
                            <div className="text-xs sm:text-[10px] text-slate-500 flex items-center gap-1 truncate">
                              <MapPin size={12} className="text-rose-400 shrink-0" />
                              <span className="truncate">{addr}</span>
                            </div>
                          )}

                          {crops.length > 0 && (
                            <div className="flex items-center gap-1 text-xs sm:text-[10px] text-slate-500 pt-0.5 flex-wrap">
                              <Sprout size={12} className="text-emerald-600 shrink-0" />
                              <span>{crops.map(c => `${c.crop_type}${c.variety ? ` (${c.variety})` : ''}`).join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <Check size={18} className="text-emerald-600 shrink-0 mt-1" />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-5 text-center text-slate-400 space-y-2.5">
                    <p className="text-sm sm:text-xs">រកមិនឃើញកសិករដែលត្រូវនឹង «{searchTerm}» ទេ</p>
                    {onAddNewCustomerClick && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onAddNewCustomerClick();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 sm:px-3 sm:py-1.5 rounded-xl text-sm sm:text-xs inline-flex items-center gap-1.5 shadow-2xs min-h-[42px] sm:min-h-[36px]"
                      >
                        <UserPlus size={15} />
                        <span>បង្កើតកសិករថ្មីនេះភ្លាមៗ</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Close footer button */}
              <div className="p-2 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-500 hover:text-slate-700 text-xs sm:text-[11px] font-bold px-3 py-1 rounded-lg"
                >
                  បិទផ្ទាំងស្វែងរក
                </button>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}

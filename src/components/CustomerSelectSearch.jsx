import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, User, Phone, MapPin, Sprout, Check, X, 
  UserPlus, RefreshCw, ChevronDown, CheckCircle2, 
  MapPinOff, Building, Tag, Loader2
} from 'lucide-react';
import { supabase } from '../supabase';
import { parseCrops } from '../staffUtils';

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
    return customers.filter(c => {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const village = (c.village || '').toLowerCase();
      const commune = (c.commune || '').toLowerCase();
      const district = (c.district || '').toLowerCase();
      const province = (c.province || '').toLowerCase();
      const crop = (c.primary_crop || '').toLowerCase();
      return name.includes(q) || 
             phone.includes(q) || 
             village.includes(q) || 
             commune.includes(q) || 
             district.includes(q) || 
             province.includes(q) || 
             crop.includes(q);
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
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .or(`name.ilike.%${term}%,phone.ilike.%${term}%,village.ilike.%${term}%,commune.ilike.%${term}%,district.ilike.%${term}%,province.ilike.%${term}%,primary_crop.ilike.%${term}%`)
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
        <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3 shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
                  <User size={14} className="text-emerald-700" />
                  <span>{selectedCustomer.name}</span>
                </span>
                
                {selectedCustomer.gender && (
                  <span className="text-[10px] text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded font-medium">
                    {selectedCustomer.gender}
                  </span>
                )}

                <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${
                  selectedCustomer.customer_type === 'ដេប៉ូ' 
                    ? 'bg-amber-100 text-amber-800 border-amber-200' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {selectedCustomer.customer_type || 'កសិករ'}
                </span>
              </div>

              {selectedCustomer.phone && (
                <div className="text-[11px] text-emerald-800 font-mono flex items-center gap-1 mt-0.5">
                  <Phone size={11} className="text-emerald-600" />
                  <span>{selectedCustomer.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {onResyncCustomerData && (
                <button
                  type="button"
                  onClick={() => onResyncCustomerData(selectedCustomer)}
                  title="ទាញយកទីតាំង និងដំណាំពីអតិថិជននេះម្តងទៀត"
                  className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <RefreshCw size={11} />
                  <span className="hidden sm:inline">ទាញយកទិន្នន័យឡើងវិញ</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
              >
                <span>ប្តូរ</span>
                <ChevronDown size={11} />
              </button>
            </div>
          </div>

          {/* Location & Crops Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-1.5 border-t border-emerald-200/60">
            
            {/* Address */}
            <div className="flex items-start gap-1">
              <MapPin size={12} className="text-rose-500 shrink-0 mt-0.5" />
              <span className="truncate">
                {[selectedCustomer.village, selectedCustomer.commune, selectedCustomer.district, selectedCustomer.province]
                  .filter(Boolean)
                  .join(', ') || 'មិនទាន់មានអាសយដ្ឋាន'}
              </span>
            </div>

            {/* GPS or Crops */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              {selectedCustomer.latitude && selectedCustomer.longitude ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 size={10} className="text-emerald-600" />
                  <span>មាន GPS</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <MapPinOff size={10} />
                  <span>គ្មាន GPS</span>
                </span>
              )}

              {selectedCustomer.primary_crop && (
                <span className="inline-flex items-center gap-1 text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 truncate">
                  <Sprout size={10} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{selectedCustomer.primary_crop}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (

        /* 2. SEARCH INPUT & DROPDOWN */
        <div className="space-y-1">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
              className="w-full pl-9 pr-20 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
            />

            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isSearchingRemote && (
                <Loader2 size={13} className="animate-spin text-emerald-600" />
              )}
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <ChevronDown size={14} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
            </div>
          </div>

          {/* Search Result Count & Quick-Add prompt */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-72 flex flex-col">
              
              {/* Header inside dropdown */}
              <div className="p-2 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
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
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline text-[11px]"
                  >
                    <UserPlus size={12} />
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
                    const addr = [cust.village, cust.commune, cust.district, cust.province].filter(Boolean).join(', ');

                    return (
                      <div
                        key={cust.id}
                        onClick={() => handleChoose(cust)}
                        className={`p-2.5 hover:bg-emerald-50/70 cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                          isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 text-xs truncate">
                              {cust.name}
                            </span>
                            {cust.gender && (
                              <span className="text-[9px] px-1 py-0.1 bg-slate-100 text-slate-600 rounded">
                                {cust.gender}
                              </span>
                            )}
                            <span className={`text-[9px] px-1.5 py-0.1 rounded-full font-bold ${
                              cust.customer_type === 'ដេប៉ូ' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {cust.customer_type || 'កសិករ'}
                            </span>
                            {cust.phone && (
                              <span className="font-mono text-[10px] text-slate-500">
                                {cust.phone}
                              </span>
                            )}
                          </div>

                          {addr && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                              <MapPin size={10} className="text-rose-400 shrink-0" />
                              <span className="truncate">{addr}</span>
                            </div>
                          )}

                          {crops.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5 flex-wrap">
                              <Sprout size={10} className="text-emerald-600 shrink-0" />
                              <span>{crops.map(c => `${c.crop_type}${c.variety ? ` (${c.variety})` : ''}`).join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <Check size={15} className="text-emerald-600 shrink-0 mt-1" />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-slate-400 space-y-2">
                    <p className="text-xs">រកមិនឃើញកសិករដែលត្រូវនឹង «{searchTerm}» ទេ</p>
                    {onAddNewCustomerClick && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onAddNewCustomerClick();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <UserPlus size={13} />
                        <span>បង្កើតកសិករថ្មីនេះភ្លាមៗ</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Close footer button */}
              <div className="p-1.5 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-500 hover:text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded"
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

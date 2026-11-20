import React, { useState } from 'react';
import { User, Phone, MapPin, Sprout, Search, Plus } from 'lucide-react';

export default function CustomerList({ customers, onOpenNewCustomer, onSelectCustomerForVisit }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = customers.filter(c => {
    const s = searchTerm.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(s) ||
      (c.phone || '').toLowerCase().includes(s) ||
      (c.village || '').toLowerCase().includes(s) ||
      (c.province || '').toLowerCase().includes(s) ||
      (c.primary_crop || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      {/* Top search & Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="ស្វែងរកតាមឈ្មោះ, លេខទូរស័ព្ទ ឬខេត្ត..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          />
        </div>
        <button 
          onClick={onOpenNewCustomer}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <Plus size={16} />
          <span>ថែមអតិថិជន</span>
        </button>
      </div>

      {/* Stats */}
      <div className="text-xs text-slate-500 font-bold px-1">
        សរុបអតិថិជន៖ <span className="text-slate-800">{filtered.length} នាក់</span>
      </div>

      {/* Cards List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          មិនមានទិន្នន័យអតិថិជនឡើយ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(cust => (
            <div key={cust.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {cust.name ? cust.name[0] : 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{cust.name}</h4>
                      {cust.primary_crop && (
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                          <Sprout size={12} /> {cust.primary_crop}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mt-2">
                  {cust.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" />
                      <a href={`tel:${cust.phone}`} className="font-mono text-emerald-700 font-bold hover:underline">
                        {cust.phone}
                      </a>
                    </div>
                  )}
                  {(cust.village || cust.province) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400" />
                      <span className="truncate">{[cust.village, cust.commune, cust.district, cust.province].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => onSelectCustomerForVisit(cust)}
                  className="w-full bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold py-1.5 rounded-lg text-xs transition-colors border border-slate-200 hover:border-emerald-200"
                >
                  📝 កត់ត្រាការចុះជួប
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

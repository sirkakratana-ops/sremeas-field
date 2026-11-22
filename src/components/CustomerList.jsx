import React, { useState } from 'react';
import { supabase } from '../supabase';
import { User, Phone, MapPin, Sprout, Search, Plus, Edit, Trash2, Table as TableIcon, LayoutGrid, X, CheckCircle2, ClipboardList } from 'lucide-react';

export default function CustomerList({ customers, onOpenNewCustomer, onSelectCustomerForVisit, onCustomerUpdated, onCustomerDeleted }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCrop, setEditCrop] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editProvince, setEditProvince] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setEditName(cust.name || '');
    setEditPhone(cust.phone || '');
    setEditCrop(cust.primary_crop || '');
    setEditVillage(cust.village || '');
    setEditProvince(cust.province || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return alert("សូមបញ្ចូលឈ្មោះអតិថិជន!");

    setIsSaving(true);
    try {
      const payload = {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        primary_crop: editCrop.trim() || null,
        village: editVillage.trim() || null,
        province: editProvince.trim() || null
      };

      const { data, error } = await supabase.from('customers').update(payload).eq('id', editingCustomer.id).select().single();
      if (error) throw error;

      alert("កែប្រែព័ត៌មានអតិថិជនជោគជ័យ!");
      onCustomerUpdated(data);
      setEditingCustomer(null);
    } catch (err) {
      alert("មិនអាចកែប្រែបានទេ: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cust) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបអតិថិជនឈ្មោះ "${cust.name}" មែនទេ? (ចំណាំ៖ បើគាត់មានកំណត់ត្រាចុះចំការ ប្រព័ន្ធអាចមិនអនុញ្ញាតឱ្យលុប)`)) return;

    try {
      const { error } = await supabase.from('customers').delete().eq('id', cust.id);
      if (error) throw error;

      alert("បានលុបអតិថិជនរួចរាល់!");
      onCustomerDeleted(cust.id);
    } catch (err) {
      alert("មិនអាចលុបបានទេ (អាចដោយសារមានទិន្នន័យចុះចំការភ្ជាប់ជាមួយគាត់): " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top search & Add */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="ស្វែងរកតាមឈ្មោះ, លេខទូរស័ព្ទ, ដំណាំ ឬខេត្ត..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
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

          <button 
            onClick={onOpenNewCustomer}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus size={16} />
            <span>ថែមអតិថិជន</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="text-xs text-slate-500 font-bold px-1">
        សរុបអតិថិជន៖ <span className="text-slate-800">{filtered.length} នាក់</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          មិនមានទិន្នន័យអតិថិជនត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ
        </div>
      ) : viewMode === 'table' ? (
        
        /* ======================== TABLE VIEW (តារាងអតិថិជន) ======================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-3 px-4">ឈ្មោះអតិថិជន</th>
                  <th className="py-3 px-3">លេខទូរស័ព្ទ</th>
                  <th className="py-3 px-3">ដំណាំចម្បង</th>
                  <th className="py-3 px-3">អាសយដ្ឋាន (ភូមិ / ខេត្ត)</th>
                  <th className="py-3 px-4 text-center sticky right-0 bg-slate-50 shadow-xs">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors group">
                    
                    <td className="py-2.5 px-4">
                      <strong className="text-slate-900 block text-sm">{cust.name}</strong>
                    </td>

                    <td className="py-2.5 px-3">
                      {cust.phone ? (
                        <a href={`tel:${cust.phone}`} className="font-mono text-emerald-700 font-bold hover:underline flex items-center gap-1">
                          <Phone size={11} /> {cust.phone}
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {cust.primary_crop ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                          <Sprout size={11} /> {cust.primary_crop}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {[cust.village, cust.province].filter(Boolean).join(', ') || <span className="text-slate-300">—</span>}
                    </td>

                    <td className="py-2.5 px-4 text-center sticky right-0 bg-white group-hover:bg-slate-50/80 transition-colors shadow-xs">
                      <div className="flex items-center justify-center gap-1">
                        
                        {/* New Visit Shortcut */}
                        <button
                          type="button"
                          onClick={() => onSelectCustomerForVisit(cust)}
                          title="កត់ត្រាការចុះជួប"
                          className="px-2 py-1 text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 text-[11px]"
                        >
                          + ចុះជួប
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cust)}
                          title="កែប្រែ"
                          className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                        >
                          <Edit size={13} />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(cust)}
                          title="លុប"
                          className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                        >
                          <Trash2 size={13} />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* ======================== CARDS VIEW (ទម្រង់កាត) ======================== */
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

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cust)}
                      title="កែប្រែ"
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cust)}
                      title="លុប"
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
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
                      <span className="truncate">{[cust.village, cust.province].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => onSelectCustomerForVisit(cust)}
                  className="w-full bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold py-1.5 rounded-lg text-xs transition-colors border border-slate-200 hover:border-emerald-200 flex items-center justify-center gap-1.5"
                >
                  <ClipboardList size={13} />
                  <span>កត់ត្រាការចុះជួប</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================== EDIT CUSTOMER MODAL ======================== */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-3 text-xs">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Edit size={16} className="text-emerald-600" />
                <span>កែប្រែព័ត៌មានអតិថិជន</span>
              </h3>
              <button onClick={() => setEditingCustomer(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">ឈ្មោះអតិថិជន *</label>
                <input 
                  type="text" 
                  required 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">លេខទូរស័ព្ទ</label>
                  <input 
                    type="text" 
                    value={editPhone} 
                    onChange={e => setEditPhone(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ដំណាំចម្បង</label>
                  <input 
                    type="text" 
                    value={editCrop} 
                    onChange={e => setEditCrop(e.target.value)} 
                    placeholder="ឧ. ស្វាយចន្ទី"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ភូមិ / ឃុំ</label>
                  <input 
                    type="text" 
                    value={editVillage} 
                    onChange={e => setEditVillage(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ស្រុក / ខេត្ត</label>
                  <input 
                    type="text" 
                    value={editProvince} 
                    onChange={e => setEditProvince(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="w-1/2 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle2 size={14} />
                  <span>{isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

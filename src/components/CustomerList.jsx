import React, { useState } from 'react';
import { supabase } from '../supabase';
import { 
  User, Phone, MapPin, Sprout, Search, Plus, Edit, Trash2, 
  Table as TableIcon, LayoutGrid, X, CheckCircle2, ClipboardList,
  Navigation, Loader2, ExternalLink, Store, UserCheck
} from 'lucide-react';

export default function CustomerList({ 
  customers, 
  onOpenNewCustomer, 
  onSelectCustomerForVisit, 
  onCustomerCreated,
  onCustomerUpdated, 
  onCustomerDeleted,
  currentUser
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterGender, setFilterGender] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('ប្រុស');
  const [formType, setFormType] = useState('កសិករ');
  const [formCustomType, setFormCustomType] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCrop, setFormCrop] = useState('');
  const [formVillage, setFormVillage] = useState('');
  const [formCommune, setFormCommune] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formProvince, setFormProvince] = useState('');
  const [formLatitude, setFormLatitude] = useState(null);
  const [formLongitude, setFormLongitude] = useState(null);
  const [gettingGPS, setGettingGPS] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check delete permission
  const canDelete = currentUser?.role === 'Admin' || Boolean(currentUser?.permissions?.can_delete_customer);
  const canEdit = currentUser?.role === 'Admin' || currentUser?.permissions?.can_edit_customer !== false;

  const filtered = customers.filter(c => {
    const s = searchTerm.toLowerCase();
    const matchSearch = 
      (c.name || '').toLowerCase().includes(s) ||
      (c.phone || '').toLowerCase().includes(s) ||
      (c.village || '').toLowerCase().includes(s) ||
      (c.commune || '').toLowerCase().includes(s) ||
      (c.district || '').toLowerCase().includes(s) ||
      (c.province || '').toLowerCase().includes(s) ||
      (c.primary_crop || '').toLowerCase().includes(s) ||
      (c.customer_type || '').toLowerCase().includes(s);

    const matchType = filterType === 'All' || (c.customer_type || 'កសិករ') === filterType;
    const matchGender = filterGender === 'All' || (c.gender || '—') === filterGender;

    return matchSearch && matchType && matchGender;
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormGender('ប្រុស');
    setFormType('កសិករ');
    setFormCustomType('');
    setFormPhone('');
    setFormCrop('ស្វាយចន្ទី');
    setFormVillage('');
    setFormCommune('');
    setFormDistrict('');
    setFormProvince('');
    setFormLatitude(null);
    setFormLongitude(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setFormName(cust.name || '');
    setFormGender(cust.gender || 'ប្រុស');
    
    const isStandardType = ['កសិករ', 'ដេប៉ូ'].includes(cust.customer_type);
    if (isStandardType || !cust.customer_type) {
      setFormType(cust.customer_type || 'កសិករ');
      setFormCustomType('');
    } else {
      setFormType('ផ្សេងៗ');
      setFormCustomType(cust.customer_type);
    }

    setFormPhone(cust.phone || '');
    setFormCrop(cust.primary_crop || '');
    setFormVillage(cust.village || '');
    setFormCommune(cust.commune || '');
    setFormDistrict(cust.district || '');
    setFormProvince(cust.province || '');
    setFormLatitude(cust.latitude || null);
    setFormLongitude(cust.longitude || null);
    setIsAddModalOpen(true);
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert("ទូរស័ព្ទ ឬ Browser របស់អ្នកមិនគាំទ្រ GPS ទេ!");
      return;
    }
    setGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLatitude(pos.coords.latitude);
        setFormLongitude(pos.coords.longitude);
        setGettingGPS(false);
      },
      (err) => {
        alert("មិនអាចចាប់យក GPS បានទេ: " + err.message);
        setGettingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return alert("សូមបញ្ចូលឈ្មោះអតិថិជន!");

    setIsSaving(true);
    const resolvedType = formType === 'ផ្សេងៗ' 
      ? (formCustomType.trim() || 'ផ្សេងៗ') 
      : formType;

    const payload = {
      name: formName.trim(),
      gender: formGender || 'ប្រុស',
      customer_type: resolvedType,
      phone: formPhone.trim() || null,
      primary_crop: formCrop.trim() || null,
      village: formVillage.trim() || null,
      commune: formCommune.trim() || null,
      district: formDistrict.trim() || null,
      province: formProvince.trim() || null,
      latitude: formLatitude ? parseFloat(formLatitude) : null,
      longitude: formLongitude ? parseFloat(formLongitude) : null
    };

    try {
      if (editingCustomer) {
        // Try updating
        const { data, error } = await supabase.from('customers').update(payload).eq('id', editingCustomer.id).select().single();
        if (error) {
          // If error is missing column, fallback to updating basic fields
          if (error.message.includes('column') || error.code === 'PGRST204') {
            const fallbackPayload = {
              name: formName.trim(),
              phone: formPhone.trim() || null,
              primary_crop: formCrop.trim() || null,
              village: formVillage.trim() || null,
              province: formProvince.trim() || null
            };
            const { data: fbData, error: fbErr } = await supabase.from('customers').update(fallbackPayload).eq('id', editingCustomer.id).select().single();
            if (fbErr) throw fbErr;
            alert("បានកែប្រែព័ត៌មានអតិថិជន! (ចំណាំ៖ សូមដំណើរការ SQL Script ក្នុង Admin Dashboard ដើម្បីគាំទ្រជួរឈរថ្មីពេញលេញ)");
            if (onCustomerUpdated) onCustomerUpdated({ ...fbData, ...payload });
          } else {
            throw error;
          }
        } else {
          alert("កែប្រែព័ត៌មានអតិថិជនជោគជ័យ!");
          if (onCustomerUpdated) onCustomerUpdated(data);
        }
      } else {
        // Insert new customer
        const { data, error } = await supabase.from('customers').insert([payload]).select().single();
        if (error) {
          if (error.message.includes('column') || error.code === 'PGRST204') {
            const fallbackPayload = {
              name: formName.trim(),
              phone: formPhone.trim() || null,
              primary_crop: formCrop.trim() || null,
              village: formVillage.trim() || null,
              province: formProvince.trim() || null
            };
            const { data: fbData, error: fbErr } = await supabase.from('customers').insert([fallbackPayload]).select().single();
            if (fbErr) throw fbErr;
            alert("បានបង្កើតអតិថិជនថ្មីជោគជ័យ! (ចំណាំ៖ សូមដំណើរការ SQL Script ក្នុង Admin Dashboard ដើម្បីគាំទ្រជួរឈរថ្មីពេញលេញ)");
            if (onCustomerCreated) onCustomerCreated({ ...fbData, ...payload });
          } else {
            throw error;
          }
        } else {
          alert("បានបន្ថែមអតិថិជនថ្មីជោគជ័យ!");
          if (onCustomerCreated) onCustomerCreated(data);
        }
      }

      setIsAddModalOpen(false);
      setEditingCustomer(null);
    } catch (err) {
      alert("មានបញ្ហាក្នុងការរក្សាទុក: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cust) => {
    if (!canDelete) {
      return alert("អ្នកមិនមានសិទ្ធិលុបអតិថិជនទេ! សូមទាក់ទង Admin។");
    }
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបអតិថិជនឈ្មោះ "${cust.name}" មែនទេ? (ចំណាំ៖ បើគាត់មានកំណត់ត្រាចុះចំការ ប្រព័ន្ធអាចមិនអនុញ្ញាតឱ្យលុប)`)) return;

    try {
      const { error } = await supabase.from('customers').delete().eq('id', cust.id);
      if (error) throw error;

      alert("បានលុបអតិថិជនរួចរាល់!");
      if (onCustomerDeleted) onCustomerDeleted(cust.id);
    } catch (err) {
      alert("មិនអាចលុបបានទេ (អាចដោយសារមានទិន្នន័យចុះចំការភ្ជាប់ជាមួយគាត់): " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="ស្វែងរកតាមឈ្មោះ, លេខទូរស័ព្ទ, ដំណាំ, ភូមិ, ឃុំ, ស្រុក ឬខេត្ត..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          
          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់ប្រភេទ</option>
              <option value="កសិករ">កសិករ</option>
              <option value="ដេប៉ូ">ដេប៉ូ</option>
            </select>

            <select 
              value={filterGender} 
              onChange={e => setFilterGender(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់ភេទ</option>
              <option value="ប្រុស">ប្រុស</option>
              <option value="ស្រី">ស្រី</option>
            </select>

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
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-500 font-bold">
              សរុប៖ <span className="text-slate-900">{filtered.length} នាក់</span>
            </span>

            <button 
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Plus size={15} />
              <span>ថែមអតិថិជន</span>
            </button>
          </div>

        </div>
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
                  <th className="py-3 px-3.5 whitespace-nowrap">ឈ្មោះអតិថិជន / ភេទ</th>
                  <th className="py-3 px-3 whitespace-nowrap">ប្រភេទ</th>
                  <th className="py-3 px-3 whitespace-nowrap">លេខទូរស័ព្ទ</th>
                  <th className="py-3 px-3 whitespace-nowrap">ដំណាំចម្បង</th>
                  <th className="py-3 px-3 whitespace-nowrap">អាសយដ្ឋាន (ភូមិ, ឃុំ, ស្រុក, ខេត្ត)</th>
                  <th className="py-3 px-3 whitespace-nowrap">ទីតាំង GPS</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap sticky right-0 bg-slate-50 shadow-xs">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(cust => {
                  const hasGPS = cust.latitude && cust.longitude;
                  const fullAddress = [cust.village, cust.commune, cust.district, cust.province].filter(Boolean).join(', ');

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* Name & Gender */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            cust.gender === 'ស្រី' ? 'bg-pink-100 text-pink-700' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {cust.name ? cust.name[0] : 'U'}
                          </div>
                          <div>
                            <strong className="text-slate-900 block text-xs">
                              {cust.name}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {cust.gender ? `ភេទ៖ ${cust.gender}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer Type */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          cust.customer_type === 'ដេប៉ូ'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {cust.customer_type === 'ដេប៉ូ' ? <Store size={10} /> : <UserCheck size={10} />}
                          <span>{cust.customer_type || 'កសិករ'}</span>
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {cust.phone ? (
                          <a href={`tel:${cust.phone}`} className="font-mono text-emerald-700 font-bold hover:underline flex items-center gap-1 text-[11px]">
                            <Phone size={10} /> {cust.phone}
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Primary Crop */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {cust.primary_crop ? (
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                            <Sprout size={12} className="text-emerald-600 shrink-0" />
                            <span>{cust.primary_crop}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Full Address */}
                      <td className="py-2.5 px-3 max-w-[200px]">
                        <span className="text-slate-700 block truncate" title={fullAddress}>
                          {fullAddress || <span className="text-slate-300">—</span>}
                        </span>
                      </td>

                      {/* GPS Location */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {hasGPS ? (
                          <a 
                            href={`https://www.google.com/maps?q=${cust.latitude},${cust.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline font-bold"
                          >
                            <MapPin size={11} className="text-rose-500" />
                            <span>{cust.latitude.toFixed(4)}, {cust.longitude.toFixed(4)}</span>
                            <ExternalLink size={9} />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[10px]">គ្មាន GPS</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50/80 transition-colors shadow-xs">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* New Visit Shortcut */}
                          <button
                            type="button"
                            onClick={() => onSelectCustomerForVisit(cust)}
                            title="កត់ត្រាការចុះជួប"
                            className="px-2 py-1 text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 text-[11px] flex items-center gap-1"
                          >
                            <Plus size={12} />
                            <span>ចុះជួប</span>
                          </button>

                          {/* Edit */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(cust)}
                              title="កែប្រែ"
                              className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                            >
                              <Edit size={13} />
                            </button>
                          )}

                          {/* Delete */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(cust)}
                              title="លុប"
                              className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
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
          {filtered.map(cust => {
            const hasGPS = cust.latitude && cust.longitude;
            const fullAddress = [cust.village, cust.commune, cust.district, cust.province].filter(Boolean).join(', ');

            return (
              <div key={cust.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        cust.gender === 'ស្រី' ? 'bg-pink-100 text-pink-700' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {cust.name ? cust.name[0] : 'U'}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                          <span>{cust.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                            cust.customer_type === 'ដេប៉ូ' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {cust.customer_type || 'កសិករ'}
                          </span>
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>ភេទ៖ {cust.gender || '—'}</span>
                          {cust.primary_crop && (
                            <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                              <Sprout size={11} /> {cust.primary_crop}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cust)}
                          title="កែប្រែ"
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(cust)}
                          title="លុប"
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 mt-2">
                    {cust.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400" />
                        <a href={`tel:${cust.phone}`} className="font-mono text-emerald-700 font-bold hover:underline">
                          {cust.phone}
                        </a>
                      </div>
                    )}
                    {fullAddress && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{fullAddress}</span>
                      </div>
                    )}
                    {hasGPS && (
                      <div className="flex items-center gap-1.5">
                        <Navigation size={12} className="text-rose-500 shrink-0" />
                        <a 
                          href={`https://www.google.com/maps?q=${cust.latitude},${cust.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-mono text-[11px] font-bold inline-flex items-center gap-0.5"
                        >
                          <span>{cust.latitude.toFixed(4)}, {cust.longitude.toFixed(4)}</span>
                          <ExternalLink size={9} />
                        </a>
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
            );
          })}
        </div>
      )}

      {/* ======================== ADD / EDIT CUSTOMER MODAL ======================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full my-6 p-5 shadow-2xl border border-slate-100 space-y-3.5 text-xs">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Edit size={16} className="text-emerald-600" />
                <span>{editingCustomer ? 'កែប្រែព័ត៌មានអតិថិជន' : 'បន្ថែមអតិថិជនថ្មី'}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
              
              {/* Name, Gender, Type */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">ឈ្មោះអតិថិជន *</label>
                  <input 
                    type="text" 
                    required 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)} 
                    placeholder="ឈ្មោះ..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ភេទ</label>
                  <select 
                    value={formGender} 
                    onChange={e => setFormGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-bold"
                  >
                    <option value="ប្រុស">ប្រុស</option>
                    <option value="ស្រី">ស្រី</option>
                  </select>
                </div>
              </div>

              {/* Customer Type & Custom Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ប្រភេទអតិថិជន</label>
                  <select 
                    value={formType} 
                    onChange={e => setFormType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-bold"
                  >
                    <option value="កសិករ">កសិករ</option>
                    <option value="ដេប៉ូ">ដេប៉ូ</option>
                    <option value="ផ្សេងៗ">ផ្សេងៗ (កំណត់ផ្ទាល់ខ្លួន)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ដំណាំចម្បង</label>
                  <input 
                    type="text" 
                    value={formCrop} 
                    onChange={e => setFormCrop(e.target.value)} 
                    placeholder="ឧ. ស្វាយចន្ទី, ស្រូវ..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              {formType === 'ផ្សេងៗ' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">បញ្ជាក់ប្រភេទផ្សេងទៀត</label>
                  <input 
                    type="text" 
                    value={formCustomType} 
                    onChange={e => setFormCustomType(e.target.value)} 
                    placeholder="ឧ. ឈ្មួញកណ្តាល, សហគមន៍..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                  />
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">លេខទូរស័ព្ទ</label>
                <input 
                  type="text" 
                  value={formPhone} 
                  onChange={e => setFormPhone(e.target.value)} 
                  placeholder="012 345 678"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-mono"
                />
              </div>

              {/* Address Details: Village, Commune, District, Province */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block text-[11px]">អាសយដ្ឋានលម្អិត</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">ភូមិ</label>
                    <input 
                      type="text" 
                      value={formVillage} 
                      onChange={e => setFormVillage(e.target.value)} 
                      placeholder="ឈ្មោះភូមិ..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">ឃុំ / សង្កាត់</label>
                    <input 
                      type="text" 
                      value={formCommune} 
                      onChange={e => setFormCommune(e.target.value)} 
                      placeholder="ឈ្មោះឃុំ..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">ស្រុក / ខណ្ឌ</label>
                    <input 
                      type="text" 
                      value={formDistrict} 
                      onChange={e => setFormDistrict(e.target.value)} 
                      placeholder="ឈ្មោះស្រុក..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">ខេត្ត / រាជធានី</label>
                    <input 
                      type="text" 
                      value={formProvince} 
                      onChange={e => setFormProvince(e.target.value)} 
                      placeholder="ឈ្មោះខេត្ត..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* GPS Coordinates & Catch Button */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                    <MapPin size={13} className="text-rose-500" />
                    <span>ទីតាំងចំការ / ផ្ទះ (GPS Coordinates)</span>
                  </span>
                  <button 
                    type="button" 
                    onClick={handleGetGPS}
                    disabled={gettingGPS}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 transition-colors"
                  >
                    {gettingGPS ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
                    <span>{gettingGPS ? 'កំពុងចាប់...' : 'ចាប់យក GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Latitude</label>
                    <input 
                      type="number" 
                      step="any"
                      value={formLatitude || ''} 
                      onChange={e => setFormLatitude(e.target.value)} 
                      placeholder="11.5564"
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Longitude</label>
                    <input 
                      type="number" 
                      step="any"
                      value={formLongitude || ''} 
                      onChange={e => setFormLongitude(e.target.value)} 
                      placeholder="104.9282"
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 font-mono"
                    />
                  </div>
                </div>

                {formLatitude && formLongitude && (
                  <div className="text-[10px] text-blue-600">
                    <a 
                      href={`https://www.google.com/maps?q=${formLatitude},${formLongitude}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="underline font-bold inline-flex items-center gap-1"
                    >
                      <span>ផ្ទៀងផ្ទាត់លើ Google Maps</span>
                      <ExternalLink size={9} />
                    </a>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                  <span>{isSaving ? 'កំពុងរក្សាទុក...' : (editingCustomer ? 'រក្សាទុកការកែប្រែ' : 'បន្ថែមអតិថិជន')}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

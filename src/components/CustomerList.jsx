import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { 
  User, Phone, MapPin, Sprout, Search, Plus, Edit, Trash2, 
  Table as TableIcon, LayoutGrid, X, CheckCircle2, ClipboardList,
  Navigation, Loader2, ExternalLink, Store, UserCheck, ChevronDown, ChevronUp,
  Building, Check, AlertTriangle, AlertCircle
} from 'lucide-react';
import CropsEditor from './CropsEditor';
import { parseCrops, parseBranches, getStaffBranches, getStaffList, normalizePhone, checkDuplicateCustomerPhone } from '../staffUtils';

export default function CustomerList({ 
  customers, 
  onOpenNewCustomer, 
  onSelectCustomerForVisit, 
  onCustomerCreated,
  onCustomerUpdated, 
  onCustomerDeleted,
  currentUser,
  staffList: propStaffList = []
}) {
  const [internalStaff, setInternalStaff] = useState(propStaffList);

  useEffect(() => {
    if (propStaffList && propStaffList.length > 0) {
      setInternalStaff(propStaffList);
    } else {
      getStaffList(supabase).then(list => setInternalStaff(list || []));
    }
  }, [propStaffList]);

  // Distinct branches strictly from staff table
  const staffBranches = useMemo(() => {
    return getStaffBranches(internalStaff.length > 0 ? internalStaff : propStaffList);
  }, [internalStaff, propStaffList]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterGender, setFilterGender] = useState('All');
  const [filterCrop, setFilterCrop] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('ប្រុស');
  const [formType, setFormType] = useState('កសិករ');
  const [formCustomType, setFormCustomType] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [duplicateCustomer, setDuplicateCustomer] = useState(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [formBranches, setFormBranches] = useState([]);
  const [customBranchInput, setCustomBranchInput] = useState('');
  const [formVillage, setFormVillage] = useState('');
  const [formCommune, setFormCommune] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formProvince, setFormProvince] = useState('');
  const [formLatitude, setFormLatitude] = useState(null);
  const [formLongitude, setFormLongitude] = useState(null);
  const [formCrops, setFormCrops] = useState([]);
  
  const [gettingGPS, setGettingGPS] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Real-time verification to prevent duplicate phone numbers
  useEffect(() => {
    if (!isAddModalOpen) {
      setDuplicateCustomer(null);
      setIsCheckingPhone(false);
      return;
    }

    const norm = normalizePhone(formPhone);
    if (!norm || norm.length < 8) {
      setDuplicateCustomer(null);
      setIsCheckingPhone(false);
      return;
    }

    let isMounted = true;
    setIsCheckingPhone(true);
    const timer = setTimeout(async () => {
      try {
        const found = await checkDuplicateCustomerPhone(
          formPhone, 
          editingCustomer?.id, 
          customers, 
          supabase
        );
        if (isMounted) {
          setDuplicateCustomer(found);
          setIsCheckingPhone(false);
        }
      } catch (err) {
        if (isMounted) setIsCheckingPhone(false);
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formPhone, editingCustomer, isAddModalOpen, customers]);

  // Check delete permission
  const canDelete = currentUser?.role === 'Admin' || Boolean(currentUser?.permissions?.can_delete_customer);
  const canEdit = currentUser?.role === 'Admin' || currentUser?.permissions?.can_edit_customer !== false;

  // Collect all unique crops across customers for filtering
  const allCropTypes = ['All', ...Array.from(new Set(
    customers.flatMap(c => {
      const crops = parseCrops(c.crops, c.primary_crop);
      return crops.map(cr => cr.crop_type);
    }).filter(Boolean)
  ))];

  // Collect all unique branches across customers for filtering
  const allCustomerBranches = ['All', ...Array.from(new Set(
    customers.flatMap(c => parseBranches(c.branches, c.branch)).filter(Boolean)
  ))];

  const filtered = customers.filter(c => {
    const s = searchTerm.toLowerCase();
    const crops = parseCrops(c.crops, c.primary_crop);
    const branches = parseBranches(c.branches, c.branch);
    const branchesStr = branches.join(' ').toLowerCase();

    const cropsMatchSearch = crops.some(cr => 
      (cr.crop_type || '').toLowerCase().includes(s) ||
      (cr.variety || '').toLowerCase().includes(s)
    );

    const normSearch = normalizePhone(s);
    const phoneMatches = 
      (c.phone || '').toLowerCase().includes(s) ||
      (normSearch.length >= 3 && normalizePhone(c.phone).includes(normSearch));

    const matchSearch = 
      (c.name || '').toLowerCase().includes(s) ||
      phoneMatches ||
      (c.village || '').toLowerCase().includes(s) ||
      (c.commune || '').toLowerCase().includes(s) ||
      (c.district || '').toLowerCase().includes(s) ||
      (c.province || '').toLowerCase().includes(s) ||
      (c.customer_type || '').toLowerCase().includes(s) ||
      branchesStr.includes(s) ||
      cropsMatchSearch;

    const matchType = filterType === 'All' || (c.customer_type || 'កសិករ') === filterType;
    const matchGender = filterGender === 'All' || (c.gender || '—') === filterGender;
    const matchCrop = filterCrop === 'All' || crops.some(cr => cr.crop_type === filterCrop);
    const matchBranch = filterBranch === 'All' || branches.includes(filterBranch);

    return matchSearch && matchType && matchGender && matchCrop && matchBranch;
  });

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterGender, filterCrop, filterBranch]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setDuplicateCustomer(null);
    setIsCheckingPhone(false);
    setFormName('');
    setFormGender('ប្រុស');
    setFormType('កសិករ');
    setFormCustomType('');
    setFormPhone('');
    setFormBranches(currentUser?.branch ? [currentUser.branch] : ['ការិយាល័យកណ្តាល']);
    setCustomBranchInput('');
    setFormVillage('');
    setFormCommune('');
    setFormDistrict('');
    setFormProvince('');
    setFormLatitude(null);
    setFormLongitude(null);
    setFormCrops([
      { crop_type: 'ស្វាយចន្ទី', variety: 'M23', farm_size_ha: '', plant_count: '', crop_age: '' }
    ]);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setDuplicateCustomer(null);
    setIsCheckingPhone(false);
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
    const custBranches = parseBranches(cust.branches, cust.branch);
    setFormBranches(custBranches.length > 0 ? custBranches : (currentUser?.branch ? [currentUser.branch] : []));
    setCustomBranchInput('');
    setFormVillage(cust.village || '');
    setFormCommune(cust.commune || '');
    setFormDistrict(cust.district || '');
    setFormProvince(cust.province || '');
    setFormLatitude(cust.latitude || null);
    setFormLongitude(cust.longitude || null);

    const parsed = parseCrops(cust.crops, cust.primary_crop);
    setFormCrops(parsed.length > 0 ? parsed : [
      { crop_type: 'ស្វាយចន្ទី', variety: '', farm_size_ha: '', plant_count: '', crop_age: '' }
    ]);

    setIsAddModalOpen(true);
  };

  const handleToggleBranch = (b) => {
    if (!b) return;
    setFormBranches(prev => 
      prev.includes(b) ? prev.filter(item => item !== b) : [...prev, b]
    );
  };

  const handleRemoveBranch = (b) => {
    setFormBranches(prev => prev.filter(item => item !== b));
  };

  const handleAddCustomBranch = () => {
    const val = customBranchInput.trim();
    if (!val) return;
    if (!formBranches.includes(val)) {
      setFormBranches(prev => [...prev, val]);
    }
    setCustomBranchInput('');
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

    // Verify phone number to prevent duplicates
    if (formPhone.trim()) {
      setIsSaving(true);
      const duplicate = await checkDuplicateCustomerPhone(
        formPhone, 
        editingCustomer?.id, 
        customers, 
        supabase
      );
      if (duplicate) {
        setIsSaving(false);
        setDuplicateCustomer(duplicate);
        alert(`មិនអាចរក្សាទុកបានទេ!\n\nលេខទូរស័ព្ទ «${formPhone}» នេះមានរួចហើយក្នុងប្រព័ន្ធ ជារបស់អតិថិជនឈ្មោះ «${duplicate.name}» (${duplicate.phone || ''})។\n\nសូមកុំបង្កើតទិន្នន័យស្ទួន!`);
        return;
      }
    }

    setIsSaving(true);
    const resolvedType = formType === 'ផ្សេងៗ' 
      ? (formCustomType.trim() || 'ផ្សេងៗ') 
      : formType;

    const primaryCropString = formCrops.map(c => c.crop_type).filter(Boolean).join(', ') || null;
    const branchString = formBranches.join(', ') || null;

    const payload = {
      name: formName.trim(),
      gender: formGender || 'ប្រុស',
      customer_type: resolvedType,
      phone: formPhone.trim() || null,
      primary_crop: primaryCropString,
      crops: formCrops,
      branches: formBranches,
      branch: branchString,
      village: formVillage.trim() || null,
      commune: formCommune.trim() || null,
      district: formDistrict.trim() || null,
      province: formProvince.trim() || null,
      latitude: formLatitude ? parseFloat(formLatitude) : null,
      longitude: formLongitude ? parseFloat(formLongitude) : null
    };

    try {
      if (editingCustomer) {
        let { data, error } = await supabase.from('customers').update(payload).eq('id', editingCustomer.id).select().single();
        if (error && (error.message.includes('column') || error.code === 'PGRST204' || error.code === '42703')) {
          const { branches: _br, branch: _b, ...payloadNoBranch } = payload;
          const res2 = await supabase.from('customers').update(payloadNoBranch).eq('id', editingCustomer.id).select().single();
          if (!res2.error) {
            data = { ...res2.data, ...payload };
            error = null;
          } else {
            const fallbackPayload = {
              name: formName.trim(),
              phone: formPhone.trim() || null,
              primary_crop: primaryCropString,
              village: formVillage.trim() || null,
              province: formProvince.trim() || null
            };
            const res3 = await supabase.from('customers').update(fallbackPayload).eq('id', editingCustomer.id).select().single();
            if (res3.error) throw res3.error;
            data = { ...res3.data, ...payload };
            error = null;
          }
        }
        if (error) throw error;
        alert("កែប្រែព័ត៌មានអតិថិជនជោគជ័យ!");
        if (onCustomerUpdated) onCustomerUpdated(data);
      } else {
        let { data, error } = await supabase.from('customers').insert([payload]).select().single();
        if (error && (error.message.includes('column') || error.code === 'PGRST204' || error.code === '42703')) {
          const { branches: _br, branch: _b, ...payloadNoBranch } = payload;
          const res2 = await supabase.from('customers').insert([payloadNoBranch]).select().single();
          if (!res2.error) {
            data = { ...res2.data, ...payload };
            error = null;
          } else {
            const fallbackPayload = {
              name: formName.trim(),
              phone: formPhone.trim() || null,
              primary_crop: primaryCropString,
              village: formVillage.trim() || null,
              province: formProvince.trim() || null
            };
            const res3 = await supabase.from('customers').insert([fallbackPayload]).select().single();
            if (res3.error) throw res3.error;
            data = { ...res3.data, ...payload };
            error = null;
          }
        }
        if (error) throw error;
        alert("បានបន្ថែមអតិថិជនថ្មីជោគជ័យ!");
        if (onCustomerCreated) onCustomerCreated(data);
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
            placeholder="ស្វែងរកតាមឈ្មោះ, លេខទូរស័ព្ទ, ដំណាំ, ពូជ, ភូមិ, ឃុំ, ស្រុក ឬខេត្ត..." 
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

            <select 
              value={filterBranch} 
              onChange={e => setFilterBranch(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់សាខា</option>
              {staffBranches.map((b, i) => (
                <option key={i} value={b}>សាខា {b}</option>
              ))}
            </select>

            {allCropTypes.length > 2 && (
              <select 
                value={filterCrop} 
                onChange={e => setFilterCrop(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
              >
                {allCropTypes.map((c, i) => (
                  <option key={i} value={c}>{c === 'All' ? 'គ្រប់ដំណាំ' : c}</option>
                ))}
              </select>
            )}

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
                  <th className="py-3 px-3 whitespace-nowrap">សាខា</th>
                  <th className="py-3 px-3 whitespace-nowrap">ប្រភេទ</th>
                  <th className="py-3 px-3 whitespace-nowrap">លេខទូរស័ព្ទ</th>
                  <th className="py-3 px-3 whitespace-nowrap">ដំណាំក្នុងចំការ (ពូជ, ផ្ទៃដី, ចំនួនដើម, អាយុ)</th>
                  <th className="py-3 px-3 whitespace-nowrap">អាសយដ្ឋាន</th>
                  <th className="py-3 px-3 whitespace-nowrap">ទីតាំង GPS</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap sticky right-0 bg-slate-50 shadow-xs">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map(cust => {
                  const hasGPS = cust.latitude && cust.longitude;
                  const fullAddress = [cust.village, cust.commune, cust.district, cust.province].filter(Boolean).join(', ');
                  const crops = parseCrops(cust.crops, cust.primary_crop);
                  const branches = parseBranches(cust.branches, cust.branch);

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

                      {/* Branch(es) */}
                      <td className="py-2.5 px-3 min-w-[130px]">
                        {branches.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {branches.map((b, idx) => (
                              <span 
                                key={idx} 
                                className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.2 rounded text-[10px] font-bold"
                              >
                                <Building size={10} className="text-slate-500 shrink-0" />
                                <span>{b}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
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

                      {/* Multi-Crop Breakdown (ដំណាំក្នុងចំការ) */}
                      <td className="py-2.5 px-3 min-w-[220px]">
                        {crops.length > 0 ? (
                          <div className="space-y-1">
                            {crops.map((cr, idx) => (
                              <div key={idx} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50/80 px-2 py-0.2 rounded border border-emerald-200">
                                  <Sprout size={10} className="text-emerald-600" />
                                  <span>{cr.crop_type || 'ដំណាំ'}</span>
                                  {cr.variety && <span className="text-slate-500 font-normal">({cr.variety})</span>}
                                </span>

                                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                  {cr.farm_size_ha && (
                                    <span className="bg-slate-100 text-slate-700 px-1 py-0.2 rounded">
                                      {cr.farm_size_ha} ហ.ត
                                    </span>
                                  )}
                                  {cr.plant_count && (
                                    <span className="bg-slate-100 text-slate-700 px-1 py-0.2 rounded">
                                      {parseInt(cr.plant_count, 10).toLocaleString()} ដើម
                                    </span>
                                  )}
                                  {cr.crop_age && (
                                    <span className="text-slate-400">
                                      អាយុ {cr.crop_age}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Full Address */}
                      <td className="py-2.5 px-3 max-w-[170px]">
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
          {paginatedCustomers.map(cust => {
            const hasGPS = cust.latitude && cust.longitude;
            const fullAddress = [cust.village, cust.commune, cust.district, cust.province].filter(Boolean).join(', ');
            const crops = parseCrops(cust.crops, cust.primary_crop);
            const branches = parseBranches(cust.branches, cust.branch);

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
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ភេទ៖ {cust.gender || '—'}
                        </span>
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

                  {/* Customer Branches */}
                  {branches.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 my-1.5">
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5">
                        <Building size={10} />
                        <span>សាខា៖</span>
                      </span>
                      {branches.map((b, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-bold border border-slate-200">
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Multi-Crops Badge Box */}
                  {crops.length > 0 && (
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 my-2 space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Sprout size={11} className="text-emerald-600" />
                          <span>ដំណាំ ({crops.length} មុខ)</span>
                        </span>
                        <span>
                          {crops.reduce((s, c) => s + (parseFloat(c.farm_size_ha) || 0), 0) > 0 && 
                            `${crops.reduce((s, c) => s + (parseFloat(c.farm_size_ha) || 0), 0).toFixed(1)} ហ.ត`}
                        </span>
                      </div>
                      <div className="space-y-1 pt-1">
                        {crops.map((cr, i) => (
                          <div key={i} className="text-[11px] text-slate-700 flex items-center justify-between">
                            <span className="font-bold text-emerald-900">
                              • {cr.crop_type} {cr.variety ? `(${cr.variety})` : ''}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {[
                                cr.farm_size_ha ? `${cr.farm_size_ha} ហ.ត` : null,
                                cr.plant_count ? `${cr.plant_count} ដើម` : null,
                                cr.crop_age ? `${cr.crop_age}` : null
                              ].filter(Boolean).join(' | ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

      {/* Pagination Controls */}
      {filtered.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs text-xs">
          <div className="text-slate-500 font-medium">
            បង្ហាញទំព័រទី <span className="font-bold text-slate-800">{currentPage}</span> នៃ <span className="font-bold text-slate-800">{totalPages}</span> (បង្ហាញ {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filtered.length)} នៃសរុប {filtered.length} នាក់)
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

      {/* ======================== ADD / EDIT CUSTOMER MODAL ======================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full my-6 p-5 shadow-2xl border border-slate-100 space-y-3.5 text-xs">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Edit size={16} className="text-emerald-600" />
                <span>{editingCustomer ? 'កែប្រែព័ត៌មានអតិថិជន & ដំណាំ' : 'បន្ថែមអតិថិជនថ្មី & ដំណាំ'}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
              
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

              {/* Customer Type & Custom Type & Phone */}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block">លេខទូរស័ព្ទ</label>
                    {isCheckingPhone && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-normal">
                        <Loader2 size={10} className="animate-spin text-emerald-600" />
                        <span>ផ្ទៀងផ្ទាត់...</span>
                      </span>
                    )}
                    {!isCheckingPhone && duplicateCustomer && (
                      <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                        <AlertTriangle size={10} />
                        <span>ស្ទួនលេខទូរស័ព្ទ</span>
                      </span>
                    )}
                    {!isCheckingPhone && !duplicateCustomer && normalizePhone(formPhone).length >= 8 && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        <span>ត្រឹមត្រូវ (មិនស្ទួន)</span>
                      </span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    value={formPhone} 
                    onChange={e => setFormPhone(e.target.value)} 
                    placeholder="012 345 678"
                    className={`w-full border rounded-lg p-2 text-xs font-mono transition-colors ${
                      duplicateCustomer 
                        ? 'bg-rose-50 border-rose-400 text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Warning Alert if Phone Duplicate */}
              {duplicateCustomer && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <div className="font-bold text-rose-800 flex items-center justify-between">
                        <span>លេខទូរស័ព្ទនេះមានក្នុងប្រព័ន្ធរួចហើយ! (កុំបង្កើតស្ទួន)</span>
                        <span className="text-[10px] bg-rose-200/70 text-rose-800 px-1.5 py-0.5 rounded font-mono">
                          ID: {duplicateCustomer.id.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="text-slate-700 text-xs">
                        ជារបស់អតិថិជនឈ្មោះ <span className="font-bold text-slate-900">«{duplicateCustomer.name}»</span>
                        {duplicateCustomer.phone && <span className="font-mono text-rose-700 font-bold ml-1">({duplicateCustomer.phone})</span>}
                        {duplicateCustomer.customer_type && <span className="text-slate-500 text-[11px] ml-1">[{duplicateCustomer.customer_type}]</span>}
                      </div>
                      <div className="text-slate-500 text-[11px] flex flex-wrap gap-x-2 gap-y-0.5 pt-0.5">
                        <span>ទីតាំង: {[duplicateCustomer.village, duplicateCustomer.commune, duplicateCustomer.district, duplicateCustomer.province].filter(Boolean).join(', ') || 'គ្មានបញ្ជាក់'}</span>
                        <span>• សាខា: {duplicateCustomer.branch || (Array.isArray(duplicateCustomer.branches) ? duplicateCustomer.branches.join(', ') : 'ការិយាល័យកណ្តាល')}</span>
                        {duplicateCustomer.primary_crop && <span>• ដំណាំ: {duplicateCustomer.primary_crop}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

              {/* ===================== BRANCH SELECTOR (សាខាដែលគ្រប់គ្រង) ===================== */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-700 block flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building size={14} className="text-emerald-600" />
                    <span>សាខាដែលគ្រប់គ្រង (អាចជ្រើសបានច្រើន ឬរួមគ្នារវាងសាខា) *</span>
                  </span>
                  {formBranches.length > 0 && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full font-bold">
                      {formBranches.length} សាខា
                    </span>
                  )}
                </label>

                {/* Selected branches badges */}
                {formBranches.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {formBranches.map((b, idx) => (
                      <span 
                        key={idx}
                        className="bg-white text-slate-800 border border-slate-200 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <Building size={11} className="text-emerald-600" />
                        <span>{b}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveBranch(b)}
                          className="hover:text-rose-600 p-0.5 ml-0.5"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    សូមជ្រើសរើសសាខាយ៉ាងហោចណាស់មួយ ឬជ្រើសរើសរួមគ្នារវាងសាខាច្រើន
                  </p>
                )}

                {/* Quick-pick Branch Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold">ជ្រើសរើសរហ័ស (ពីតារាងបុគ្គលិក)៖</span>
                  {staffBranches.map((b, idx) => {
                    const isSelected = formBranches.includes(b);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleBranch(b)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? <Check size={10} /> : <Plus size={10} />}
                        <span>{b}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom branch input */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="+ បញ្ចូលឈ្មោះសាខាផ្សេងទៀត..."
                    value={customBranchInput}
                    onChange={e => setCustomBranchInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomBranch();
                      }
                    }}
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomBranch}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs"
                  >
                    បន្ថែម
                  </button>
                </div>
              </div>

              {/* ===================== CROPS EDITOR (ដំណាំច្រើនប្រភេទក្នុងចំការ) ===================== */}
              <CropsEditor 
                crops={formCrops} 
                onChange={setFormCrops}
                title="ព័ត៌មានដំណាំក្នុងចំការ"
              />

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
                  disabled={isSaving || Boolean(duplicateCustomer)}
                  className={`w-1/2 py-2 font-bold rounded-xl text-xs shadow transition-colors flex items-center justify-center gap-1 ${
                    duplicateCustomer 
                      ? 'bg-rose-400 cursor-not-allowed text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {duplicateCustomer ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                  <span>
                    {duplicateCustomer 
                      ? 'មិនអាចរក្សាទុក (ស្ទួនលេខទូរស័ព្ទ)' 
                      : (isSaving ? 'កំពុងរក្សាទុក...' : (editingCustomer ? 'រក្សាទុកការកែប្រែ' : 'បន្ថែមអតិថិជន'))}
                  </span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {filtered.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs text-xs">
          <div className="text-slate-500 font-medium">
            បង្ហាញទំព័រទី <span className="font-bold text-slate-800">{currentPage}</span> នៃ <span className="font-bold text-slate-800">{totalPages}</span> (បង្ហាញ {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filtered.length)} នៃសរុប {filtered.length} នាក់)
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

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  MapPin, Camera, X, Loader2, UserPlus, CheckCircle2, 
  User, Users, Save, Navigation, Sprout, Activity, 
  AlertCircle, Package, Calendar, FileText, Edit, ExternalLink,
  Building, UserCheck, Plus, Check, RefreshCw, Sparkles, Clock
} from 'lucide-react';
import CropsEditor from './CropsEditor';
import CustomerSelectSearch from './CustomerSelectSearch';
import { parseCrops, getStaffBranches, getStaffList, normalizePhone, checkDuplicateCustomerPhone } from '../staffUtils';
import { compressMultipleImages, formatFileSize } from '../imageUtils';

export default function NewVisitModal({ 
  isOpen, 
  onClose, 
  onVisitCreated, 
  customers, 
  onCustomerCreated, 
  visitToEdit, 
  currentUser,
  staffList: propStaffList = []
}) {
  const [staffName, setStaffName] = useState(() => currentUser?.name || localStorage.getItem('sremeas_staff_name') || '');
  const [branch, setBranch] = useState(() => currentUser?.branch || 'ការិយាល័យកណ្តាល');
  const [teamMembers, setTeamMembers] = useState([]);
  const [customMemberInput, setCustomMemberInput] = useState('');
  const [staffMembers, setStaffMembers] = useState(propStaffList);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [pulledNotice, setPulledNotice] = useState('');
  
  // New Customer Fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustGender, setNewCustGender] = useState('ប្រុស');
  const [newCustType, setNewCustType] = useState('កសិករ');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustPhoneDuplicate, setNewCustPhoneDuplicate] = useState(null);
  const [isCheckingNewCustPhone, setIsCheckingNewCustPhone] = useState(false);
  const [newCustBranches, setNewCustBranches] = useState(() => [currentUser?.branch || 'ការិយាល័យកណ្តាល']);
  const [newCustVillage, setNewCustVillage] = useState('');
  const [newCustCommune, setNewCustCommune] = useState('');
  const [newCustDistrict, setNewCustDistrict] = useState('');
  const [newCustProvince, setNewCustProvince] = useState('');
  const [newCustCrops, setNewCustCrops] = useState([]);

  // Real-time verification to prevent duplicate phone numbers when adding new customer
  useEffect(() => {
    if (!showAddCustomer) {
      setNewCustPhoneDuplicate(null);
      setIsCheckingNewCustPhone(false);
      return;
    }

    const norm = normalizePhone(newCustPhone);
    if (!norm || norm.length < 8) {
      setNewCustPhoneDuplicate(null);
      setIsCheckingNewCustPhone(false);
      return;
    }

    let isMounted = true;
    setIsCheckingNewCustPhone(true);
    const timer = setTimeout(async () => {
      try {
        const found = await checkDuplicateCustomerPhone(
          newCustPhone, 
          null, 
          customers, 
          supabase
        );
        if (isMounted) {
          setNewCustPhoneDuplicate(found);
          setIsCheckingNewCustPhone(false);
        }
      } catch (err) {
        if (isMounted) setIsCheckingNewCustPhone(false);
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [newCustPhone, showAddCustomer, customers]);

  // Visit Fields
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Crops inspected in this visit
  const [visitCrops, setVisitCrops] = useState([]);
  const [cropStatus, setCropStatus] = useState('ល្អ');
  const [issuesIdentified, setIssuesIdentified] = useState('');
  const [productsRecommended, setProductsRecommended] = useState('');
  const [farmerHistory, setFarmerHistory] = useState('ស្រែមាស');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  // Photos
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [photoMeta, setPhotoMeta] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load staff list if not provided
  useEffect(() => {
    if (propStaffList && propStaffList.length > 0) {
      setStaffMembers(propStaffList);
    } else {
      getStaffList(supabase).then(list => setStaffMembers(list || []));
    }
  }, [propStaffList, isOpen]);

  // Initialize form when opened or when visitToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (visitToEdit) {
      setStaffName(visitToEdit.staff_name || '');
      setBranch(visitToEdit.branch || currentUser?.branch || 'ការិយាល័យកណ្តាល');
      
      // Parse team members
      let initialTeam = [];
      if (Array.isArray(visitToEdit.team_members)) {
        initialTeam = visitToEdit.team_members;
      } else if (typeof visitToEdit.team_members === 'string') {
        try {
          const parsed = JSON.parse(visitToEdit.team_members);
          if (Array.isArray(parsed)) initialTeam = parsed;
          else initialTeam = visitToEdit.team_members.split(',').map(s => s.trim()).filter(Boolean);
        } catch {
          initialTeam = visitToEdit.team_members.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      setTeamMembers(initialTeam);

      setSelectedCustomerId(visitToEdit.customer_id || '');
      setLatitude(visitToEdit.latitude || null);
      setLongitude(visitToEdit.longitude || null);
      setLocationAddress(visitToEdit.location_address || '');
      setVisitCrops(parseCrops(visitToEdit.crops, visitToEdit.crop_type, visitToEdit.farm_size_ha));
      setCropStatus(visitToEdit.crop_status || 'ល្អ');
      setIssuesIdentified(visitToEdit.issues_identified || '');
      setProductsRecommended(visitToEdit.products_recommended || '');
      let extractedHistory = visitToEdit.farmer_history || '';
      if (!extractedHistory && visitToEdit.notes && visitToEdit.notes.includes('[ប្រវត្តិប្រើប្រាស់]:')) {
        const m = visitToEdit.notes.match(/\[ប្រវត្តិប្រើប្រាស់\]:\s*([^\n]*)/i);
        if (m) extractedHistory = m[1].trim();
      }
      setFarmerHistory(extractedHistory || 'ស្រែមាស');
      setFollowUpDate(visitToEdit.follow_up_date || '');
      setNotes(visitToEdit.notes || '');
      setExistingPhotos(visitToEdit.photos || []);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setShowAddCustomer(false);
      setNewCustPhone('');
      setNewCustPhoneDuplicate(null);
      setIsCheckingNewCustPhone(false);
      setPulledNotice('');
    } else {
      setStaffName(currentUser?.name || localStorage.getItem('sremeas_staff_name') || '');
      setBranch(currentUser?.branch || 'ការិយាល័យកណ្តាល');
      setTeamMembers([]);
      setSelectedCustomerId('');
      setLatitude(null);
      setLongitude(null);
      setLocationAddress('');
      setVisitCrops([
        { crop_type: 'ស្វាយចន្ទី', variety: 'M23', farm_size_ha: '', plant_count: '', crop_age: '' }
      ]);
      setCropStatus('ល្អ');
      setIssuesIdentified('');
      setProductsRecommended('');
      setFarmerHistory('ស្រែមាស');
      setFollowUpDate('');
      setNotes('');
      setExistingPhotos([]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setPhotoMeta([]);
      setIsCompressing(false);
      setShowAddCustomer(false);
      setNewCustPhone('');
      setNewCustPhoneDuplicate(null);
      setIsCheckingNewCustPhone(false);
      setPulledNotice('');
      setNewCustCrops([
        { crop_type: 'ស្វាយចន្ទី', variety: 'M23', farm_size_ha: '', plant_count: '', crop_age: '' }
      ]);
      handleGetGPS();
    }
  }, [isOpen, visitToEdit, currentUser]);

  // Pull Farm Location and Crops directly from Customer Record
  const pullDataFromCustomer = (cust) => {
    if (!cust) return;

    // 1. Location Address
    const addressParts = [cust.village, cust.commune, cust.district, cust.province].filter(Boolean);
    const fullAddr = addressParts.join(', ');
    if (fullAddr) {
      setLocationAddress(fullAddr);
    } else if (cust.location_address) {
      setLocationAddress(cust.location_address);
    }

    // 2. GPS Coordinates
    if (cust.latitude && cust.longitude) {
      setLatitude(parseFloat(cust.latitude));
      setLongitude(parseFloat(cust.longitude));
    }

    // 3. Crops Info
    const custCrops = parseCrops(cust.crops, cust.primary_crop, cust.farm_size_ha);
    if (custCrops && custCrops.length > 0) {
      setVisitCrops(JSON.parse(JSON.stringify(custCrops)));
    }

    setPulledNotice(`បានទាញយកទីតាំង និងដំណាំ (${custCrops.length} មុខ) ពីទិន្នន័យអតិថិជន ${cust.name}`);
    setTimeout(() => setPulledNotice(''), 4500);
  };

  // When a customer is chosen via Search or Dropdown
  const handleSelectCustomer = (cust) => {
    if (!cust) {
      setSelectedCustomerId('');
      return;
    }
    setSelectedCustomerId(cust.id);
    if (!visitToEdit) {
      pullDataFromCustomer(cust);
    }
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert("ទូរស័ព្ទ ឬ Browser របស់អ្នកមិនគាំទ្រ GPS ទេ!");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGettingLocation(false);
      },
      (err) => {
        console.warn("GPS Error:", err.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Team Member handling
  const handleToggleTeamMember = (name) => {
    if (!name) return;
    setTeamMembers(prev => 
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    );
  };

  const handleAddCustomMember = () => {
    const val = customMemberInput.trim();
    if (!val) return;
    if (!teamMembers.includes(val)) {
      setTeamMembers(prev => [...prev, val]);
    }
    setCustomMemberInput('');
  };

  const handleRemoveTeamMember = (name) => {
    setTeamMembers(prev => prev.filter(m => m !== name));
  };

  const handlePhotoSelect = async (e) => {
    const rawFiles = Array.from(e.target.files);
    if (!rawFiles.length) return;

    // Reset input to allow selecting same file again if removed
    e.target.value = '';

    setIsCompressing(true);
    try {
      // Compress images client-side before upload: max 1280px, JPEG quality 0.72
      const results = await compressMultipleImages(rawFiles, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.72
      });

      const newFiles = results.map(r => r.file);
      const newPreviews = results.map(r => r.previewUrl);
      const newMeta = results.map(r => ({
        originalSize: r.originalSize,
        compressedSize: r.compressedSize,
        savingsPercent: r.savingsPercent
      }));

      setPhotoFiles(prev => [...prev, ...newFiles]);
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
      setPhotoMeta(prev => [...prev, ...newMeta]);
    } catch (err) {
      console.error("Image compression error:", err);
      // Fallback gracefully to raw files
      setPhotoFiles(prev => [...prev, ...rawFiles]);
      const previews = rawFiles.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...previews]);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveNewPhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    setPhotoMeta(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingPhoto = (index) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Create new customer directly inside visit modal
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) return alert("សូមបញ្ចូលឈ្មោះអតិថិជន!");

    // Verify phone number to prevent duplicate customer
    if (newCustPhone.trim()) {
      const duplicate = await checkDuplicateCustomerPhone(newCustPhone, null, customers, supabase);
      if (duplicate) {
        setNewCustPhoneDuplicate(duplicate);
        alert(`មិនអាចបង្កើតអតិថិជនថ្មីបានទេ!\n\nលេខទូរស័ព្ទ «${newCustPhone}» នេះមានរួចហើយ ជារបស់អតិថិជនឈ្មោះ «${duplicate.name}» (${duplicate.phone || ''})។\n\nលោកអ្នកអាចចុចប៊ូតុង «ជ្រើសរើសយក ${duplicate.name} នេះ» ដើម្បីបន្តការចុះចំការដោយមិនបង្កើតទិន្នន័យស្ទួន។`);
        return;
      }
    }

    const primaryCropString = newCustCrops.map(c => c.crop_type).filter(Boolean).join(', ') || null;
    const primaryBranchString = newCustBranches.join(', ') || null;

    const payload = {
      name: newCustName.trim(),
      gender: newCustGender || 'ប្រុស',
      customer_type: newCustType || 'កសិករ',
      phone: newCustPhone.trim() || null,
      branches: newCustBranches,
      branch: primaryBranchString,
      village: newCustVillage.trim() || null,
      commune: newCustCommune.trim() || null,
      district: newCustDistrict.trim() || null,
      province: newCustProvince.trim() || null,
      primary_crop: primaryCropString,
      crops: newCustCrops,
      latitude: latitude || null,
      longitude: longitude || null
    };

    try {
      let createdCustomer = null;
      let { data, error } = await supabase.from('customers').insert([payload]).select().single();
      
      if (error && (error.message.includes('column') || error.code === 'PGRST204' || error.code === '42703')) {
        const { branches: _br, branch: _b, ...payloadNoBranch } = payload;
        const res2 = await supabase.from('customers').insert([payloadNoBranch]).select().single();
        if (!res2.error) {
          createdCustomer = { ...res2.data, ...payload };
        } else {
          const fallbackPayload = {
            name: newCustName.trim(),
            phone: newCustPhone.trim() || null,
            village: newCustVillage.trim() || null,
            province: newCustProvince.trim() || null,
            primary_crop: primaryCropString
          };
          const { data: fbData, error: fbErr } = await supabase.from('customers').insert([fallbackPayload]).select().single();
          if (fbErr) throw fbErr;
          createdCustomer = { ...fbData, ...payload };
        }
      } else if (error) {
        throw error;
      } else {
        createdCustomer = data;
      }

      alert("បង្កើតអតិថិជនជោគជ័យ!");
      onCustomerCreated(createdCustomer);
      setSelectedCustomerId(createdCustomer.id);
      pullDataFromCustomer(createdCustomer);
      setShowAddCustomer(false);
    } catch (err) {
      alert("មិនអាចបង្កើតអតិថិជនបានទេ: " + err.message);
    }
  };

  // Helper for saving with progressive schema fallbacks
  const saveVisitToSupabase = async (payload, visitId = null) => {
    // Attempt 1: full payload
    let res;
    if (visitId) {
      res = await supabase.from('field_visits').update(payload).eq('id', visitId).select().single();
    } else {
      res = await supabase.from('field_visits').insert([payload]).select().single();
    }
    if (!res.error) return res.data;

    // Attempt 2: fallback without branch, team_members & farmer_history if columns do not exist
    if (res.error.message?.includes('column') || res.error.code === 'PGRST204' || res.error.code === '42703') {
      const { farmer_history: _fh, branch: _b, team_members: _tm, ...payloadNoBranch } = payload;
      let res2;
      if (visitId) {
        res2 = await supabase.from('field_visits').update(payloadNoBranch).eq('id', visitId).select().single();
      } else {
        res2 = await supabase.from('field_visits').insert([payloadNoBranch]).select().single();
      }
      if (!res2.error) return { ...res2.data, ...payload };

      // Attempt 3: fallback without crops column as well
      if (res2.error.message?.includes('column') || res2.error.code === 'PGRST204' || res2.error.code === '42703') {
        const { crops: _c, ...payloadLegacy } = payloadNoBranch;
        let res3;
        if (visitId) {
          res3 = await supabase.from('field_visits').update(payloadLegacy).eq('id', visitId).select().single();
        } else {
          res3 = await supabase.from('field_visits').insert([payloadLegacy]).select().single();
        }
        if (!res3.error) return { ...res3.data, ...payload };
        throw res3.error;
      }
      throw res2.error;
    }
    throw res.error;
  };

  // Submit Visit
  const handleSubmitVisit = async (e) => {
    e.preventDefault();
    if (!staffName.trim()) return alert("សូមបញ្ចូលឈ្មោះបុគ្គលិក!");
    if (!selectedCustomerId) return alert("សូមជ្រើសរើស ឬបន្ថែមអតិថិជន!");

    setIsSubmitting(true);
    localStorage.setItem('sremeas_staff_name', staffName.trim());

    try {
      // 1. Upload new photos to Supabase Storage
      const uploadedUrls = [];
      for (const file of photoFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `visits/${fileName}`;

        const { error: uploadErr } = await supabase.storage.from('visit-photos').upload(filePath, file);
        if (uploadErr) {
          console.error("Upload error:", uploadErr);
        } else {
          const { data: pubData } = supabase.storage.from('visit-photos').getPublicUrl(filePath);
          if (pubData?.publicUrl) uploadedUrls.push(pubData.publicUrl);
        }
      }

      const allPhotos = [...existingPhotos, ...uploadedUrls];

      // Primary crop name and total size for backward compatibility
      const primaryCropType = visitCrops.map(c => c.crop_type).filter(Boolean).join(', ') || null;
      const totalHa = visitCrops.reduce((sum, c) => sum + (parseFloat(c.farm_size_ha) || 0), 0) || null;

      // Combine notes with farmerHistory so it's persisted in notes column as well
      let combinedNotes = notes.trim();
      if (farmerHistory.trim()) {
        combinedNotes = combinedNotes 
          ? `[ប្រវត្តិប្រើប្រាស់]: ${farmerHistory.trim()}\n${combinedNotes}` 
          : `[ប្រវត្តិប្រើប្រាស់]: ${farmerHistory.trim()}`;
      }

      // 2. Full Visit Payload
      const payload = {
        staff_name: staffName.trim(),
        branch: branch.trim() || null,
        team_members: teamMembers,
        customer_id: selectedCustomerId,
        latitude: latitude || null,
        longitude: longitude || null,
        location_address: locationAddress.trim() || null,
        crop_type: primaryCropType,
        farm_size_ha: totalHa,
        crops: visitCrops,
        crop_status: cropStatus.trim() || 'ល្អ',
        issues_identified: issuesIdentified.trim() || null,
        products_recommended: productsRecommended.trim() || null,
        farmer_history: farmerHistory.trim() || null,
        follow_up_date: followUpDate || null,
        photos: allPhotos,
        notes: combinedNotes || null
      };

      const savedData = await saveVisitToSupabase(payload, visitToEdit?.id);

      const customerObj = customers.find(c => c.id === selectedCustomerId);
      const visitWithCustomer = {
        ...savedData,
        farmer_history: farmerHistory.trim() || null,
        customers: customerObj || null
      };

      alert(visitToEdit ? "បានកែប្រែកំណត់ត្រាជោគជ័យ!" : "កត់ត្រាការចុះចំការបានជោគជ័យ!");
      onVisitCreated(savedData);
      onClose();
    } catch (err) {
      alert("មានបញ្ហាក្នុងការរក្សាទុក: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filter available colleagues from staff members (exclude primary staff name)
  const availableColleagues = staffMembers.filter(s => s.name !== staffName);

  // Distinct branches list STRICTLY from staff table
  const branchOptions = getStaffBranches(staffMembers);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl my-8 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 text-white ${visitToEdit ? 'bg-slate-900' : 'bg-emerald-600'}`}>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-white/10">
              {visitToEdit ? <Edit size={18} /> : <Sprout size={18} />}
            </span>
            <div>
              <h3 className="font-bold text-sm md:text-base leading-tight">
                {visitToEdit ? 'កែប្រែកំណត់ត្រាចុះចំការ' : 'កត់ត្រាការចុះចំការថ្មី'}
              </h3>
              <p className="text-[10px] text-white/80 font-medium">ស្រែមាន - ប្រព័ន្ធតាមដានការងារចុះចំការ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/20 text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Pulled from Customer Notification Banner */}
        {pulledNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-emerald-800 text-xs font-bold animate-fadeIn">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>{pulledNotice}</span>
            </span>
            <button onClick={() => setPulledNotice('')} className="text-emerald-600 hover:text-emerald-900">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4 text-xs">

          {/* ===================== SECTION 1: STAFF & BRANCH ===================== */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Staff Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <User size={13} className="text-emerald-600" />
                  <span>បុគ្គលិកចុះផ្ទាល់ *</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={staffName} 
                  onChange={e => setStaffName(e.target.value)} 
                  placeholder="ឈ្មោះបុគ្គលិក..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              {/* Branch */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Building size={13} className="text-emerald-600" />
                  <span>សាខា *</span>
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    list="branch-list-options"
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    placeholder="ជ្រើសរើស ឬបញ្ចូលសាខា..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <datalist id="branch-list-options">
                    {branchOptions.map((b, idx) => (
                      <option key={idx} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

            </div>

            {/* Team Members / Accompanied Staff */}
            <div className="pt-2 border-t border-slate-200/80">
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Users size={13} className="text-emerald-600" />
                  <span>ក្រុមការងារចុះជាមួយ (អ្នកដែលបានទៅជាមួយ)</span>
                </span>
                {teamMembers.length > 0 && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full font-bold">
                    {teamMembers.length} នាក់
                  </span>
                )}
              </label>

              {/* Selected Team Members Badges */}
              {teamMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {teamMembers.map((member, idx) => (
                    <span 
                      key={idx} 
                      className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <UserCheck size={11} className="text-emerald-600" />
                      <span>{member}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTeamMember(member)}
                        className="hover:text-rose-600 p-0.5 ml-0.5"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Quick-Pick Registered Colleagues */}
              {availableColleagues.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[10px] text-slate-400 font-bold">បុគ្គលិកក្នុងបញ្ជី៖</span>
                  {availableColleagues.slice(0, 8).map(staff => {
                    const isSelected = teamMembers.includes(staff.name);
                    return (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => handleToggleTeamMember(staff.name)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? <Check size={10} /> : <Plus size={10} />}
                        <span>{staff.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Add Custom / Unregistered Team Member Input */}
              <div className="flex items-center gap-1.5">
                <input 
                  type="text" 
                  placeholder="+ បញ្ចូលឈ្មោះអ្នករួមដំណើរផ្សេងទៀត (បើមាន)..." 
                  value={customMemberInput}
                  onChange={e => setCustomMemberInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomMember();
                    }
                  }}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAddCustomMember}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs"
                >
                  បន្ថែម
                </button>
              </div>
            </div>

          </div>

          {/* ===================== SECTION 2: CUSTOMER / FARMER SELECTION WITH SEARCH ===================== */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Users size={14} className="text-emerald-700" />
                <span>អតិថិជន / ម្ចាស់ចំការ *</span>
              </label>

              {!visitToEdit && (
                <button 
                  type="button" 
                  onClick={() => setShowAddCustomer(!showAddCustomer)} 
                  className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 text-xs hover:underline"
                >
                  <UserPlus size={13} />
                  <span>{showAddCustomer ? 'ត្រឡប់ទៅជ្រើសរើស' : '+ បង្កើតអតិថិជនថ្មី'}</span>
                </button>
              )}
            </div>

            {showAddCustomer ? (
              /* Inline Add New Customer Form */
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-3 gap-2">
                  <input 
                    type="text" 
                    placeholder="ឈ្មោះអតិថិជន *" 
                    value={newCustName} 
                    onChange={e => setNewCustName(e.target.value)}
                    className="col-span-2 w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                  <select
                    value={newCustGender}
                    onChange={e => setNewCustGender(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold"
                  >
                    <option value="ប្រុស">ប្រុស</option>
                    <option value="ស្រី">ស្រី</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newCustType}
                    onChange={e => setNewCustType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold"
                  >
                    <option value="កសិករ">កសិករ</option>
                    <option value="ដេប៉ូ">ដេប៉ូ</option>
                    <option value="ផ្សេងៗ">ផ្សេងៗ</option>
                  </select>
                  <div>
                    <input 
                      type="text" 
                      placeholder="លេខទូរស័ព្ទ (ឧ. 012 345 678)" 
                      value={newCustPhone} 
                      onChange={e => setNewCustPhone(e.target.value)}
                      className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs font-mono transition-colors ${
                        newCustPhoneDuplicate 
                          ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500' 
                          : 'border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500'
                      }`}
                    />
                    {isCheckingNewCustPhone && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-normal mt-0.5">
                        <Loader2 size={10} className="animate-spin text-emerald-600" />
                        <span>ផ្ទៀងផ្ទាត់លេខ...</span>
                      </span>
                    )}
                    {!isCheckingNewCustPhone && !newCustPhoneDuplicate && normalizePhone(newCustPhone).length >= 8 && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={10} />
                        <span>លេខអាចប្រើបាន</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Warning Card if duplicate phone detected */}
                {newCustPhoneDuplicate && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-2 animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-slate-700 flex-1">
                        <span className="font-bold text-rose-800 block">លេខទូរស័ព្ទនេះមានក្នុងប្រព័ន្ធរួចហើយ! (កុំបង្កើតស្ទួន)</span>
                        ជារបស់អតិថិជនឈ្មោះ <span className="font-bold text-slate-900">«{newCustPhoneDuplicate.name}»</span>
                        {newCustPhoneDuplicate.phone && <span className="font-mono text-rose-700 font-bold ml-1">({newCustPhoneDuplicate.phone})</span>}
                        {newCustPhoneDuplicate.customer_type && <span className="text-slate-500 text-[10px] ml-1">[{newCustPhoneDuplicate.customer_type}]</span>}
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          ទីតាំង: {[newCustPhoneDuplicate.village, newCustPhoneDuplicate.commune, newCustPhoneDuplicate.district, newCustPhoneDuplicate.province].filter(Boolean).join(', ') || 'គ្មានបញ្ជាក់'}
                          {newCustPhoneDuplicate.branch && ` • សាខា: ${newCustPhoneDuplicate.branch}`}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(newCustPhoneDuplicate.id);
                        pullDataFromCustomer(newCustPhoneDuplicate);
                        setShowAddCustomer(false);
                        setNewCustPhoneDuplicate(null);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-md text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <UserCheck size={13} />
                      <span>ជ្រើសរើសយក «{newCustPhoneDuplicate.name}» នេះសម្រាប់ការចុះចំការភ្លាមៗ</span>
                    </button>
                  </div>
                )}

                {/* Branch selector for new customer */}
                <div className="p-2 bg-slate-100/80 rounded-lg space-y-1 text-xs">
                  <label className="font-bold text-slate-700 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1">
                      <Building size={12} className="text-emerald-600" />
                      <span>សាខាអតិថិជន (អាចជ្រើសបានច្រើន)</span>
                    </span>
                    {newCustBranches.length > 0 && (
                      <span className="text-[10px] text-emerald-800 font-bold bg-white px-1.5 py-0.2 rounded border border-emerald-200">
                        {newCustBranches.length} សាខា
                      </span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {branchOptions.map((b, idx) => {
                      const isSel = newCustBranches.includes(b);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewCustBranches(prev => 
                            prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
                          )}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                            isSel ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isSel ? <Check size={10} /> : <Plus size={10} />}
                          <span>{b}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Crops for new customer */}
                <CropsEditor
                  crops={newCustCrops}
                  onChange={setNewCustCrops}
                  title="ដំណាំរបស់អតិថិជនថ្មី"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="ភូមិ" 
                    value={newCustVillage} 
                    onChange={e => setNewCustVillage(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                  <input 
                    type="text" 
                    placeholder="ឃុំ / សង្កាត់" 
                    value={newCustCommune} 
                    onChange={e => setNewCustCommune(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="ស្រុក / ខណ្ឌ" 
                    value={newCustDistrict} 
                    onChange={e => setNewCustDistrict(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                  <input 
                    type="text" 
                    placeholder="ខេត្ត / រាជធានី" 
                    value={newCustProvince} 
                    onChange={e => setNewCustProvince(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>

                <button 
                  type="button" 
                  onClick={handleCreateCustomer}
                  disabled={Boolean(newCustPhoneDuplicate)}
                  className={`w-full font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 ${
                    newCustPhoneDuplicate 
                      ? 'bg-rose-400 cursor-not-allowed text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {newCustPhoneDuplicate ? <AlertCircle size={13} /> : <Save size={13} />}
                  <span>{newCustPhoneDuplicate ? 'មិនអាចបង្កើត (ស្ទួនលេខទូរស័ព្ទ)' : 'រក្សាទុកអតិថិជនថ្មី & ទាញយកទិន្នន័យ'}</span>
                </button>
              </div>
            ) : (
              /* Searchable Customer Combobox */
              <CustomerSelectSearch
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={handleSelectCustomer}
                onAddNewCustomerClick={() => setShowAddCustomer(true)}
                onResyncCustomerData={pullDataFromCustomer}
              />
            )}
          </div>

          {/* ===================== SECTION 3: LOCATION & GPS ===================== */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <MapPin size={14} className="text-rose-500" />
                <span>ទីតាំងចំការជាក់ស្តែង (GPS & អាសយដ្ឋាន)</span>
              </span>
              <button 
                type="button" 
                onClick={handleGetGPS} 
                disabled={gettingLocation}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>កំពុងចាប់យក GPS...</span>
                  </>
                ) : (
                  <>
                    <Navigation size={12} />
                    <span>ចាប់យក GPS បច្ចុប្បន្ន</span>
                  </>
                )}
              </button>
            </div>

            {latitude && longitude ? (
              <div className="text-emerald-800 font-mono text-[11px] font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex justify-between items-center">
                <span>Lat: {latitude.toFixed(6)}, Long: {longitude.toFixed(6)}</span>
                <a 
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-600 underline font-sans text-[10px] inline-flex items-center gap-0.5"
                >
                  <span>មើលលើ Maps</span>
                  <ExternalLink size={9} />
                </a>
              </div>
            ) : (
              <p className="text-slate-400 text-[11px]">មិនទាន់មានកូអរដោនេ GPS (ចុច "ចាប់យក GPS បច្ចុប្បន្ន")</p>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-0.5">អាសយដ្ឋាន / ចំណុចសម្គាល់ចំការ៖</label>
              <input 
                type="text" 
                placeholder="អាសយដ្ឋានចំការ (ទាញយកពីអតិថិជន ឬកែប្រែដោយផ្ទាល់)..." 
                value={locationAddress} 
                onChange={e => setLocationAddress(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* ===================== SECTION 4: CROPS INSPECTED ===================== */}
          <CropsEditor
            crops={visitCrops}
            onChange={setVisitCrops}
            title="ព័ត៌មានដំណាំដែលបានចុះពិនិត្យ (ទាញយកពីអតិថិជន)"
          />

          {/* ===================== SECTION 5: CROP STATUS ===================== */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Activity size={13} className="text-slate-500" />
                <span>ស្ថានភាពទូទៅនៃចម្ការ</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                (ជ្រើសរើស ឬវាយបញ្ចូលលម្អិត)
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2 mb-1.5">
              {['ល្អ', 'មធ្យម', 'មានបញ្ហា/ជំងឺ'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setCropStatus(status)}
                  className={`py-1.5 px-2 rounded-lg font-bold text-xs text-center border transition-all ${
                    cropStatus === status
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <input 
              type="text" 
              value={cropStatus} 
              onChange={e => setCropStatus(e.target.value)} 
              placeholder="ឧ. ស្លឹកចាស់ល្អស្មើគ្នា តែមានសញ្ញាត្រួយ ចេញមកតិចតួច..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
            />
          </div>

          {/* Issues & Products */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <AlertCircle size={13} className="text-amber-500" />
              <span>បញ្ហាប្រឈម</span>
            </label>
            <input 
              type="text" 
              value={issuesIdentified} 
              onChange={e => setIssuesIdentified(e.target.value)} 
              placeholder="ឧ. ពីងពាងក្រហម, កើតជំងឺតាមគល់, ចៃស្រកា..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Package size={13} className="text-slate-500" />
              <span>ដំណោះស្រាយ (ផលិតផលណែនាំ / វិធានការ)</span>
            </label>
            <input 
              type="text" 
              value={productsRecommended} 
              onChange={e => setProductsRecommended(e.target.value)} 
              placeholder="ឧ. ផ្តាច់ទឹកបន្ត, បាញ់ ប៉ារីដា, ស្រោច កាឡាក់សុី, អាបា..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FileText size={13} className="text-slate-500" />
              <span>ប្រវត្តិប្រើប្រាស់របស់កសិករ</span>
            </label>
            <input 
              type="text" 
              value={farmerHistory} 
              onChange={e => setFarmerHistory(e.target.value)} 
              placeholder="ឧ. ស្រែមាស, ធ្លាប់ប្រើជី..., ធ្លាប់ប្រើថ្នាំ..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
            />
          </div>

          {/* Photos Upload & Existing Photos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 flex items-center gap-1 text-xs">
                <Camera size={13} className="text-slate-500" />
                <span>រូបភាពចំការ</span>
              </label>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 font-medium">
                <Clock size={10} />
                <span>រក្សាទុក ៧ថ្ងៃ</span>
              </span>
            </div>
            
            {/* Existing Photos (if editing) */}
            {existingPhotos.length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">រូបភាពដែលមានស្រាប់៖</span>
                <div className="grid grid-cols-3 gap-2">
                  {existingPhotos.map((url, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square group">
                      <img src={url} alt={`Existing ${idx}`} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveExistingPhoto(idx)} 
                        title="លុបរូបភាពនេះ"
                        className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full shadow hover:bg-rose-700 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Compression Savings Banner */}
            {photoFiles.length > 0 && photoMeta.length > 0 && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-[11px] text-emerald-800 font-semibold mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-600 shrink-0" />
                  <span>
                    បន្ថយទំហំរួច៖ {formatFileSize(photoMeta.reduce((s, m) => s + (m.originalSize || 0), 0))} មកសល់ {formatFileSize(photoMeta.reduce((s, m) => s + (m.compressedSize || 0), 0))}
                  </span>
                </div>
                <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0">
                  សន្សំ -{Math.round(((photoMeta.reduce((s, m) => s + (m.originalSize || 0), 0) - photoMeta.reduce((s, m) => s + (m.compressedSize || 0), 0)) / (photoMeta.reduce((s, m) => s + (m.originalSize || 0), 0) || 1)) * 100)}%
                </span>
              </div>
            )}

            {isCompressing ? (
              <div className="flex items-center justify-center gap-2 border-2 border-emerald-300 bg-emerald-50 rounded-xl p-3 text-emerald-800 font-bold text-xs animate-pulse">
                <RefreshCw size={16} className="animate-spin text-emerald-600" />
                <span>កំពុងបន្ថយទំហំ និងគុណភាពរូបភាព (Compressing)...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl p-3 cursor-pointer text-emerald-700 font-bold text-xs transition-colors">
                  <Camera size={18} />
                  <span>+ ថែមរូបភាពថ្មី (បន្ថយទំហំស្វ័យប្រវត្តិ)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={handlePhotoSelect} 
                    className="hidden" 
                  />
                </label>
              </div>
            )}

            {/* New Photo Previews */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {photoPreviews.map((src, idx) => {
                  const meta = photoMeta[idx];
                  return (
                    <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square group">
                      <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveNewPhoto(idx)} 
                        className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full shadow hover:bg-rose-700 transition-colors z-10"
                      >
                        <X size={12} />
                      </button>
                      {meta && (
                        <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[9px] px-1 py-0.5 text-center font-mono truncate">
                          {formatFileSize(meta.compressedSize)} (-{meta.savingsPercent}%)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <Clock size={12} className="text-amber-600 shrink-0" />
              <span>រូបភាពត្រូវបានបន្ថយទំហំស្វ័យប្រវត្តិដើម្បី Upload លឿន និងលុបចេញពីប្រព័ន្ធក្រោយរយៈពេល ៧ថ្ងៃ។</span>
            </div>
          </div>

          {/* Follow-up Date & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar size={13} className="text-slate-500" />
                <span>ថ្ងៃត្រូវចុះម្តងទៀត</span>
              </label>
              <input 
                type="date" 
                value={followUpDate} 
                onChange={e => setFollowUpDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <FileText size={13} className="text-slate-500" />
                <span>ចំណាំបន្ថែម</span>
              </label>
              <input 
                type="text" 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                placeholder="ចំណាំផ្សេងៗ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button 
              type="button" 
              onClick={handleSubmitVisit} 
              disabled={isSubmitting}
              className={`w-full text-white font-bold py-2.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 ${
                visitToEdit ? 'bg-slate-900 hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>កំពុងរក្សាទុក...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{visitToEdit ? 'រក្សាទុកការកែប្រែ' : 'រក្សាទុកកំណត់ត្រាចុះចំការ'}</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

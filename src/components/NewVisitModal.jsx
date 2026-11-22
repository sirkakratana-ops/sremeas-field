import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  MapPin, Camera, X, Loader2, UserPlus, CheckCircle2, 
  User, Users, Save, Navigation, Sprout, Activity, 
  AlertCircle, Package, Calendar, FileText, Edit, ExternalLink 
} from 'lucide-react';
import CropsEditor from './CropsEditor';
import { parseCrops } from '../staffUtils';

export default function NewVisitModal({ isOpen, onClose, onVisitCreated, customers, onCustomerCreated, visitToEdit, currentUser }) {
  const [staffName, setStaffName] = useState(() => currentUser?.name || localStorage.getItem('sremeas_staff_name') || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  
  // New Customer Fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustGender, setNewCustGender] = useState('ប្រុស');
  const [newCustType, setNewCustType] = useState('កសិករ');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustVillage, setNewCustVillage] = useState('');
  const [newCustCommune, setNewCustCommune] = useState('');
  const [newCustDistrict, setNewCustDistrict] = useState('');
  const [newCustProvince, setNewCustProvince] = useState('');
  const [newCustCrops, setNewCustCrops] = useState([]);

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
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  // Photos
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when opened or when visitToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (visitToEdit) {
      setStaffName(visitToEdit.staff_name || '');
      setSelectedCustomerId(visitToEdit.customer_id || '');
      setLatitude(visitToEdit.latitude || null);
      setLongitude(visitToEdit.longitude || null);
      setLocationAddress(visitToEdit.location_address || '');
      setVisitCrops(parseCrops(visitToEdit.crops, visitToEdit.crop_type, visitToEdit.farm_size_ha));
      setCropStatus(visitToEdit.crop_status || 'ល្អ');
      setIssuesIdentified(visitToEdit.issues_identified || '');
      setProductsRecommended(visitToEdit.products_recommended || '');
      setFollowUpDate(visitToEdit.follow_up_date || '');
      setNotes(visitToEdit.notes || '');
      setExistingPhotos(visitToEdit.photos || []);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setShowAddCustomer(false);
    } else {
      setStaffName(currentUser?.name || localStorage.getItem('sremeas_staff_name') || '');
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
      setFollowUpDate('');
      setNotes('');
      setExistingPhotos([]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setShowAddCustomer(false);
      setNewCustCrops([
        { crop_type: 'ស្វាយចន្ទី', variety: 'M23', farm_size_ha: '', plant_count: '', crop_age: '' }
      ]);
      handleGetGPS();
    }
  }, [isOpen, visitToEdit, currentUser]);

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

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setPhotoFiles(prev => [...prev, ...files]);
    const previews = files.map(file => URL.createObjectURL(file));
    setPhotoPreviews(prev => [...prev, ...previews]);
  };

  const handleRemoveNewPhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingPhoto = (index) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) return alert("សូមបញ្ចូលឈ្មោះអតិថិជន!");

    const primaryCropString = newCustCrops.map(c => c.crop_type).filter(Boolean).join(', ') || null;

    const payload = {
      name: newCustName.trim(),
      gender: newCustGender || 'ប្រុស',
      customer_type: newCustType || 'កសិករ',
      phone: newCustPhone.trim() || null,
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
      const { data, error } = await supabase.from('customers').insert([payload]).select().single();
      if (error) {
        if (error.message.includes('column') || error.code === 'PGRST204') {
          const fallbackPayload = {
            name: newCustName.trim(),
            phone: newCustPhone.trim() || null,
            village: newCustVillage.trim() || null,
            province: newCustProvince.trim() || null,
            primary_crop: primaryCropString
          };
          const { data: fbData, error: fbErr } = await supabase.from('customers').insert([fallbackPayload]).select().single();
          if (fbErr) throw fbErr;
          alert("បង្កើតអតិថិជនជោគជ័យ!");
          onCustomerCreated({ ...fbData, ...payload });
          setSelectedCustomerId(fbData.id);
        } else {
          throw error;
        }
      } else {
        alert("បង្កើតអតិថិជនជោគជ័យ!");
        onCustomerCreated(data);
        setSelectedCustomerId(data.id);
      }

      if (newCustCrops.length > 0) {
        setVisitCrops(newCustCrops);
      }
      const fullAddr = [payload.village, payload.commune, payload.district, payload.province].filter(Boolean).join(' ');
      if (fullAddr && !locationAddress) setLocationAddress(fullAddr);
      setShowAddCustomer(false);
    } catch (err) {
      alert("មិនអាចបង្កើតអតិថិជនបានទេ: " + err.message);
    }
  };

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

      // 2. Insert or Update field_visit
      const payload = {
        staff_name: staffName.trim(),
        customer_id: selectedCustomerId,
        latitude: latitude || null,
        longitude: longitude || null,
        location_address: locationAddress.trim() || null,
        crop_type: primaryCropType,
        farm_size_ha: totalHa,
        crops: visitCrops,
        crop_status: cropStatus,
        issues_identified: issuesIdentified.trim() || null,
        products_recommended: productsRecommended.trim() || null,
        follow_up_date: followUpDate || null,
        photos: allPhotos,
        notes: notes.trim() || null
      };

      if (visitToEdit) {
        const { data, error } = await supabase.from('field_visits').update(payload).eq('id', visitToEdit.id).select().single();
        if (error) {
          if (error.message.includes('column') || error.code === 'PGRST204') {
            // Retry without crops column
            const { crops: _, ...fallbackPayload } = payload;
            const { data: fbData, error: fbErr } = await supabase.from('field_visits').update(fallbackPayload).eq('id', visitToEdit.id).select().single();
            if (fbErr) throw fbErr;
            alert("បានកែប្រែកំណត់ត្រាជោគជ័យ!");
            onVisitCreated({ ...fbData, crops: visitCrops });
          } else {
            throw error;
          }
        } else {
          alert("បានកែប្រែកំណត់ត្រាជោគជ័យ!");
          onVisitCreated(data);
        }
      } else {
        const { data, error } = await supabase.from('field_visits').insert([payload]).select().single();
        if (error) {
          if (error.message.includes('column') || error.code === 'PGRST204') {
            const { crops: _, ...fallbackPayload } = payload;
            const { data: fbData, error: fbErr } = await supabase.from('field_visits').insert([fallbackPayload]).select().single();
            if (fbErr) throw fbErr;
            alert("កត់ត្រាការចុះចំការបានជោគជ័យ!");
            onVisitCreated({ ...fbData, crops: visitCrops });
          } else {
            throw error;
          }
        } else {
          alert("កត់ត្រាការចុះចំការបានជោគជ័យ!");
          onVisitCreated(data);
        }
      }

      onClose();
    } catch (err) {
      alert("មានបញ្ហាក្នុងការរក្សាទុក: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg my-8 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 text-white ${visitToEdit ? 'bg-slate-900' : 'bg-emerald-600'}`}>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-white/10">
              {visitToEdit ? <Edit size={18} /> : <Sprout size={18} />}
            </span>
            <h3 className="font-bold text-base">
              {visitToEdit ? 'កែប្រែកំណត់ត្រាចុះចំការ' : 'កត់ត្រាការចុះចំការថ្មី'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/20 text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4 text-xs">

          {/* Staff Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <User size={13} className="text-slate-500" />
              <span>ឈ្មោះបុគ្គលិកចុះផ្ទាល់ *</span>
            </label>
            <input 
              type="text" 
              required 
              value={staffName} 
              onChange={e => setStaffName(e.target.value)} 
              placeholder="ឈ្មោះរបស់អ្នក..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Customer Selection or Add Customer */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Users size={13} className="text-slate-500" />
                <span>អតិថិជន / ម្ចាស់ចំការ *</span>
              </label>
              {!visitToEdit && (
                <button 
                  type="button" 
                  onClick={() => setShowAddCustomer(!showAddCustomer)} 
                  className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline"
                >
                  <UserPlus size={14} />
                  {showAddCustomer ? 'ជ្រើសរើសដែលមានស្រាប់' : '+ បន្ថែមថ្មី'}
                </button>
              )}
            </div>

            {showAddCustomer ? (
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
                  <input 
                    type="text" 
                    placeholder="លេខទូរស័ព្ទ" 
                    value={newCustPhone} 
                    onChange={e => setNewCustPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                  />
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
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save size={13} />
                  <span>រក្សាទុកអតិថិជនថ្មី</span>
                </button>
              </div>
            ) : (
              <select 
                value={selectedCustomerId} 
                onChange={e => {
                  setSelectedCustomerId(e.target.value);
                  const cust = customers.find(c => c.id === e.target.value);
                  if (cust && !visitToEdit) {
                    const custCrops = parseCrops(cust.crops, cust.primary_crop);
                    if (custCrops.length > 0) {
                      setVisitCrops(custCrops);
                    }
                    const fullAddr = [cust.village, cust.commune, cust.district, cust.province].filter(Boolean).join(' ');
                    if (fullAddr && !locationAddress) {
                      setLocationAddress(fullAddr);
                    }
                    if (cust.latitude && cust.longitude && !latitude) {
                      setLatitude(cust.latitude);
                      setLongitude(cust.longitude);
                    }
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800"
              >
                <option value="">-- ជ្រើសរើសអតិថិជន --</option>
                {customers.map(c => {
                  const crops = parseCrops(c.crops, c.primary_crop);
                  const cropsDesc = crops.map(cr => cr.crop_type).filter(Boolean).join(', ');
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} {cropsDesc ? `• ដំណាំ៖ ${cropsDesc}` : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* GPS Check-in */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <MapPin size={14} className="text-rose-500" /> ទីតាំងចំការជាក់ស្តែង (GPS)
              </span>
              <button 
                type="button" 
                onClick={handleGetGPS} 
                disabled={gettingLocation}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>កំពុងចាប់យក GPS...</span>
                  </>
                ) : (
                  <>
                    <Navigation size={12} />
                    <span>ចាប់យក GPS ឡើងវិញ</span>
                  </>
                )}
              </button>
            </div>

            {latitude && longitude ? (
              <div className="text-emerald-700 font-mono text-[11px] font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex justify-between items-center">
                <span>Lat: {latitude.toFixed(5)}, Long: {longitude.toFixed(5)}</span>
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
              <p className="text-slate-400 text-[11px]">មិនទាន់ចាប់បានទីតាំងនៅឡើយ (សូមចុចប៊ូតុង "ចាប់យក GPS")</p>
            )}

            <input 
              type="text" 
              placeholder="អាសយដ្ឋាន/ចំណុចសម្គាល់ចំការ (ឧ. ភូមិអូររំចេក ជិតវត្ត...)" 
              value={locationAddress} 
              onChange={e => setLocationAddress(e.target.value)}
              className="mt-2 w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
            />
          </div>

          {/* ===================== CROPS EDITOR (ព័ត៌មានដំណាំដែលបានចុះពិនិត្យ) ===================== */}
          <CropsEditor
            crops={visitCrops}
            onChange={setVisitCrops}
            title="ព័ត៌មានដំណាំដែលបានចុះពិនិត្យ"
          />

          {/* Crop Status */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Activity size={13} className="text-slate-500" />
              <span>ស្ថានភាពដំណាំទូទៅ</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
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
          </div>

          {/* Issues & Products */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <AlertCircle size={13} className="text-amber-500" />
              <span>បញ្ហាប្រឈមដែលជួបប្រទះ (បើមាន)</span>
            </label>
            <input 
              type="text" 
              value={issuesIdentified} 
              onChange={e => setIssuesIdentified(e.target.value)} 
              placeholder="ឧ. សត្វល្អិតស៊ីត្រួយ, ជំងឺផ្សិតស្លឹក..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Package size={13} className="text-slate-500" />
              <span>ផលិតផលដែលបានណែនាំ / លក់ជូន</span>
            </label>
            <input 
              type="text" 
              value={productsRecommended} 
              onChange={e => setProductsRecommended(e.target.value)} 
              placeholder="ឧ. ជីធម្មជាតិ X, ថ្នាំបាញ់កម្ចាត់ផ្សិត Y..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
            />
          </div>

          {/* Photos Upload & Existing Photos */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Camera size={13} className="text-slate-500" />
              <span>រូបភាពចំការ</span>
            </label>
            
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

            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl p-3 cursor-pointer text-emerald-700 font-bold text-xs transition-colors">
                <Camera size={18} />
                <span>+ ថែមរូបភាពថ្មី</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handlePhotoSelect} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* New Photo Previews */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {photoPreviews.map((src, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square group">
                    <img src={src} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => handleRemoveNewPhoto(idx)} 
                      className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full shadow hover:bg-rose-700 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

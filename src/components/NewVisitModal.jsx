import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { 
  MapPin, Camera, X, Loader2, UserPlus, CheckCircle2, 
  User, Users, Save, Navigation, Sprout, Activity, 
  AlertCircle, Package, Calendar, FileText, Edit, ExternalLink,
  Building, UserCheck, Plus, Check, RefreshCw, Sparkles, Clock, Link, ChevronDown, Copy, Target
} from 'lucide-react';
import CropsEditor from './CropsEditor';
import CustomerSelectSearch from './CustomerSelectSearch';
import TeamMemberSearchSelect from './TeamMemberSearchSelect';
import { 
  parseCrops, 
  parseBranches, 
  cleanBranchName,
  getStaffBranches, 
  getStaffList, 
  normalizePhone, 
  formatPhoneNumber, 
  handlePhoneInputChange, 
  checkDuplicateCustomerPhone, 
  formatProvince, 
  CAMBODIA_PROVINCES, 
  extractCoordinatesFromMapUrl, 
  isShortMapUrl,
  PURPOSE_SUGGESTIONS,
  extractVisitPurpose,
  extractFarmerHistory,
  cleanNotesText
} from '../staffUtils';
import { compressMultipleImages, formatFileSize } from '../imageUtils';

function getLocalDateString(d = new Date()) {
  if (!d || isNaN(new Date(d).getTime())) d = new Date();
  const dateObj = new Date(d);
  const pad = n => String(n).padStart(2, '0');
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  return `${year}-${month}-${day}`;
}

export default function NewVisitModal({ 
  isOpen, 
  onClose, 
  onVisitCreated, 
  customers, 
  onCustomerCreated, 
  onCustomerUpdated,
  visitToEdit, 
  duplicateFrom,
  preselectedCustomer,
  currentUser,
  staffList: propStaffList = []
}) {
  const [staffName, setStaffName] = useState(() => currentUser?.name || localStorage.getItem('sremeas_staff_name') || '');
  const [branch, setBranch] = useState(() => currentUser?.branch || 'ការិយាល័យកណ្តាល');
  const [visitDate, setVisitDate] = useState(() => getLocalDateString(new Date()));
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

  // Edit Customer States
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editCustName, setEditCustName] = useState('');
  const [editCustGender, setEditCustGender] = useState('ប្រុស');
  const [editCustType, setEditCustType] = useState('កសិករ');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustPhoneDuplicate, setEditCustPhoneDuplicate] = useState(null);
  const [isCheckingEditCustPhone, setIsCheckingEditCustPhone] = useState(false);
  const [editCustBranches, setEditCustBranches] = useState([]);
  const [editCustVillage, setEditCustVillage] = useState('');
  const [editCustCommune, setEditCustCommune] = useState('');
  const [editCustDistrict, setEditCustDistrict] = useState('');
  const [editCustProvince, setEditCustProvince] = useState('');
  const [editCustCrops, setEditCustCrops] = useState([]);
  const [isSavingCustomerEdit, setIsSavingCustomerEdit] = useState(false);

  // Real-time verification for phone duplication when editing customer
  useEffect(() => {
    if (!editingCustomer) {
      setEditCustPhoneDuplicate(null);
      setIsCheckingEditCustPhone(false);
      return;
    }

    const norm = normalizePhone(editCustPhone);
    if (!norm || norm.length < 8) {
      setEditCustPhoneDuplicate(null);
      setIsCheckingEditCustPhone(false);
      return;
    }

    let isMounted = true;
    setIsCheckingEditCustPhone(true);
    const timer = setTimeout(async () => {
      try {
        const found = await checkDuplicateCustomerPhone(
          editCustPhone, 
          editingCustomer.id, 
          customers, 
          supabase
        );
        if (isMounted) {
          setEditCustPhoneDuplicate(found);
          setIsCheckingEditCustPhone(false);
        }
      } catch (err) {
        if (isMounted) setIsCheckingEditCustPhone(false);
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [editCustPhone, editingCustomer, customers]);

  const handleOpenEditCustomer = (cust) => {
    if (!cust) return;
    setEditingCustomer(cust);
    setShowAddCustomer(false);
    setEditCustName(cust.name || '');
    setEditCustGender(cust.gender || 'ប្រុស');
    setEditCustType(cust.customer_type || 'កសិករ');
    setEditCustPhone(formatPhoneNumber(cust.phone || ''));
    setEditCustPhoneDuplicate(null);
    setEditCustBranches(parseBranches(cust.branches, cust.branch));
    setEditCustVillage(cust.village || '');
    setEditCustCommune(cust.commune || '');
    setEditCustDistrict(cust.district || '');
    setEditCustProvince(cust.province || '');
    setEditCustCrops(parseCrops(cust.crops, cust.primary_crop, cust.farm_size_ha));
  };

  const handleSaveEditedCustomer = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editCustName.trim()) return alert("សូមបញ្ចូលឈ្មោះអតិថិជន!");

    if (editCustPhoneDuplicate) {
      return alert(`មិនអាចកែប្រែបានទេ!\nលេខទូរស័ព្ទ «${editCustPhone}» ជារបស់អតិថិជនឈ្មោះ «${editCustPhoneDuplicate.name}» រួចហើយ។`);
    }

    setIsSavingCustomerEdit(true);
    const cleanProvince = formatProvince(editCustProvince).trim() || null;
    const primaryCropString = editCustCrops.map(c => c.crop_type).filter(Boolean).join(', ') || null;
    const primaryBranchString = editCustBranches.join(', ') || null;

    const payload = {
      name: editCustName.trim(),
      gender: editCustGender || 'ប្រុស',
      customer_type: editCustType || 'កសិករ',
      phone: formatPhoneNumber(editCustPhone) || null,
      branches: editCustBranches,
      branch: primaryBranchString,
      village: editCustVillage.trim() || null,
      commune: editCustCommune.trim() || null,
      district: editCustDistrict.trim() || null,
      province: cleanProvince,
      primary_crop: primaryCropString,
      crops: editCustCrops
    };

    try {
      let updatedCustomer = null;
      let { data, error } = await supabase.from('customers').update(payload).eq('id', editingCustomer.id).select().single();
      
      if (error && (error.message.includes('column') || error.code === 'PGRST204' || error.code === '42703')) {
        const { branches: _br, branch: _b, ...payloadNoBranch } = payload;
        const res2 = await supabase.from('customers').update(payloadNoBranch).eq('id', editingCustomer.id).select().single();
        if (!res2.error) {
          updatedCustomer = { ...res2.data, ...payload };
        } else {
          const fallbackPayload = {
            name: editCustName.trim(),
            phone: formatPhoneNumber(editCustPhone) || null,
            village: editCustVillage.trim() || null,
            province: cleanProvince,
            primary_crop: primaryCropString
          };
          const res3 = await supabase.from('customers').update(fallbackPayload).eq('id', editingCustomer.id).select().single();
          if (res3.error) throw res3.error;
          updatedCustomer = { ...res3.data, ...payload };
        }
      } else if (error) {
        throw error;
      } else {
        updatedCustomer = data;
      }

      if (onCustomerUpdated && updatedCustomer) {
        onCustomerUpdated(updatedCustomer);
      }
      pullDataFromCustomer(updatedCustomer);
      setEditingCustomer(null);
      alert("បានកែប្រែព័ត៌មានអតិថិជនជោគជ័យ!");
    } catch (err) {
      alert("មិនអាចកែប្រែព័ត៌មានអតិថិជនបានទេ: " + err.message);
    } finally {
      setIsSavingCustomerEdit(false);
    }
  };

  // Visit Fields
  const [purpose, setPurpose] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [mapLinkInput, setMapLinkInput] = useState('');
  const [mapLinkStatus, setMapLinkStatus] = useState(null); // null | 'success' | 'short_url' | 'error'
  const [locationAddress, setLocationAddress] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Crops inspected in this visit
  const [visitCrops, setVisitCrops] = useState([]);
  const [cropStatus, setCropStatus] = useState('');
  const [issuesIdentified, setIssuesIdentified] = useState('');
  const [productsRecommended, setProductsRecommended] = useState('');
  const [farmerHistory, setFarmerHistory] = useState('');
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

  // Pull Farm Location and Crops directly from Customer Record
  const pullDataFromCustomer = (cust) => {
    if (!cust) return;

    // 1. Location Address
    const addressParts = [cust.village, cust.commune, cust.district, formatProvince(cust.province)].filter(Boolean);
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

    setPulledNotice(`បានជ្រើសរើស និងទាញយកទិន្នន័យអតិថិជន ${cust.name} (${custCrops.length} មុខដំណាំ)`);
    setTimeout(() => setPulledNotice(''), 4500);
  };

  // Initialize form when opened or when visitToEdit / duplicateFrom changes
  useEffect(() => {
    if (!isOpen) return;

    if (duplicateFrom) {
      setStaffName(currentUser?.name || duplicateFrom.staff_name || '');
      setBranch(duplicateFrom.branch || currentUser?.branch || 'ការិយាល័យកណ្តាល');

      let initialTeam = [];
      if (Array.isArray(duplicateFrom.team_members)) {
        initialTeam = duplicateFrom.team_members;
      } else if (typeof duplicateFrom.team_members === 'string') {
        try {
          const parsed = JSON.parse(duplicateFrom.team_members);
          if (Array.isArray(parsed)) initialTeam = parsed;
          else initialTeam = duplicateFrom.team_members.split(',').map(s => s.trim()).filter(Boolean);
        } catch {
          initialTeam = duplicateFrom.team_members.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      setTeamMembers(initialTeam);

      setSelectedCustomerId(duplicateFrom.customer_id || '');
      setLatitude(duplicateFrom.latitude || null);
      setLongitude(duplicateFrom.longitude || null);
      setLocationAddress(duplicateFrom.location_address || '');
      setVisitCrops(parseCrops(duplicateFrom.crops, duplicateFrom.crop_type, duplicateFrom.farm_size_ha));
      setCropStatus(duplicateFrom.crop_status || '');
      setIssuesIdentified(duplicateFrom.issues_identified || '');
      setProductsRecommended(duplicateFrom.products_recommended || '');
      setPurpose(extractVisitPurpose(duplicateFrom));

      let rawNotes = cleanNotesText(duplicateFrom.notes || '');
      let extractedHistory = extractFarmerHistory(duplicateFrom);
      setFarmerHistory(extractedHistory || '');
      setNotes(rawNotes);
      setVisitDate(getLocalDateString(new Date()));
      setExistingPhotos([]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setPhotoMeta([]);
      setMapLinkInput('');
      setMapLinkStatus(null);
      setIsCompressing(false);
      setShowAddCustomer(false);
      setNewCustPhone('');
      setNewCustPhoneDuplicate(null);
      setIsCheckingNewCustPhone(false);
      setPulledNotice('បានចម្លងព័ត៌មានពីកំណត់ត្រាចុះចំការចាស់រួចរាល់។ សូមពិនិត្យកាលបរិច្ឆេទ និងព័ត៌មានផ្សេងៗមុនរក្សាទុក។');
    } else if (visitToEdit) {
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
      setCropStatus(visitToEdit.crop_status || '');
      setIssuesIdentified(visitToEdit.issues_identified || '');
      setProductsRecommended(visitToEdit.products_recommended || '');
      setPurpose(extractVisitPurpose(visitToEdit));
      
      let rawNotes = cleanNotesText(visitToEdit.notes || '');
      let extractedHistory = extractFarmerHistory(visitToEdit);
      setFarmerHistory(extractedHistory || '');
      setNotes(rawNotes);
      setVisitDate(visitToEdit.visit_date ? getLocalDateString(visitToEdit.visit_date) : getLocalDateString(new Date()));
      setExistingPhotos(visitToEdit.photos || []);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setPhotoMeta([]);
      setMapLinkInput('');
      setMapLinkStatus(null);
      setIsCompressing(false);
      setShowAddCustomer(false);
      setEditingCustomer(null);
      setNewCustPhone('');
      setNewCustPhoneDuplicate(null);
      setIsCheckingNewCustPhone(false);
      setEditCustPhone('');
      setEditCustPhoneDuplicate(null);
      setIsCheckingEditCustPhone(false);
      setPulledNotice('');
    } else {
      const initialStaff = currentUser?.name || localStorage.getItem('sremeas_staff_name') || '';
      setStaffName(initialStaff);
      setBranch(currentUser?.branch || 'ការិយាល័យកណ្តាល');
      setTeamMembers([]);
      if (preselectedCustomer) {
        const targetCust = (customers && customers.find(c => c.id === preselectedCustomer.id)) || preselectedCustomer;
        setSelectedCustomerId(targetCust.id);
        pullDataFromCustomer(targetCust);
      } else {
        setSelectedCustomerId('');
        setLatitude(null);
        setLongitude(null);
        setLocationAddress('');
        setVisitCrops([
          { crop_type: 'ស្វាយចន្ទី', variety: 'M23', farm_size_ha: '', plant_count: '', crop_age: '' }
        ]);
        setPulledNotice('');
      }
      setCropStatus('');
      setIssuesIdentified('');
      setProductsRecommended('');
      setPurpose('');
      setFarmerHistory('');
      setNotes('');
      setVisitDate(getLocalDateString(new Date()));
      setExistingPhotos([]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setPhotoMeta([]);
      setMapLinkInput('');
      setMapLinkStatus(null);
      setIsCompressing(false);
      setShowAddCustomer(false);
      setEditingCustomer(null);
      setNewCustPhone('');
      setNewCustPhoneDuplicate(null);
      setIsCheckingNewCustPhone(false);
      setEditCustPhone('');
      setEditCustPhoneDuplicate(null);
      setIsCheckingEditCustPhone(false);
      setNewCustCrops([
        { crop_type: 'ស្វាយចន្ទី', variety: 'M23', farm_size_ha: '', plant_count: '', crop_age: '' }
      ]);
    }
  }, [isOpen, visitToEdit, duplicateFrom, preselectedCustomer, currentUser, customers]);

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

  const handleMapLinkChange = (e) => {
    const value = e.target.value;
    setMapLinkInput(value);

    if (!value.trim()) {
      setMapLinkStatus(null);
      return;
    }

    const coords = extractCoordinatesFromMapUrl(value);
    if (coords) {
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      setMapLinkStatus('success');
    } else if (isShortMapUrl(value)) {
      setMapLinkStatus('short_url');
    } else {
      setMapLinkStatus('error');
    }
  };

  const handleClearMapLink = () => {
    setMapLinkInput('');
    setMapLinkStatus(null);
  };

  // Team Member handling
  const handleToggleTeamMember = (name) => {
    if (!name) return;
    setTeamMembers(prev => 
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    );
  };

  const handleAddCustomMember = (customName = null) => {
    const val = (typeof customName === 'string' ? customName : customMemberInput).trim();
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

    const cleanProvince = formatProvince(newCustProvince).trim() || null;
    const payload = {
      name: newCustName.trim(),
      gender: newCustGender || 'ប្រុស',
      customer_type: newCustType || 'កសិករ',
      phone: formatPhoneNumber(newCustPhone) || null,
      branches: newCustBranches,
      branch: primaryBranchString,
      village: newCustVillage.trim() || null,
      commune: newCustCommune.trim() || null,
      district: newCustDistrict.trim() || null,
      province: cleanProvince,
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
            phone: formatPhoneNumber(newCustPhone) || null,
            village: newCustVillage.trim() || null,
            province: cleanProvince,
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

    // Attempt 2: If farmer_history or purpose column does not exist in schema, strip them and pack into notes, PRESERVING branch & team_members!
    if (res.error.message?.includes('column') || res.error.code === 'PGRST204' || res.error.code === '42703') {
      const { purpose: _p, farmer_history: _fh, ...payloadPreservingBranch } = payload;
      let notesWithMetadata = payload.notes || '';
      if (payload.farmer_history && payload.farmer_history.trim() && !notesWithMetadata.includes('[ប្រវត្តិប្រើប្រាស់]:')) {
        notesWithMetadata = `[ប្រវត្តិប្រើប្រាស់]: ${payload.farmer_history.trim()}${notesWithMetadata ? '\n' + notesWithMetadata : ''}`;
      }
      if (payload.purpose && payload.purpose.trim() && !notesWithMetadata.includes('[គោលបំណង]:')) {
        notesWithMetadata = `[គោលបំណង]: ${payload.purpose.trim()}${notesWithMetadata ? '\n' + notesWithMetadata : ''}`;
      }
      payloadPreservingBranch.notes = notesWithMetadata || null;

      let res2;
      if (visitId) {
        res2 = await supabase.from('field_visits').update(payloadPreservingBranch).eq('id', visitId).select().single();
      } else {
        res2 = await supabase.from('field_visits').insert([payloadPreservingBranch]).select().single();
      }
      if (!res2.error) return { ...res2.data, ...payload, notes: payload.notes || notesWithMetadata };

      // Attempt 3: only if crops column fails
      if (res2.error.message?.includes('column') || res2.error.code === 'PGRST204' || res2.error.code === '42703') {
        const { crops: _c, ...payloadLegacy } = payloadPreservingBranch;
        let res3;
        if (visitId) {
          res3 = await supabase.from('field_visits').update(payloadLegacy).eq('id', visitId).select().single();
        } else {
          res3 = await supabase.from('field_visits').insert([payloadLegacy]).select().single();
        }
        if (!res3.error) return { ...res3.data, ...payload, notes: payload.notes || notesWithMetadata };
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

      // 2. Full Visit Payload
      let finalVisitDate;
      if (visitDate) {
        if (visitToEdit && visitDate === getLocalDateString(visitToEdit.visit_date)) {
          finalVisitDate = visitToEdit.visit_date;
        } else {
          const d = new Date();
          const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
          finalVisitDate = new Date(`${visitDate}T${timeStr}`).toISOString();
        }
      } else {
        finalVisitDate = new Date().toISOString();
      }

      const payload = {
        visit_date: finalVisitDate,
        staff_name: staffName.trim(),
        branch: cleanBranchName(branch) || cleanBranchName(defaultStaffBranch) || 'ការិយាល័យកណ្តាល',
        team_members: teamMembers,
        purpose: purpose.trim() || null,
        customer_id: selectedCustomerId,
        latitude: latitude || null,
        longitude: longitude || null,
        location_address: locationAddress.trim() || null,
        crop_type: primaryCropType,
        farm_size_ha: totalHa,
        crops: visitCrops,
        crop_status: cropStatus.trim() || null,
        issues_identified: issuesIdentified.trim() || null,
        products_recommended: productsRecommended.trim() || null,
        farmer_history: farmerHistory.trim() || null,
        follow_up_date: null,
        photos: allPhotos,
        notes: notes.trim() || null
      };

      const savedData = await saveVisitToSupabase(payload, visitToEdit?.id);

      // Auto sync customer location & crops to customers table
      if (selectedCustomerId) {
        try {
          const custUpdatePayload = {};
          if (latitude && longitude) {
            custUpdatePayload.latitude = latitude;
            custUpdatePayload.longitude = longitude;
          }
          if (locationAddress && locationAddress.trim()) {
            custUpdatePayload.location_address = locationAddress.trim();
          }
          if (visitCrops && visitCrops.length > 0) {
            custUpdatePayload.crops = visitCrops;
            custUpdatePayload.primary_crop = primaryCropType;
          }
          if (Object.keys(custUpdatePayload).length > 0) {
            const { data: updatedCustData, error: custUpErr } = await supabase
              .from('customers')
              .update(custUpdatePayload)
              .eq('id', selectedCustomerId)
              .select()
              .single();
            if (!custUpErr && updatedCustData && onCustomerUpdated) {
              onCustomerUpdated(updatedCustData);
            }
          }
        } catch (syncErr) {
          console.warn("Could not sync customer details from visit:", syncErr);
        }
      }

      const customerObj = customers.find(c => c.id === selectedCustomerId);
      const visitWithCustomer = {
        ...savedData,
        purpose: purpose.trim() || null,
        farmer_history: farmerHistory.trim() || null,
        customers: customerObj || null
      };

      const successMsg = duplicateFrom 
        ? "បានកត់ត្រាការចុះចំការថ្មី (ចម្លង) ជោគជ័យ!" 
        : (visitToEdit ? "បានកែប្រែកំណត់ត្រាជោគជ័យ!" : "កត់ត្រាការចុះចំការបានជោគជ័យ!");
      alert(successMsg);
      onVisitCreated(savedData);
      onClose();
    } catch (err) {
      alert("មានបញ្ហាក្នុងការរក្សាទុក: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter available colleagues from staff members (exclude primary staff name)
  const availableColleagues = staffMembers.filter(s => s.name !== staffName);

  // Distinct branches list STRICTLY from staff table
  const branchOptions = getStaffBranches(staffMembers);

  // Identify default branch of the current staff member
  const currentStaffObj = staffMembers.find(s => (s.name || '').trim().toLowerCase() === (staffName || '').trim().toLowerCase());
  const defaultStaffBranch = currentStaffObj?.branch || currentUser?.branch || 'ការិយាល័យកណ្តាល';

  // All distinct branch options combining staff table branches, user branch and current selection
  const allBranchOptions = useMemo(() => {
    const set = new Set();
    branchOptions.forEach(b => {
      const clean = cleanBranchName(b);
      if (clean) set.add(clean);
    });
    if (branch && cleanBranchName(branch)) set.add(cleanBranchName(branch));
    if (currentUser?.branch && cleanBranchName(currentUser.branch)) set.add(cleanBranchName(currentUser.branch));
    if (defaultStaffBranch && cleanBranchName(defaultStaffBranch)) set.add(cleanBranchName(defaultStaffBranch));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [branchOptions, branch, currentUser, defaultStaffBranch]);

  // Handle staff name change with auto-selection of staff's branch
  const handleStaffNameChange = (name) => {
    setStaffName(name);
    const matched = staffMembers.find(s => (s.name || '').trim().toLowerCase() === name.trim().toLowerCase());
    if (matched && matched.branch) {
      setBranch(matched.branch);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto overflow-x-hidden">
      <div className="relative w-full max-w-xl max-w-[calc(100vw-16px)] sm:max-w-xl my-2 sm:my-8 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className={`flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 text-white ${
          duplicateFrom ? 'bg-emerald-700' : (visitToEdit ? 'bg-slate-900' : 'bg-emerald-600')
        }`}>
          <div className="flex items-center gap-2">
            <span className="p-2 sm:p-1.5 rounded-xl bg-white/10">
              {duplicateFrom ? (
                <Copy size={20} className="sm:w-[18px] sm:h-[18px]" />
              ) : visitToEdit ? (
                <Edit size={20} className="sm:w-[18px] sm:h-[18px]" />
              ) : (
                <Sprout size={20} className="sm:w-[18px] sm:h-[18px]" />
              )}
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-base leading-tight">
                {duplicateFrom ? 'ចម្លងកំណត់ត្រាចុះចំការ (Duplicate)' : (visitToEdit ? 'កែប្រែកំណត់ត្រាចុះចំការ' : 'កត់ត្រាការចុះចំការថ្មី')}
              </h3>
              <p className="text-xs sm:text-[10px] text-white/80 font-medium">
                {duplicateFrom ? 'ស្រែមាស - ចម្លងព័ត៌មានពីកំណត់ត្រាចាស់ដើម្បីកត់ត្រាថ្មី' : 'ស្រែមាស - ប្រព័ន្ធតាមដានការងារចុះចំការ'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 sm:p-1 rounded-xl hover:bg-black/20 text-white/80 hover:text-white transition-colors cursor-pointer">
            <X size={22} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Pulled from Customer Notification Banner */}
        {pulledNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 sm:py-2 flex items-center justify-between text-emerald-800 text-sm sm:text-xs font-bold animate-fadeIn">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{pulledNotice}</span>
            </span>
            <button onClick={() => setPulledNotice('')} className="text-emerald-600 hover:text-emerald-900 p-1">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-3.5 sm:p-5 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto overflow-x-hidden space-y-4 text-sm sm:text-xs">

          {/* ===================== SECTION 1: STAFF, BRANCH & VISIT DATE ===================== */}
          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2.5 min-w-0">
              
              {/* Staff Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 text-sm sm:text-xs">
                  <User size={14} className="text-emerald-600" />
                  <span>អ្នករាយការណ៍ *</span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    required 
                    list="staff-name-options"
                    value={staffName} 
                    onChange={e => handleStaffNameChange(e.target.value)} 
                    placeholder="ជ្រើសរើស ឬវាយឈ្មោះបុគ្គលិក..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold min-h-[44px] sm:min-h-[38px] shadow-2xs"
                  />
                  <datalist id="staff-name-options">
                    {staffMembers.map(s => (
                      <option key={s.id || s.name} value={s.name}>
                        {s.name} ({s.branch || 'គ្មានសាខា'})
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Branch */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 text-sm sm:text-xs">
                  <Building size={14} className="text-emerald-600" />
                  <span>សាខា *</span>
                </label>
                <div className="relative">
                  <select 
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs min-h-[44px] sm:min-h-[38px] appearance-none pr-8 cursor-pointer"
                  >
                    {allBranchOptions.map((b, idx) => (
                      <option key={idx} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Visit Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 text-sm sm:text-xs">
                  <Calendar size={14} className="text-emerald-600" />
                  <span>កាលបរិច្ឆេទចុះចំការ *</span>
                </label>
                <input 
                  type="date" 
                  required 
                  value={visitDate} 
                  onChange={e => setVisitDate(e.target.value)} 
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold min-h-[44px] sm:min-h-[38px] shadow-2xs cursor-pointer"
                />
              </div>

            </div>

            {/* Team Members / Accompanied Staff Searchable Selector */}
            <div className="pt-2.5 border-t border-slate-200/80">
              <TeamMemberSearchSelect 
                staffMembers={staffMembers}
                currentStaffName={staffName}
                selectedMembers={teamMembers}
                onToggleMember={handleToggleTeamMember}
                onRemoveMember={handleRemoveTeamMember}
                onAddCustomMember={handleAddCustomMember}
              />
            </div>

            {/* Visit Purpose / គោលបំណងចុះចំការ */}
            <div className="pt-2.5 border-t border-slate-200/80">
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between text-sm sm:text-xs">
                <span className="flex items-center gap-1.5">
                  <Target size={14} className="text-emerald-600" />
                  <span>គោលបំណងចុះចំការ</span>
                </span>
                {purpose && (
                  <span className="text-xs sm:text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                    {purpose}
                  </span>
                )}
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  list="visit-purpose-suggestions"
                  value={purpose} 
                  onChange={e => setPurpose(e.target.value)} 
                  placeholder="ជ្រើសរើស ឬវាយបញ្ចូលគោលបំណង (ឧ. ចុះពិនិត្យដំណាំ, តាមដានការលូតលាស់...)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium min-h-[44px] sm:min-h-[38px] shadow-2xs"
                />
                <datalist id="visit-purpose-suggestions">
                  {PURPOSE_SUGGESTIONS.map((p, idx) => (
                    <option key={idx} value={p} />
                  ))}
                </datalist>
              </div>

              {/* Quick Suggestions Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PURPOSE_SUGGESTIONS.map((p, idx) => {
                  const isSelected = purpose === p;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPurpose(isSelected ? '' : p)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1 min-h-[30px] sm:min-h-[26px] ${
                        isSelected 
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? <Check size={11} /> : <Plus size={11} />}
                      <span>{p}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ===================== SECTION 2: CUSTOMER / FARMER SELECTION WITH SEARCH ===================== */}
          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-sm sm:text-xs">
                <Users size={16} className="text-emerald-700" />
                <span>អតិថិជន / ម្ចាស់ចំការ *</span>
              </label>

              {!visitToEdit && (
                <button 
                  type="button" 
                  onClick={() => setShowAddCustomer(!showAddCustomer)} 
                  className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 text-sm sm:text-xs hover:underline py-1 px-1.5 rounded-lg"
                >
                  <UserPlus size={15} />
                  <span>{showAddCustomer ? 'ត្រឡប់ទៅជ្រើសរើស' : '+ បង្កើតអតិថិជនថ្មី'}</span>
                </button>
              )}
            </div>

            {showAddCustomer ? (
              /* Inline Add New Customer Form */
              <div className="space-y-3 pt-2.5 border-t border-slate-200">
                <div className="grid grid-cols-3 gap-2.5 min-w-0">
                  <input 
                    type="text" 
                    placeholder="ឈ្មោះអតិថិជន *" 
                    value={newCustName} 
                    onChange={e => setNewCustName(e.target.value)}
                    className="col-span-2 w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] font-bold min-w-0"
                  />
                  <select
                    value={newCustGender}
                    onChange={e => setNewCustGender(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 font-bold min-h-[44px] sm:min-h-[38px] min-w-0"
                  >
                    <option value="ប្រុស">ប្រុស</option>
                    <option value="ស្រី">ស្រី</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5 min-w-0">
                  <select
                    value={newCustType}
                    onChange={e => setNewCustType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 font-bold min-h-[44px] sm:min-h-[38px] min-w-0"
                  >
                    <option value="កសិករ">កសិករ</option>
                    <option value="ដេប៉ូ">ដេប៉ូ</option>
                    <option value="ផ្សេងៗ">ផ្សេងៗ</option>
                  </select>
                  <div className="min-w-0">
                    <input 
                      type="text" 
                      placeholder="លេខទូរស័ព្ទ (ឧ. 012 345 678)" 
                      value={newCustPhone} 
                      onChange={e => setNewCustPhone(handlePhoneInputChange(e.target.value, newCustPhone))}
                      className={`w-full bg-white border rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs font-mono min-h-[44px] sm:min-h-[38px] min-w-0 transition-colors ${
                        newCustPhoneDuplicate 
                          ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500' 
                          : 'border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500'
                      }`}
                    />
                    {isCheckingNewCustPhone && (
                      <span className="text-xs sm:text-[10px] text-slate-400 flex items-center gap-1 font-normal mt-1">
                        <Loader2 size={12} className="animate-spin text-emerald-600" />
                        <span>ផ្ទៀងផ្ទាត់លេខ...</span>
                      </span>
                    )}
                    {!isCheckingNewCustPhone && !newCustPhoneDuplicate && normalizePhone(newCustPhone).length >= 8 && (
                      <span className="text-xs sm:text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                        <CheckCircle2 size={12} />
                        <span>លេខអាចប្រើបាន</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Warning Card if duplicate phone detected */}
                {newCustPhoneDuplicate && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm sm:text-xs space-y-2.5 animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-[11px] text-slate-700 flex-1">
                        <span className="font-bold text-rose-800 block">លេខទូរស័ព្ទនេះមានក្នុងប្រព័ន្ធរួចហើយ! (កុំបង្កើតស្ទួន)</span>
                        ជារបស់អតិថិជនឈ្មោះ <span className="font-bold text-slate-900">«{newCustPhoneDuplicate.name}»</span>
                        {newCustPhoneDuplicate.phone && <span className="font-mono text-rose-700 font-bold ml-1">({newCustPhoneDuplicate.phone})</span>}
                        {newCustPhoneDuplicate.customer_type && <span className="text-slate-500 text-xs sm:text-[10px] ml-1">[{newCustPhoneDuplicate.customer_type}]</span>}
                        <div className="text-xs sm:text-[10px] text-slate-500 mt-1">
                          ទីតាំង: {[newCustPhoneDuplicate.village, newCustPhoneDuplicate.commune, newCustPhoneDuplicate.district, formatProvince(newCustPhoneDuplicate.province)].filter(Boolean).join(', ') || 'គ្មានបញ្ជាក់'}
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
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 sm:py-2 px-3 rounded-xl text-xs sm:text-[11px] flex items-center justify-center gap-1.5 shadow-sm min-h-[42px] sm:min-h-[36px] transition-colors"
                    >
                      <UserCheck size={15} />
                      <span>ជ្រើសរើសយក «{newCustPhoneDuplicate.name}» នេះសម្រាប់ការចុះចំការភ្លាមៗ</span>
                    </button>
                  </div>
                )}

                {/* Branch selector for new customer */}
                <div className="p-3 bg-slate-100/80 rounded-xl space-y-1.5 text-sm sm:text-xs">
                  <label className="font-bold text-slate-700 flex items-center justify-between text-xs sm:text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Building size={14} className="text-emerald-600" />
                      <span>សាខាអតិថិជន (អាចជ្រើសបានច្រើន)</span>
                    </span>
                    {newCustBranches.length > 0 && (
                      <span className="text-xs sm:text-[10px] text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                        {newCustBranches.length} សាខា
                      </span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {branchOptions.map((b, idx) => {
                      const isSel = newCustBranches.includes(b);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewCustBranches(prev => 
                            prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
                          )}
                          className={`px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs sm:text-[11px] font-bold border transition-all flex items-center gap-1 min-h-[34px] sm:min-h-[28px] ${
                            isSel ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isSel ? <Check size={12} /> : <Plus size={12} />}
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

                <div className="grid grid-cols-2 gap-2.5 min-w-0">
                  <input 
                    type="text" 
                    placeholder="ភូមិ" 
                    value={newCustVillage} 
                    onChange={e => setNewCustVillage(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] min-w-0"
                  />
                  <input 
                    type="text" 
                    placeholder="ឃុំ / សង្កាត់" 
                    value={newCustCommune} 
                    onChange={e => setNewCustCommune(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] min-w-0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 min-w-0">
                  <input 
                    type="text" 
                    placeholder="ស្រុក / ខណ្ឌ" 
                    value={newCustDistrict} 
                    onChange={e => setNewCustDistrict(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] min-w-0"
                  />
                  <input 
                    type="text" 
                    list="new-visit-khmer-provinces"
                    placeholder="ជ្រើសរើស ឬវាយខេត្ត..." 
                    value={newCustProvince} 
                    onChange={e => setNewCustProvince(e.target.value)}
                    onBlur={() => setNewCustProvince(prev => formatProvince(prev))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] min-w-0"
                  />
                  <datalist id="new-visit-khmer-provinces">
                    {CAMBODIA_PROVINCES.map(p => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <button 
                  type="button" 
                  onClick={handleCreateCustomer}
                  disabled={Boolean(newCustPhoneDuplicate)}
                  className={`w-full font-bold py-3 sm:py-2.5 rounded-xl text-sm sm:text-xs transition-colors flex items-center justify-center gap-2 min-h-[46px] sm:min-h-[40px] shadow-sm ${
                    newCustPhoneDuplicate 
                      ? 'bg-rose-400 cursor-not-allowed text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {newCustPhoneDuplicate ? <AlertCircle size={16} /> : <Save size={16} />}
                  <span>{newCustPhoneDuplicate ? 'មិនអាចបង្កើត (ស្ទួនលេខទូរស័ព្ទ)' : 'រក្សាទុកអតិថិជនថ្មី & ទាញយកទិន្នន័យ'}</span>
                </button>
              </div>
            ) : editingCustomer ? (
              /* Inline Edit Customer Form */
              <div className="space-y-3 pt-2.5 border-t border-blue-200 bg-blue-50/40 p-3.5 rounded-2xl border">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-xs sm:text-[11px] flex items-center gap-1.5">
                    <Edit size={14} className="text-blue-600" />
                    <span>កែប្រែព័ត៌មានអតិថិជន: {editingCustomer.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5 min-w-0">
                  <input 
                    type="text" 
                    placeholder="ឈ្មោះអតិថិជន *" 
                    value={editCustName} 
                    onChange={e => setEditCustName(e.target.value)}
                    className="col-span-2 w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] font-bold min-w-0"
                  />
                  <select
                    value={editCustGender}
                    onChange={e => setEditCustGender(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 font-bold min-h-[44px] sm:min-h-[38px] min-w-0"
                  >
                    <option value="ប្រុស">ប្រុស</option>
                    <option value="ស្រី">ស្រី</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5 min-w-0">
                  <select
                    value={editCustType}
                    onChange={e => setEditCustType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 font-bold min-h-[44px] sm:min-h-[38px] min-w-0"
                  >
                    <option value="កសិករ">កសិករ</option>
                    <option value="ដេប៉ូ">ដេប៉ូ</option>
                    <option value="ផ្សេងៗ">ផ្សេងៗ</option>
                  </select>
                  <div className="min-w-0">
                    <input 
                      type="text" 
                      placeholder="លេខទូរស័ព្ទ (ឧ. 012 345 678)" 
                      value={editCustPhone} 
                      onChange={e => setEditCustPhone(handlePhoneInputChange(e.target.value, editCustPhone))}
                      className={`w-full bg-white border rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs font-mono min-h-[44px] sm:min-h-[38px] min-w-0 transition-colors ${
                        editCustPhoneDuplicate 
                          ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500' 
                          : 'border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      }`}
                    />
                    {isCheckingEditCustPhone && (
                      <span className="text-xs sm:text-[10px] text-slate-400 flex items-center gap-1 font-normal mt-1">
                        <Loader2 size={12} className="animate-spin text-blue-600" />
                        <span>ផ្ទៀងផ្ទាត់លេខ...</span>
                      </span>
                    )}
                    {!isCheckingEditCustPhone && !editCustPhoneDuplicate && normalizePhone(editCustPhone).length >= 8 && (
                      <span className="text-xs sm:text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                        <CheckCircle2 size={12} />
                        <span>លេខអាចប្រើបាន</span>
                      </span>
                    )}
                  </div>
                </div>

                {editCustPhoneDuplicate && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-rose-800 block">លេខទូរស័ព្ទនេះមានក្នុងប្រព័ន្ធរួចហើយ!</span>
                    <span className="text-slate-700">ជារបស់អតិថិជនឈ្មោះ «{editCustPhoneDuplicate.name}» ({editCustPhoneDuplicate.phone || ''})</span>
                  </div>
                )}

                {/* Branch selector */}
                <div className="p-3 bg-white rounded-xl space-y-1.5 text-sm sm:text-xs border border-slate-200">
                  <label className="font-bold text-slate-700 flex items-center justify-between text-xs sm:text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Building size={14} className="text-blue-600" />
                      <span>សាខាអតិថិជន</span>
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {branchOptions.map((b, idx) => {
                      const isSel = editCustBranches.includes(b);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditCustBranches(prev => 
                            prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
                          )}
                          className={`px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs sm:text-[11px] font-bold border transition-all flex items-center gap-1 min-h-[34px] sm:min-h-[28px] ${
                            isSel ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isSel ? <Check size={12} /> : <Plus size={12} />}
                          <span>{b}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Crops for editing customer */}
                <CropsEditor
                  crops={editCustCrops}
                  onChange={setEditCustCrops}
                  title="ដំណាំរបស់អតិថិជន"
                />

                <div className="grid grid-cols-2 gap-2.5 min-w-0">
                  <input 
                    type="text" 
                    placeholder="ភូមិ" 
                    value={editCustVillage} 
                    onChange={e => setEditCustVillage(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] min-w-0"
                  />
                  <input 
                    type="text" 
                    placeholder="ឃុំ / សង្កាត់" 
                    value={editCustCommune} 
                    onChange={e => setEditCustCommune(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] min-w-0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 min-w-0">
                  <input 
                    type="text" 
                    placeholder="ស្រុក / ខណ្ឌ" 
                    value={editCustDistrict} 
                    onChange={e => setEditCustDistrict(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] min-w-0"
                  />
                  <input 
                    type="text" 
                    list="new-visit-khmer-provinces"
                    placeholder="ជ្រើសរើស ឬវាយខេត្ត..." 
                    value={editCustProvince} 
                    onChange={e => setEditCustProvince(e.target.value)}
                    onBlur={() => setEditCustProvince(prev => formatProvince(prev))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] min-w-0"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button 
                    type="button" 
                    onClick={handleSaveEditedCustomer}
                    disabled={isSavingCustomerEdit || Boolean(editCustPhoneDuplicate)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2.5 sm:py-2 rounded-xl text-xs flex items-center justify-center gap-2 min-h-[42px] sm:min-h-[36px] shadow-sm transition-colors"
                  >
                    {isSavingCustomerEdit ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>{isSavingCustomerEdit ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកែប្រែព័ត៌មាន'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="px-4 py-2.5 sm:py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold rounded-xl text-xs min-h-[42px] sm:min-h-[36px] transition-colors"
                  >
                    បោះបង់
                  </button>
                </div>
              </div>
            ) : (
              /* Searchable Customer Combobox */
              <CustomerSelectSearch
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={handleSelectCustomer}
                onAddNewCustomerClick={() => {
                  setShowAddCustomer(true);
                  setEditingCustomer(null);
                }}
                onEditCustomerClick={handleOpenEditCustomer}
                onResyncCustomerData={pullDataFromCustomer}
              />
            )}
          </div>

          {/* ===================== SECTION 3: LOCATION & GPS ===================== */}
          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5 text-sm sm:text-xs">
                <MapPin size={16} className="text-rose-500" />
                <span>ទីតាំងចំការជាក់ស្តែង (GPS & អាសយដ្ឋាន)</span>
              </span>
              <button 
                type="button" 
                onClick={handleGetGPS} 
                disabled={gettingLocation}
                className="px-3.5 py-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-[11px] font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs min-h-[40px] sm:min-h-[32px]"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>កំពុងចាប់យក GPS...</span>
                  </>
                ) : (
                  <>
                    <Navigation size={14} />
                    <span>ចាប់យក GPS បច្ចុប្បន្ន</span>
                  </>
                )}
              </button>
            </div>

            {/* Map Link Auto-Detect Box */}
            <div className="space-y-2 bg-white p-3 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <label className="text-xs sm:text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
                <Link size={14} className="text-emerald-600" />
                <span>បញ្ចូល Link Google Maps ឬ Apple Maps (ចាប់យក Latitude, Longitude ដោយស្វ័យប្រវត្តិ)</span>
              </label>
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={mapLinkInput}
                  onChange={handleMapLinkChange}
                  placeholder="Paste Link Google Maps, Apple Maps ឬកូអរដោនេ (ឧ. 11.5564, 104.9282)..."
                  className={`w-full bg-slate-50 border rounded-xl pl-3 pr-9 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 placeholder:text-slate-400 font-sans min-h-[44px] sm:min-h-[38px] transition-all ${
                    mapLinkStatus === 'success' 
                      ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/20' 
                      : mapLinkStatus === 'short_url'
                        ? 'border-amber-400 bg-amber-50/30'
                        : mapLinkStatus === 'error'
                          ? 'border-rose-300 bg-rose-50/20'
                          : 'border-slate-300 focus:bg-white focus:border-emerald-500'
                  }`}
                />
                {mapLinkInput && (
                  <button
                    type="button"
                    onClick={handleClearMapLink}
                    title="សម្អាត"
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Real-time Status Feedback */}
              {mapLinkStatus === 'success' && latitude && longitude && (
                <div className="text-xs sm:text-[10px] text-emerald-700 font-bold flex items-center gap-1.5 pt-0.5">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>បានចាប់យកកូអរដោនេជោគជ័យ: Lat: {latitude.toFixed(6)}, Long: {longitude.toFixed(6)}</span>
                </div>
              )}

              {mapLinkStatus === 'short_url' && (
                <div className="text-xs sm:text-[10px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600 shrink-0" />
                    <span>Link នេះជា Short Link (maps.app.goo.gl) ដែលមិនមានលេខកូអរដោនេផ្ទាល់</span>
                  </div>
                  <div className="text-slate-600 flex items-center justify-between gap-2 flex-wrap">
                    <span>សូមចុចបើក Link ដើម្បី Copy Link ពេញ ឬ Copy កូអរដោនេមកដាក់</span>
                    {mapLinkInput.startsWith('http') && (
                      <a
                        href={mapLinkInput}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs sm:text-[10px] inline-flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <span>បើកមើល Link</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {mapLinkStatus === 'error' && (
                <div className="text-xs sm:text-[10px] text-rose-600 flex items-center gap-1.5 pt-0.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>មិនអាចស្វែងរកកូអរដោនេពី Link នេះទេ។ សូមពិនិត្យ Link ឡើងវិញ។</span>
                </div>
              )}
            </div>

            {latitude && longitude ? (
              <div className="text-emerald-800 font-mono text-xs sm:text-[11px] font-bold bg-emerald-50 p-3 sm:p-2.5 rounded-xl border border-emerald-200 flex justify-between items-center">
                <span>Lat: {latitude.toFixed(6)}, Long: {longitude.toFixed(6)}</span>
                <a 
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-600 underline font-sans text-xs sm:text-[10px] inline-flex items-center gap-1 font-bold"
                >
                  <span>មើលលើ Maps</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            ) : (
              <p className="text-slate-400 text-xs sm:text-[11px]">មិនទាន់មានកូអរដោនេ GPS (ចុច "ចាប់យក GPS បច្ចុប្បន្ន")</p>
            )}

            <div>
              <label className="block text-xs sm:text-[11px] font-bold text-slate-500 mb-1">អាសយដ្ឋាន / ចំណុចសម្គាល់ចំការ៖</label>
              <input 
                type="text" 
                placeholder="អាសយដ្ឋានចំការ (ទាញយកពីអតិថិជន ឬកែប្រែដោយផ្ទាល់)..." 
                value={locationAddress} 
                onChange={e => setLocationAddress(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px]"
              />
            </div>
          </div>

          {/* ===================== SECTION 4: CROPS INSPECTED ===================== */}
          <CropsEditor
            crops={visitCrops}
            onChange={setVisitCrops}
            title="ព័ត៌មានដំណាំដែលបានចុះពិនិត្យ (ទាញយកពីអតិថិជន)"
          />

          {/* ===================== SECTION 5: FIELD OBSERVATIONS, ISSUES, SOLUTIONS, HISTORY & NOTES ===================== */}
          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm sm:text-xs pb-1.5 border-b border-slate-200">
              <FileText size={16} className="text-emerald-600" />
              <span>ព័ត៌មានស្ថានភាពចម្ការ & ដំណោះស្រាយ</span>
            </div>

            {/* 1. ស្ថានភាពទូទៅនៃចម្ការ */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 text-sm sm:text-xs">
                <Activity size={15} className="text-emerald-600" />
                <span>ស្ថានភាពទូទៅនៃចម្ការ</span>
              </label>
              <input 
                type="text" 
                value={cropStatus} 
                onChange={e => setCropStatus(e.target.value)} 
                placeholder="ឧ. ស្លឹកចាស់ល្អស្មើគ្នា តែមានសញ្ញាត្រួយ ចេញមកតិចតួច..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            {/* 2. បញ្ហាប្រឈម */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 text-sm sm:text-xs">
                <AlertCircle size={15} className="text-amber-500" />
                <span>បញ្ហាប្រឈម</span>
              </label>
              <input 
                type="text" 
                value={issuesIdentified} 
                onChange={e => setIssuesIdentified(e.target.value)} 
                placeholder="ឧ. ពីងពាងក្រហម, កើតជំងឺតាមគល់, ចៃស្រកា..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            {/* 3. ដំណោះស្រាយ */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 text-sm sm:text-xs">
                <Package size={15} className="text-emerald-600" />
                <span>ដំណោះស្រាយ (ផលិតផលណែនាំ / វិធានការ)</span>
              </label>
              <input 
                type="text" 
                value={productsRecommended} 
                onChange={e => setProductsRecommended(e.target.value)} 
                placeholder="ឧ. ផ្តាច់ទឹកបន្ត, បាញ់ ប៉ារីដា, ស្រោច កាឡាក់សុី, អាបា..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            {/* 4. ប្រវត្តិប្រើប្រាស់របស់កសិករ */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 text-sm sm:text-xs">
                <FileText size={15} className="text-slate-600" />
                <span>ប្រវត្តិប្រើប្រាស់របស់កសិករ</span>
              </label>
              <input 
                type="text" 
                value={farmerHistory} 
                onChange={e => setFarmerHistory(e.target.value)} 
                placeholder="ឧ. ស្រែមាស, ធ្លាប់ប្រើជី..., ធ្លាប់ប្រើថ្នាំ..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 min-h-[44px] sm:min-h-[38px] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            {/* 5. ចំណាំបន្ថែម (ទទេតាមលំនាំដើម មិនចាប់យកព័ត៌មានដែលមិនបានបញ្ចូលឡើយ) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 text-sm sm:text-xs">
                <FileText size={15} className="text-slate-600" />
                <span>ចំណាំបន្ថែម</span>
              </label>
              <textarea 
                rows={2}
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="ចំណាំផ្សេងៗ (បើមាន)..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs resize-none"
              />
            </div>
          </div>

          {/* Photos Upload & Existing Photos */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5 text-sm sm:text-xs">
                <Camera size={15} className="text-slate-500" />
                <span>រូបភាពចំការ</span>
              </label>
              <span className="text-xs sm:text-[10px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 font-medium">
                <Clock size={12} />
                <span>រក្សាទុក ៧ថ្ងៃ</span>
              </span>
            </div>
            
            {/* Existing Photos (if editing) */}
            {existingPhotos.length > 0 && (
              <div className="mb-2.5">
                <span className="text-xs sm:text-[10px] text-slate-500 font-bold block mb-1.5">រូបភាពដែលមានស្រាប់៖</span>
                <div className="grid grid-cols-3 gap-2">
                  {existingPhotos.map((url, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-square group">
                      <img src={url} alt={`Existing ${idx}`} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveExistingPhoto(idx)} 
                        title="លុបរូបភាពនេះ"
                        className="absolute top-1.5 right-1.5 bg-rose-600 text-white p-1.5 rounded-full shadow hover:bg-rose-700 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Compression Savings Banner */}
            {photoFiles.length > 0 && photoMeta.length > 0 && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs sm:text-[11px] text-emerald-800 font-semibold mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={15} className="text-emerald-600 shrink-0" />
                  <span>
                    បន្ថយទំហំរួច៖ {formatFileSize(photoMeta.reduce((s, m) => s + (m.originalSize || 0), 0))} មកសល់ {formatFileSize(photoMeta.reduce((s, m) => s + (m.compressedSize || 0), 0))}
                  </span>
                </div>
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-xs sm:text-[10px] font-bold shrink-0">
                  សន្សំ -{Math.round(((photoMeta.reduce((s, m) => s + (m.originalSize || 0), 0) - photoMeta.reduce((s, m) => s + (m.compressedSize || 0), 0)) / (photoMeta.reduce((s, m) => s + (m.originalSize || 0), 0) || 1)) * 100)}%
                </span>
              </div>
            )}

            {isCompressing ? (
              <div className="flex items-center justify-center gap-2 border-2 border-emerald-300 bg-emerald-50 rounded-2xl p-4 text-emerald-800 font-bold text-sm sm:text-xs animate-pulse min-h-[50px]">
                <RefreshCw size={18} className="animate-spin text-emerald-600" />
                <span>កំពុងបន្ថយទំហំ និងគុណភាពរូបភាព (Compressing)...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl p-4 cursor-pointer text-emerald-700 font-bold text-sm sm:text-xs transition-colors min-h-[50px]">
                  <Camera size={20} />
                  <span>+ ថែមរូបភាពថ្មី (បន្ថយទំហំស្វ័យប្រវត្តិ)</span>
                  <input 
                    type="file" 
                    accept="image/*,.heic,.heif,image/heic,image/heif" 
                    multiple 
                    onChange={handlePhotoSelect} 
                    className="hidden" 
                  />
                </label>
              </div>
            )}

            {/* New Photo Previews */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2.5">
                {photoPreviews.map((src, idx) => {
                  const meta = photoMeta[idx];
                  return (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-square group">
                      <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveNewPhoto(idx)} 
                        className="absolute top-1.5 right-1.5 bg-rose-600 text-white p-1.5 rounded-full shadow hover:bg-rose-700 transition-colors z-10"
                      >
                        <X size={14} />
                      </button>
                      {meta && (
                        <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[10px] px-1 py-0.5 text-center font-mono truncate">
                          {formatFileSize(meta.compressedSize)} (-{meta.savingsPercent}%)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-xs sm:text-[10px] text-slate-500 flex items-center gap-1.5 mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <Clock size={14} className="text-amber-600 shrink-0" />
              <span>រូបភាពត្រូវបានបន្ថយទំហំស្វ័យប្រវត្តិដើម្បី Upload លឿន និងលុបចេញពីប្រព័ន្ធក្រោយរយៈពេល ៧ថ្ងៃ។</span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button 
              type="button" 
              onClick={handleSubmitVisit} 
              disabled={isSubmitting}
              className={`w-full text-white font-bold py-3.5 sm:py-3 rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2 text-base sm:text-sm min-h-[50px] sm:min-h-[44px] disabled:opacity-50 cursor-pointer ${
                duplicateFrom 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : (visitToEdit ? 'bg-slate-900 hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700')
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>កំពុងរក្សាទុក...</span>
                </>
              ) : (
                <>
                  {duplicateFrom ? <Copy size={18} /> : <CheckCircle2 size={18} />}
                  <span>
                    {duplicateFrom 
                      ? 'រក្សាទុកកំណត់ត្រាថ្មី (ដែលបានចម្លង)' 
                      : (visitToEdit ? 'រក្សាទុកការកែប្រែ' : 'រក្សាទុកកំណត់ត្រាចុះចំការ')}
                  </span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

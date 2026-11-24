import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Users, UserPlus, Shield, Key, Phone, Mail, Calendar, 
  MapPin, CheckCircle2, XCircle, Edit, Trash2, Search, 
  Lock, Eye, EyeOff, Copy, Check, AlertTriangle, ShieldCheck,
  Building, UserCheck, RefreshCw, X, Camera, Clock, Sparkles, HardDrive, Database, Download
} from 'lucide-react';
import { calculateAge, formatDateDMY, toInputDateFormat, SQL_SCHEMA_SCRIPT, hasPermission, DEFAULT_USER_PERMISSIONS, ADMIN_FULL_PERMISSIONS, formatPhoneNumber, handlePhoneInputChange } from '../staffUtils';
import { cleanupExpiredVisitPhotos, getPhotoRetentionStats } from '../imageUtils';
import BackupRestoreModal from './BackupRestoreModal';

// Default initial admin in case Supabase table is not yet migrated
const DEFAULT_INITIAL_ADMIN = {
  id: 'local-admin-001',
  name: 'Admin ប្រព័ន្ធ',
  gender: 'ប្រុស',
  phone: '012 345 678',
  dob: '1992-05-15',
  email: 'admin@sremeas.com',
  role: 'Admin',
  branch: 'ការិយាល័យកណ្តាល',
  username: 'admin',
  password: 'admin123',
  status: 'សកម្ម',
  permissions: { ...ADMIN_FULL_PERMISSIONS },
  created_at: new Date().toISOString()
};

export default function AdminDashboard({ currentUser, onStaffListChanged, visits = [], onRefreshVisits }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');

  // Photo retention & storage cleanup state
  const [isCleaningPhotos, setIsCleaningPhotos] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState('');

  // Schema notice & SQL copy state
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [gender, setGender] = useState('ប្រុស');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('បុគ្គលិកទីផ្សារ');
  const [branch, setBranch] = useState('កំពង់ចាម');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('សកម្ម');

  // Permissions Matrix state for each list (Visits, Customers, Staff, Reports & Maps)
  const [permVisitsView, setPermVisitsView] = useState(true);
  const [permVisitsCreate, setPermVisitsCreate] = useState(true);
  const [permVisitsEdit, setPermVisitsEdit] = useState(true);
  const [permVisitsDelete, setPermVisitsDelete] = useState(false);

  const [permCustomersView, setPermCustomersView] = useState(true);
  const [permCustomersCreate, setPermCustomersCreate] = useState(true);
  const [permCustomersEdit, setPermCustomersEdit] = useState(true);
  const [permCustomersDelete, setPermCustomersDelete] = useState(false);

  const [permStaffView, setPermStaffView] = useState(false);
  const [permStaffCreate, setPermStaffCreate] = useState(false);
  const [permStaffEdit, setPermStaffEdit] = useState(false);
  const [permStaffDelete, setPermStaffDelete] = useState(false);

  const [permReportsView, setPermReportsView] = useState(true);
  const [permReportsExport, setPermReportsExport] = useState(true);
  const [permMapView, setPermMapView] = useState(true);

  // Quick permission helpers
  const applyAllPermissions = (val) => {
    setPermVisitsView(val);
    setPermVisitsCreate(val);
    setPermVisitsEdit(val);
    setPermVisitsDelete(val);

    setPermCustomersView(val);
    setPermCustomersCreate(val);
    setPermCustomersEdit(val);
    setPermCustomersDelete(val);

    setPermStaffView(val);
    setPermStaffCreate(val);
    setPermStaffEdit(val);
    setPermStaffDelete(val);

    setPermReportsView(val);
    setPermReportsExport(val);
    setPermMapView(val);
  };

  const applyDefaultPermissions = () => {
    setPermVisitsView(true);
    setPermVisitsCreate(true);
    setPermVisitsEdit(true);
    setPermVisitsDelete(false);

    setPermCustomersView(true);
    setPermCustomersCreate(true);
    setPermCustomersEdit(true);
    setPermCustomersDelete(false);

    setPermStaffView(false);
    setPermStaffCreate(false);
    setPermStaffEdit(false);
    setPermStaffDelete(false);

    setPermReportsView(true);
    setPermReportsExport(true);
    setPermMapView(true);
  };

  // Show/Hide passwords in table
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Live calculated age from form DOB
  const liveAge = calculateAge(dob);

  const canCreateStaff = currentUser?.role === 'Admin' || hasPermission(currentUser, 'can_create_staff', false);
  const canEditStaff = currentUser?.role === 'Admin' || hasPermission(currentUser, 'can_edit_staff', false);
  const canDeleteStaff = currentUser?.role === 'Admin' || hasPermission(currentUser, 'can_delete_staff', false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('staff').select('*').order('name', { ascending: true });
      if (error) {
        console.warn("Supabase staff table error:", error.message);
        // If table doesn't exist, use localStorage fallback
        setIsTableMissing(true);
        loadLocalStaffFallback();
      } else {
        setIsTableMissing(false);
        setStaffList(data || []);
      }
    } catch (err) {
      console.error("Staff fetch error:", err);
      setIsTableMissing(true);
      loadLocalStaffFallback();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalStaffFallback = () => {
    try {
      const stored = localStorage.getItem('sremeas_local_staff');
      if (stored) {
        setStaffList(JSON.parse(stored));
      } else {
        const initial = [DEFAULT_INITIAL_ADMIN];
        localStorage.setItem('sremeas_local_staff', JSON.stringify(initial));
        setStaffList(initial);
      }
    } catch (e) {
      setStaffList([DEFAULT_INITIAL_ADMIN]);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleTogglePassword = (id) => {
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setGender('ប្រុស');
    setPhone('');
    setDob('');
    setEmail('');
    setRole('បុគ្គលិកទីផ្សារ');
    setBranch('កំពង់ចាម');
    setUsername('');
    setPassword('');
    setStatus('សកម្ម');
    applyDefaultPermissions();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingStaff(s);
    setName(s.name || '');
    setGender(s.gender || 'ប្រុស');
    setPhone(formatPhoneNumber(s.phone || ''));
    setDob(toInputDateFormat(s.dob));
    setEmail(s.email || '');
    setRole(s.role || 'បុគ្គលិកទីផ្សារ');
    setBranch(s.branch || 'កំពង់ចាម');
    setUsername(s.username || '');
    setPassword(s.password || '');
    setStatus(s.status || 'សកម្ម');

    const perms = s.permissions || {};
    const isAdminRole = s.role === 'Admin';

    // Visits
    setPermVisitsView(isAdminRole ? true : (perms.can_view_visits !== false));
    setPermVisitsCreate(isAdminRole ? true : (perms.can_create_visit !== false));
    setPermVisitsEdit(isAdminRole ? true : (perms.can_edit_visit !== false));
    setPermVisitsDelete(isAdminRole ? true : Boolean(perms.can_delete_visit));

    // Customers
    setPermCustomersView(isAdminRole ? true : (perms.can_view_customers !== false));
    setPermCustomersCreate(isAdminRole ? true : (perms.can_create_customer !== false));
    setPermCustomersEdit(isAdminRole ? true : (perms.can_edit_customer !== false));
    setPermCustomersDelete(isAdminRole ? true : Boolean(perms.can_delete_customer));

    // Staff
    const hasLegacyManageStaff = Boolean(perms.can_manage_staff);
    setPermStaffView(isAdminRole ? true : Boolean(perms.can_view_staff || hasLegacyManageStaff));
    setPermStaffCreate(isAdminRole ? true : Boolean(perms.can_create_staff || hasLegacyManageStaff));
    setPermStaffEdit(isAdminRole ? true : Boolean(perms.can_edit_staff || hasLegacyManageStaff));
    setPermStaffDelete(isAdminRole ? true : Boolean(perms.can_delete_staff));

    // Reports & Maps
    setPermReportsView(isAdminRole ? true : (perms.can_view_reports !== false));
    setPermReportsExport(isAdminRole ? true : (perms.can_export_reports !== false));
    setPermMapView(isAdminRole ? true : (perms.can_view_map !== false));

    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("សូមបញ្ចូលឈ្មោះបុគ្គលិក!");
    if (!username.trim()) return alert("សូមបញ្ចូល Username!");
    if (!password.trim()) return alert("សូមបញ្ចូល Password!");

    setIsSaving(true);
    const permissionsObj = role === 'Admin' ? { ...ADMIN_FULL_PERMISSIONS } : {
      // 1. បញ្ជីចុះចំការ
      can_view_visits: permVisitsView,
      can_create_visit: permVisitsCreate,
      can_edit_visit: permVisitsEdit,
      can_delete_visit: permVisitsDelete,

      // 2. បញ្ជីអតិថិជន
      can_view_customers: permCustomersView,
      can_create_customer: permCustomersCreate,
      can_edit_customer: permCustomersEdit,
      can_delete_customer: permCustomersDelete,

      // 3. បញ្ជីបុគ្គលិក
      can_view_staff: permStaffView,
      can_create_staff: permStaffCreate,
      can_edit_staff: permStaffEdit,
      can_delete_staff: permStaffDelete,
      can_manage_staff: permStaffView || permStaffCreate || permStaffEdit, // for backward compatibility

      // 4. របាយការណ៍ & ផែនទី
      can_view_reports: permReportsView,
      can_export_reports: permReportsExport,
      can_view_map: permMapView,
    };

    const payload = {
      name: name.trim(),
      gender: gender || 'ប្រុស',
      phone: formatPhoneNumber(phone) || null,
      dob: dob || null,
      email: email.trim() || null,
      role: role || 'បុគ្គលិកទីផ្សារ',
      branch: branch || 'ទូទៅ',
      username: username.trim().toLowerCase(),
      password: password.trim(),
      status: status || 'សកម្ម',
      permissions: permissionsObj
    };

    try {
      if (!isTableMissing) {
        if (editingStaff) {
          const { error } = await supabase.from('staff').update(payload).eq('id', editingStaff.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('staff').insert([payload]);
          if (error) throw error;
        }
        await fetchStaff();
      } else {
        // LocalStorage fallback mode
        let currentList = [...staffList];
        if (editingStaff) {
          currentList = currentList.map(item => item.id === editingStaff.id ? { ...item, ...payload } : item);
        } else {
          const newEntry = {
            id: 'local-' + Date.now(),
            ...payload,
            created_at: new Date().toISOString()
          };
          currentList.push(newEntry);
        }
        localStorage.setItem('sremeas_local_staff', JSON.stringify(currentList));
        setStaffList(currentList);
      }

      alert(editingStaff ? "បានកែប្រែព័ត៌មានបុគ្គលិកជោគជ័យ!" : "បានបង្កើតគណនីបុគ្គលិកថ្មីជោគជ័យ!");
      setIsModalOpen(false);
      if (onStaffListChanged) onStaffListChanged();
    } catch (err) {
      alert("មានបញ្ហាក្នុងការរក្សាទុក: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = async (staffMember) => {
    if (staffMember.username === 'admin' && staffList.filter(s => s.role === 'Admin').length <= 1) {
      return alert("មិនអាចលុបគណនី Admin ចម្បងរបស់ប្រព័ន្ធបានទេ!");
    }
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបបុគ្គលិក "${staffMember.name}" (${staffMember.username}) មែនទេ?`)) return;

    try {
      if (!isTableMissing) {
        const { error } = await supabase.from('staff').delete().eq('id', staffMember.id);
        if (error) throw error;
        await fetchStaff();
      } else {
        const updated = staffList.filter(s => s.id !== staffMember.id);
        localStorage.setItem('sremeas_local_staff', JSON.stringify(updated));
        setStaffList(updated);
      }
      alert("បានលុបបុគ្គលិករួចរាល់!");
      if (onStaffListChanged) onStaffListChanged();
    } catch (err) {
      alert("មិនអាចលុបបានទេ: " + err.message);
    }
  };

  const handleToggleStatus = async (staffMember) => {
    const newStatus = staffMember.status === 'សកម្ម' ? 'ផ្អាក' : 'សកម្ម';
    try {
      if (!isTableMissing) {
        const { error } = await supabase.from('staff').update({ status: newStatus }).eq('id', staffMember.id);
        if (error) throw error;
        await fetchStaff();
      } else {
        const updated = staffList.map(s => s.id === staffMember.id ? { ...s, status: newStatus } : s);
        localStorage.setItem('sremeas_local_staff', JSON.stringify(updated));
        setStaffList(updated);
      }
      if (onStaffListChanged) onStaffListChanged();
    } catch (err) {
      alert("មិនអាចផ្លាស់ប្តូរស្ថានភាពបានទេ: " + err.message);
    }
  };

  // Filter staff list
  const filteredStaff = staffList.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchSearch = 
      (s.name || '').toLowerCase().includes(q) ||
      (s.username || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.branch || '').toLowerCase().includes(q);

    const matchRole = filterRole === 'All' || s.role === filterRole;
    const matchStatus = filterStatus === 'All' || s.status === filterStatus;
    const matchBranch = filterBranch === 'All' || s.branch === filterBranch;

    return matchSearch && matchRole && matchStatus && matchBranch;
  });

  const branches = ['All', ...Array.from(new Set(staffList.map(s => s.branch).filter(Boolean)))];

  // 7-day photo retention & cleanup statistics
  const photoStats = getPhotoRetentionStats(visits, 7);

  const handleCleanExpiredPhotos = async () => {
    if (photoStats.expiredPhotosCount === 0 && photoStats.visitsWithExpiredPhotos === 0) {
      alert("បច្ចុប្បន្នគ្មានរូបភាពចាស់លើសពី ៧ថ្ងៃ ដែលត្រូវសម្អាតទេ!");
      return;
    }

    if (!window.confirm(`តើអ្នកពិតជាចង់សម្អាតរូបភាពចាស់ៗទាំងអស់ដែលលើសពី ៧ថ្ងៃ (ចំនួន ${photoStats.expiredPhotosCount} សន្លឹក ក្នុង ${photoStats.visitsWithExpiredPhotos} កំណត់ត្រា) ចេញពី Cloud Storage និង Database មែនទេ?`)) {
      return;
    }

    setIsCleaningPhotos(true);
    setCleanupMessage('');
    try {
      const res = await cleanupExpiredVisitPhotos(supabase, 7);
      if (res.success) {
        setCleanupMessage(`បានសម្អាតដោយជោគជ័យ! រូបភាពចំនួន ${res.photosDeleted} សន្លឹក ត្រូវបានលុបចេញពី Cloud Storage។`);
        if (onRefreshVisits) onRefreshVisits();
      } else {
        alert("ការសម្អាតមិនបានជោគជ័យ: " + res.error);
      }
    } catch (err) {
      alert("កំហុសក្នុងការសម្អាត: " + err.message);
    } finally {
      setIsCleaningPhotos(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* SQL Migration Banner if table missing in Supabase */}
      {isTableMissing && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm font-bold block mb-1">
                  ត្រូវការដំណើរការ SQL Script លើ Supabase ដើម្បីបង្កើតតារាងបុគ្គលិក (Staff)
                </strong>
                <p className="text-amber-800 leading-relaxed">
                  ដើម្បីឱ្យទិន្នន័យបុគ្គលិក និងសិទ្ធិអាចរក្សាទុកក្នុង Database Online បានគ្រប់ពេល សូមចូលទៅកាន់ 
                  <strong> Supabase SQL Editor</strong> រួច Run កូដខាងក្រោម (ឬចុចប៊ូតុងខាងស្តាំដើម្បី Copy)។ បច្ចុប្បន្នប្រព័ន្ធដំណើរការជាបណ្តោះអាសន្នលើ Local Memory។
                </p>
              </div>
            </div>
            <button
              onClick={handleCopySql}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
            >
              {copiedSql ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedSql ? 'បានចម្លង!' : 'ចម្លងកូដ SQL'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">បុគ្គលិកសរុប</span>
            <Users size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{staffList.length} នាក់</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
            សកម្ម៖ {staffList.filter(s => s.status === 'សកម្ម').length} នាក់
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">អ្នកគ្រប់គ្រង (Admin)</span>
            <ShieldCheck size={16} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {staffList.filter(s => s.role === 'Admin').length} នាក់
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">សិទ្ធិគ្រប់គ្រងពេញលេញ</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">បុគ្គលិកទីផ្សារ</span>
            <UserCheck size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {staffList.filter(s => s.role === 'បុគ្គលិកទីផ្សារ' || s.role === 'Field Marketing').length} នាក់
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">ចុះជួបកសិករផ្ទាល់</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">សាខាប្រតិបត្តិការ</span>
            <Building size={16} className="text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {new Set(staffList.map(s => s.branch).filter(Boolean)).size || 1} សាខា
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">តាមបណ្តាខេត្ត</div>
        </div>
      </div>

      {/* Storage & Photo Retention Card (7-Day Policy) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-100 shrink-0">
              <Camera size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">
                  ការគ្រប់គ្រងទំហំផ្ទុក & រូបភាព (គោលការណ៍រក្សាទុក ៧ថ្ងៃ)
                </h3>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  ស្វ័យប្រវត្តិ
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                រូបភាពពេល Upload ត្រូវបានបន្ថយទំហំស្វ័យប្រវត្តិតាម Canvas (សន្សំទំហំ ~95%) ហើយរូបភាពចាស់លើសពី ៧ថ្ងៃ នឹងត្រូវលុបចេញពី Cloud Storage ដើម្បីសន្សំទំហំផ្ទុក។
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCleanExpiredPhotos}
              disabled={isCleaningPhotos}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                photoStats.expiredPhotosCount > 0 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              } disabled:opacity-50`}
            >
              {isCleaningPhotos ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              <span>
                {isCleaningPhotos 
                  ? 'កំពុងសម្អាត...' 
                  : photoStats.expiredPhotosCount > 0 
                    ? `សម្អាតរូបភាពផុតកំណត់ (${photoStats.expiredPhotosCount})` 
                    : 'សម្អាតរូបភាពលើសពី ៧ថ្ងៃ'}
              </span>
            </button>
          </div>
        </div>

        {/* Retention Statistics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="text-[10px] text-slate-500 font-medium">រូបភាពសកម្ម (&le; ៧ថ្ងៃ)</div>
            <div className="text-sm font-bold text-emerald-700 mt-0.5">
              {photoStats.activePhotosCount} សន្លឹក ({photoStats.visitsWithActivePhotos} ចំការ)
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="text-[10px] text-slate-500 font-medium">រូបភាពផុតកំណត់ (&gt; ៧ថ្ងៃ)</div>
            <div className={`text-sm font-bold mt-0.5 ${photoStats.expiredPhotosCount > 0 ? 'text-rose-600 font-black' : 'text-slate-700'}`}>
              {photoStats.expiredPhotosCount} សន្លឹក ({photoStats.visitsWithExpiredPhotos} ចំការ)
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="text-[10px] text-slate-500 font-medium">ការបន្ថយទំហំពេល Upload</div>
            <div className="text-sm font-bold text-emerald-700 mt-0.5">JPEG 72% / 1280px</div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="text-[10px] text-slate-500 font-medium">ដំណើរការសម្អាតស្វ័យប្រវត្តិ</div>
            <div className="text-sm font-bold text-emerald-700 mt-0.5">រៀងរាល់ 12 ម៉ោង</div>
          </div>
        </div>

        {cleanupMessage && (
          <div className="mt-2.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{cleanupMessage}</span>
          </div>
        )}
      </div>

      {/* Data Backup & Disaster Recovery Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-700 border border-blue-100 shrink-0">
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">
                  ការបម្រុងទុក & ស្តារទិន្នន័យ (Data Backup & Recovery)
                </h3>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Zero Data Loss
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                ការពារការបាត់បង់ទិន្នន័យដោយទាញយក Full Backup (.JSON), ឯកសារ SQL Disaster Recovery, ឬ Excel CSV។ អាចស្តារ (Restore) ទិន្នន័យឡើងវិញបានគ្រប់ពេល។
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsBackupModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white transition-all shadow-xs cursor-pointer"
            >
              <Download size={14} />
              <span>គ្រប់គ្រង Backup & Restore</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="ស្វែងរកតាមឈ្មោះ, Username, លេខទូរស័ព្ទ, Email ឬសាខា..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={filterRole} 
              onChange={e => setFilterRole(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់តួនាទី</option>
              <option value="Admin">Admin</option>
              <option value="ប្រធានសាខា">ប្រធានសាខា</option>
              <option value="បុគ្គលិកទីផ្សារ">បុគ្គលិកទីផ្សារ</option>
            </select>

            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់ស្ថានភាព</option>
              <option value="សកម្ម">សកម្ម</option>
              <option value="ផ្អាក">ផ្អាក</option>
            </select>

            {branches.length > 2 && (
              <select 
                value={filterBranch} 
                onChange={e => setFilterBranch(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
              >
                {branches.map((b, i) => (
                  <option key={i} value={b}>{b === 'All' ? 'គ្រប់សាខា' : b}</option>
                ))}
              </select>
            )}

            <button
              onClick={fetchStaff}
              disabled={loading}
              title="ផ្ទុកឡើងវិញ"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">
              សរុប៖ <span className="text-slate-900">{filteredStaff.length}</span>
            </span>

            {canCreateStaff && (
              <button
                onClick={handleOpenAdd}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <UserPlus size={15} />
                <span>បន្ថែមបុគ្គលិកថ្មី</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Staff Table */}
      {filteredStaff.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          មិនមានទិន្នន័យបុគ្គលិកត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">ឈ្មោះបុគ្គលិក</th>
                  <th className="py-3 px-3 whitespace-nowrap">Username / Password</th>
                  <th className="py-3 px-3 whitespace-nowrap">លេខទូរស័ព្ទ / Email</th>
                  <th className="py-3 px-3 whitespace-nowrap">កំណើត / អាយុ</th>
                  <th className="py-3 px-3 whitespace-nowrap">តួនាទី / សាខា</th>
                  <th className="py-3 px-3 whitespace-nowrap">សិទ្ធិប្រើប្រាស់</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">ស្ថានភាព</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap sticky right-0 bg-slate-50 shadow-xs">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map(staffMember => {
                  const calculatedAge = calculateAge(staffMember.dob);
                  const isRevealed = Boolean(revealedPasswords[staffMember.id]);
                  const isCurrentAdmin = staffMember.username === currentUser?.username;

                  return (
                    <tr key={staffMember.id} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* Name & Gender */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            staffMember.gender === 'ស្រី' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {staffMember.name ? staffMember.name[0] : 'U'}
                          </div>
                          <div>
                            <strong className="text-slate-900 block text-xs">
                              {staffMember.name}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-medium">
                              ភេទ៖ {staffMember.gender || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Username & Password */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono text-slate-800 font-bold text-xs flex items-center gap-1">
                          <Key size={11} className="text-slate-400 shrink-0" />
                          <span>{staffMember.username}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 font-mono text-[11px] text-slate-500">
                          <span>{isRevealed ? staffMember.password : '••••••••'}</span>
                          <button
                            type="button"
                            onClick={() => handleTogglePassword(staffMember.id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title={isRevealed ? 'លាក់' : 'បង្ហាញ'}
                          >
                            {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                        </div>
                      </td>

                      {/* Phone & Email */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {staffMember.phone ? (
                          <a href={`tel:${staffMember.phone}`} className="font-mono text-emerald-700 font-bold hover:underline flex items-center gap-1 text-[11px]">
                            <Phone size={11} /> {formatPhoneNumber(staffMember.phone)}
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                        {staffMember.email && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail size={10} className="text-slate-400" />
                            <span className="truncate max-w-[120px]" title={staffMember.email}>{staffMember.email}</span>
                          </div>
                        )}
                      </td>

                      {/* DOB & Auto-Calculated Age */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-slate-800 font-medium flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" />
                          <span>{formatDateDMY(staffMember.dob)}</span>
                        </div>
                        <div className="text-[10px] mt-0.5">
                          {calculatedAge !== null ? (
                            <span className="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold border border-slate-200">
                              អាយុ៖ {calculatedAge} ឆ្នាំ
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </div>
                      </td>

                      {/* Role & Branch */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          staffMember.role === 'Admin'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : staffMember.role === 'ប្រធានសាខា'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {staffMember.role || 'បុគ្គលិក'}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Building size={10} className="text-slate-400" />
                          <span>{staffMember.branch || 'ការិយាល័យកណ្តាល'}</span>
                        </div>
                      </td>

                      {/* Permissions Summary */}
                      <td className="py-2.5 px-3 min-w-[210px]">
                        {staffMember.role === 'Admin' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={11} /> ពេញលេញ (Full Admin)
                          </span>
                        ) : (
                          <div className="space-y-1 text-[10px]">
                            {/* Visits permissions */}
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-600 w-12 shrink-0">ចុះចំការ:</span>
                              <div className="flex gap-0.5">
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${staffMember.permissions?.can_view_visits !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through'}`}>មើល</span>
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${staffMember.permissions?.can_create_visit !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through'}`}>ថែម</span>
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${staffMember.permissions?.can_edit_visit !== false ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-400 line-through'}`}>កែ</span>
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${Boolean(staffMember.permissions?.can_delete_visit) ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-400 line-through'}`}>លុប</span>
                              </div>
                            </div>

                            {/* Customers permissions */}
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-600 w-12 shrink-0">អតិថិជន:</span>
                              <div className="flex gap-0.5">
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${staffMember.permissions?.can_view_customers !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through'}`}>មើល</span>
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${staffMember.permissions?.can_create_customer !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through'}`}>ថែម</span>
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${staffMember.permissions?.can_edit_customer !== false ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-400 line-through'}`}>កែ</span>
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${Boolean(staffMember.permissions?.can_delete_customer) ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-400 line-through'}`}>លុប</span>
                              </div>
                            </div>

                            {/* Staff permissions if allowed */}
                            {(staffMember.permissions?.can_view_staff || staffMember.permissions?.can_manage_staff) && (
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-600 w-12 shrink-0">បុគ្គលិក:</span>
                                <div className="flex gap-0.5">
                                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${Boolean(staffMember.permissions?.can_view_staff || staffMember.permissions?.can_manage_staff) ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-400 line-through'}`}>មើល</span>
                                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${Boolean(staffMember.permissions?.can_create_staff || staffMember.permissions?.can_manage_staff) ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-400 line-through'}`}>ថែម</span>
                                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${Boolean(staffMember.permissions?.can_edit_staff || staffMember.permissions?.can_manage_staff) ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-400 line-through'}`}>កែ</span>
                                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${Boolean(staffMember.permissions?.can_delete_staff) ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-400 line-through'}`}>លុប</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(staffMember)}
                          title="ចុចដើម្បីប្តូរស្ថានភាព"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            staffMember.status === 'សកម្ម'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {staffMember.status === 'សកម្ម' ? (
                            <>
                              <CheckCircle2 size={11} />
                              <span>សកម្ម</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={11} />
                              <span>ផ្អាក</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50/80 transition-colors shadow-xs">
                        <div className="flex items-center justify-center gap-1">
                          {canEditStaff && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(staffMember)}
                              title="កែប្រែ"
                              className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 cursor-pointer"
                            >
                              <Edit size={13} />
                            </button>
                          )}

                          {canDeleteStaff && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(staffMember)}
                              title="លុប"
                              disabled={isCurrentAdmin}
                              className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
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
      )}

      {/* ======================== BACKUP & RESTORE MODAL ======================== */}
      <BackupRestoreModal 
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        supabase={supabase}
        currentUser={currentUser}
        fallbackStaff={staffList}
        onDataRestored={() => {
          onRefreshVisits?.();
          onStaffListChanged?.();
        }}
      />

      {/* ======================== ADD / EDIT STAFF MODAL ======================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg my-8 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden text-xs">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Shield size={17} className="text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {editingStaff ? 'កែប្រែព័ត៌មានបុគ្គលិក & សិទ្ធិ' : 'បន្ថែមគណនីបុគ្គលិកថ្មី'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStaff} className="p-5 max-h-[80vh] overflow-y-auto space-y-3.5">
              
              {/* Name & Gender */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">ឈ្មោះបុគ្គលិក *</label>
                  <input 
                    type="text" 
                    required 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="ឧ. សុខ សាន"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ភេទ</label>
                  <select 
                    value={gender} 
                    onChange={e => setGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  >
                    <option value="ប្រុស">ប្រុស</option>
                    <option value="ស្រី">ស្រី</option>
                  </select>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">លេខទូរស័ព្ទ</label>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={e => setPhone(handlePhoneInputChange(e.target.value, phone))} 
                    placeholder="012 345 678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="sokhsan@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* DOB & Auto-Calculated Age Display */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <Calendar size={13} className="text-slate-500" />
                    <span>ថ្ងៃខែឆ្នាំកំណើត (DOB)</span>
                  </label>
                  <input 
                    type="date" 
                    value={dob} 
                    onChange={e => setDob(e.target.value)} 
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">អាយុ (គណនាដោយស្វ័យប្រវត្តិ)</label>
                  <div className="h-8 flex items-center px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-800">
                    {liveAge !== null ? `${liveAge} ឆ្នាំ` : <span className="text-slate-400 font-normal">ជ្រើសរើសថ្ងៃកំណើត</span>}
                  </div>
                </div>
              </div>

              {/* Role & Branch */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">តួនាទី</label>
                  <select 
                    value={role} 
                    onChange={e => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  >
                    <option value="បុគ្គលិកទីផ្សារ">បុគ្គលិកទីផ្សារ (Field Marketing)</option>
                    <option value="ប្រធានសាខា">ប្រធានសាខា (Branch Manager)</option>
                    <option value="Admin">Admin (គ្រប់គ្រងប្រព័ន្ធ)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">សាខា</label>
                  <input 
                    type="text" 
                    value={branch} 
                    onChange={e => setBranch(e.target.value)} 
                    placeholder="ឧ. កំពង់ចាម"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <Key size={13} className="text-slate-500" />
                    <span>Username សម្រាប់ Login *</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    placeholder="ឧ. sokhsan"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <Lock size={13} className="text-slate-500" />
                    <span>Password *</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="លេខសម្ងាត់..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Status & Granular Permissions */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 block">ស្ថានភាពគណនី</label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold"
                  >
                    <option value="សកម្ម">សកម្ម (Active)</option>
                    <option value="ផ្អាក">ផ្អាក (Inactive)</option>
                  </select>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">
                        កំណត់សិទ្ធិប្រើប្រាស់តាមបញ្ជីនីមួយៗ (Permissions Matrix)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        កំណត់សិទ្ធិ មើល, បន្ថែម, កែប្រែ, លុប សម្រាប់ User នេះ
                      </span>
                    </div>

                    {role !== 'Admin' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyAllPermissions(true)}
                          className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                        >
                          ជ្រើសទាំងអស់
                        </button>
                        <button
                          type="button"
                          onClick={applyDefaultPermissions}
                          className="text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                        >
                          លំនាំដើម
                        </button>
                        <button
                          type="button"
                          onClick={() => applyAllPermissions(false)}
                          className="text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                        >
                          ដកទាំងអស់
                        </button>
                      </div>
                    )}
                  </div>

                  {role === 'Admin' ? (
                    <div className="text-xs text-blue-800 font-bold bg-blue-50 p-2.5 rounded-xl border border-blue-200 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-blue-600 shrink-0" />
                      <span>តួនាទី Admin មានសិទ្ធិពេញលេញលើបញ្ជី និងមុខងារទាំងអស់ដោយស្វ័យប្រវត្តិ (Full Access)។</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                            <th className="py-2 px-3">ឈ្មោះបញ្ជី / មុខងារ</th>
                            <th className="py-2 px-2 text-center w-14">មើល</th>
                            <th className="py-2 px-2 text-center w-14">បន្ថែម</th>
                            <th className="py-2 px-2 text-center w-14">កែប្រែ</th>
                            <th className="py-2 px-2 text-center w-14">លុប</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {/* Row 1: Visits */}
                          <tr className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-bold text-slate-800">
                              <span className="block">១. បញ្ជីចុះចំការ</span>
                              <span className="text-[10px] text-slate-400 font-normal">Field Visits Tracker</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permVisitsView} onChange={e => setPermVisitsView(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permVisitsCreate} onChange={e => setPermVisitsCreate(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permVisitsEdit} onChange={e => setPermVisitsEdit(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permVisitsDelete} onChange={e => setPermVisitsDelete(e.target.checked)} className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer" />
                            </td>
                          </tr>

                          {/* Row 2: Customers */}
                          <tr className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-bold text-slate-800">
                              <span className="block">២. បញ្ជីអតិថិជន</span>
                              <span className="text-[10px] text-slate-400 font-normal">Customers & Farmers</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permCustomersView} onChange={e => setPermCustomersView(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permCustomersCreate} onChange={e => setPermCustomersCreate(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permCustomersEdit} onChange={e => setPermCustomersEdit(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permCustomersDelete} onChange={e => setPermCustomersDelete(e.target.checked)} className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer" />
                            </td>
                          </tr>

                          {/* Row 3: Staff */}
                          <tr className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-bold text-slate-800">
                              <span className="block">៣. បញ្ជីបុគ្គលិក</span>
                              <span className="text-[10px] text-slate-400 font-normal">Staff & System Accounts</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permStaffView} onChange={e => setPermStaffView(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permStaffCreate} onChange={e => setPermStaffCreate(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permStaffEdit} onChange={e => setPermStaffEdit(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input type="checkbox" checked={permStaffDelete} onChange={e => setPermStaffDelete(e.target.checked)} className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer" />
                            </td>
                          </tr>

                          {/* Row 4: Reports & Maps */}
                          <tr className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-bold text-slate-800">
                              <span className="block">៤. របាយការណ៍ & ផែនទី</span>
                              <span className="text-[10px] text-slate-400 font-normal">Analytics, Export & Map</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <label className="inline-flex flex-col items-center gap-0.5 cursor-pointer">
                                <input type="checkbox" checked={permReportsView} onChange={e => setPermReportsView(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                                <span className="text-[9px] text-slate-400">របាយការណ៍</span>
                              </label>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <label className="inline-flex flex-col items-center gap-0.5 cursor-pointer">
                                <input type="checkbox" checked={permReportsExport} onChange={e => setPermReportsExport(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                                <span className="text-[9px] text-slate-400">ទាញយក</span>
                              </label>
                            </td>
                            <td className="py-2 px-2 text-center" colSpan={2}>
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={permMapView} onChange={e => setPermMapView(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                                <span className="text-[10px] text-slate-700 font-bold">មើលផែនទី (Map)</span>
                              </label>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>{isSaving ? 'កំពុងរក្សាទុក...' : (editingStaff ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតបុគ្គលិក')}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Users, UserPlus, Shield, Key, Phone, Mail, Calendar, 
  MapPin, CheckCircle2, XCircle, Edit, Trash2, Search, 
  Lock, Eye, EyeOff, Copy, Check, AlertTriangle, ShieldCheck,
  Building, UserCheck, RefreshCw, X
} from 'lucide-react';
import { calculateAge, formatDateDMY, toInputDateFormat, SQL_SCHEMA_SCRIPT } from '../staffUtils';

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
  permissions: {
    can_manage_staff: true,
    can_edit_customer: true,
    can_delete_customer: true,
    can_delete_visit: true,
    can_export_reports: true,
  },
  created_at: new Date().toISOString()
};

export default function AdminDashboard({ currentUser, onStaffListChanged }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');

  // Schema notice & SQL copy state
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

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

  // Permissions state
  const [permManageStaff, setPermManageStaff] = useState(false);
  const [permEditCustomer, setPermEditCustomer] = useState(true);
  const [permDeleteCustomer, setPermDeleteCustomer] = useState(false);
  const [permDeleteVisit, setPermDeleteVisit] = useState(false);
  const [permExportReports, setPermExportReports] = useState(true);

  // Show/Hide passwords in table
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Live calculated age from form DOB
  const liveAge = calculateAge(dob);

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
    setPermManageStaff(false);
    setPermEditCustomer(true);
    setPermDeleteCustomer(false);
    setPermDeleteVisit(false);
    setPermExportReports(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingStaff(s);
    setName(s.name || '');
    setGender(s.gender || 'ប្រុស');
    setPhone(s.phone || '');
    setDob(toInputDateFormat(s.dob));
    setEmail(s.email || '');
    setRole(s.role || 'បុគ្គលិកទីផ្សារ');
    setBranch(s.branch || 'កំពង់ចាម');
    setUsername(s.username || '');
    setPassword(s.password || '');
    setStatus(s.status || 'សកម្ម');

    const perms = s.permissions || {};
    setPermManageStaff(Boolean(perms.can_manage_staff || s.role === 'Admin'));
    setPermEditCustomer(perms.can_edit_customer !== false);
    setPermDeleteCustomer(Boolean(perms.can_delete_customer || s.role === 'Admin'));
    setPermDeleteVisit(Boolean(perms.can_delete_visit || s.role === 'Admin'));
    setPermExportReports(perms.can_export_reports !== false);

    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("សូមបញ្ចូលឈ្មោះបុគ្គលិក!");
    if (!username.trim()) return alert("សូមបញ្ចូល Username!");
    if (!password.trim()) return alert("សូមបញ្ចូល Password!");

    setIsSaving(true);
    const permissionsObj = {
      can_manage_staff: role === 'Admin' ? true : permManageStaff,
      can_edit_customer: role === 'Admin' ? true : permEditCustomer,
      can_delete_customer: role === 'Admin' ? true : permDeleteCustomer,
      can_delete_visit: role === 'Admin' ? true : permDeleteVisit,
      can_export_reports: role === 'Admin' ? true : permExportReports,
    };

    const payload = {
      name: name.trim(),
      gender: gender || 'ប្រុស',
      phone: phone.trim() || null,
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

            <button
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <UserPlus size={15} />
              <span>បន្ថែមបុគ្គលិកថ្មី</span>
            </button>
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
                            <Phone size={11} /> {staffMember.phone}
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
                      <td className="py-2.5 px-3 max-w-[160px]">
                        {staffMember.role === 'Admin' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={11} /> ពេញលេញ (Full Admin)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {staffMember.permissions?.can_manage_staff && (
                              <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-medium">គ្រប់គ្រងបុគ្គលិក</span>
                            )}
                            {staffMember.permissions?.can_edit_customer && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">កែអតិថិជន</span>
                            )}
                            {staffMember.permissions?.can_delete_customer && (
                              <span className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 font-medium">លុបអតិថិជន</span>
                            )}
                            {staffMember.permissions?.can_delete_visit && (
                              <span className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 font-medium">លុបកំណត់ត្រា</span>
                            )}
                            {!staffMember.permissions?.can_manage_staff && 
                             !staffMember.permissions?.can_delete_customer && 
                             !staffMember.permissions?.can_delete_visit && (
                              <span className="text-[10px] text-slate-400">សិទ្ធិស្តង់ដារ</span>
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
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(staffMember)}
                            title="កែប្រែ"
                            className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                          >
                            <Edit size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staffMember)}
                            title="លុប"
                            disabled={isCurrentAdmin}
                            className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <Trash2 size={13} />
                          </button>
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
                    onChange={e => setPhone(e.target.value)} 
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

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 block text-[11px] uppercase">
                    សិទ្ធិប្រើប្រាស់ក្នុងប្រព័ន្ធ (Permissions)
                  </span>

                  {role === 'Admin' ? (
                    <div className="text-[11px] text-blue-700 font-bold bg-blue-50 p-2 rounded-lg border border-blue-200 flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      <span>តួនាទី Admin មានសិទ្ធិគ្រប់គ្រងពេញលេញទាំងអស់ដោយស្វ័យប្រវត្តិ។</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={permManageStaff} 
                          onChange={e => setPermManageStaff(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500" 
                        />
                        <span className="text-slate-700">អនុញ្ញាតឱ្យមើល និងគ្រប់គ្រងបញ្ជីបុគ្គលិក (Staff Management)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={permEditCustomer} 
                          onChange={e => setPermEditCustomer(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500" 
                        />
                        <span className="text-slate-700">អនុញ្ញាតឱ្យបន្ថែម និងកែប្រែទិន្នន័យអតិថិជន</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={permDeleteCustomer} 
                          onChange={e => setPermDeleteCustomer(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500" 
                        />
                        <span className="text-slate-700">អនុញ្ញាតឱ្យលុបទិន្នន័យអតិថិជន</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={permDeleteVisit} 
                          onChange={e => setPermDeleteVisit(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500" 
                        />
                        <span className="text-slate-700">អនុញ្ញាតឱ្យលុបកំណត់ត្រាចុះចំការ</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={permExportReports} 
                          onChange={e => setPermExportReports(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500" 
                        />
                        <span className="text-slate-700">អនុញ្ញាតឱ្យទាញយករបាយការណ៍សង្ខេប</span>
                      </label>
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

import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Plus, Map, ClipboardList, Users, RefreshCw, Sprout, ShieldCheck, LogOut, User, BarChart3, Database, PhoneCall } from 'lucide-react';
import BackupRestoreModal from './components/BackupRestoreModal';

import VisitList from './components/VisitList';
import MapView from './components/MapView';
import CustomerList from './components/CustomerList';
import AdminDashboard from './components/AdminDashboard';
import LoginScreen from './components/LoginScreen';
import NewVisitModal from './components/NewVisitModal';
import VisitDetailModal from './components/VisitDetailModal';
import ReportsView from './components/ReportsView';
import EditProfileModal from './components/EditProfileModal';
import CallList from './components/CallList';
import NewCallModal from './components/NewCallModal';
import { getStaffList, hasPermission, getStaffPhotoUrl } from './staffUtils';
import { deleteVisitPhotosFromStorage, cleanupExpiredVisitPhotos } from './imageUtils';
import { fetchCustomerCalls } from './callUtils';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sremeas_logged_in_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('visits'); // 'visits' | 'reports' | 'calls' | 'map' | 'customers' | 'admin'
  const [visits, setVisits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [visitToEdit, setVisitToEdit] = useState(null);
  const [duplicateFrom, setDuplicateFrom] = useState(null);
  const [preselectedCustomer, setPreselectedCustomer] = useState(null);
  const [selectedVisitDetail, setSelectedVisitDetail] = useState(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isNewCallModalOpen, setIsNewCallModalOpen] = useState(false);
  const [callPreselectedCustomer, setCallPreselectedCustomer] = useState(null);

  // Silent background auto-backup synchronization
  useEffect(() => {
    if (visits.length > 0 || customers.length > 0) {
      try {
        const snapshot = {
          app: 'sremeas-field',
          appNameKh: 'ស្រែមាស - ចុះចំការ',
          exportedAt: new Date().toISOString(),
          stats: {
            totalCustomers: customers.length,
            totalVisits: visits.length,
            totalStaff: staffList.length
          },
          data: {
            customers,
            field_visits: visits.map(v => {
              const { customers: _c, ...raw } = v;
              return raw;
            }),
            staff: staffList
          }
        };
        localStorage.setItem('sremeas_auto_backup_latest', JSON.stringify(snapshot));
        localStorage.setItem('sremeas_auto_backup_timestamp', new Date().toISOString());
      } catch (err) {
        // Ignore quota warning
      }
    }
  }, [visits, customers, staffList]);

  useEffect(() => {
    if (currentUser) {
      fetchAll();
      triggerAutoCleanup();
    }
  }, [currentUser]);

  // Automatic background photo cleanup: deletes photos > 7 days old (throttled to once every 12 hours)
  const triggerAutoCleanup = async () => {
    try {
      const lastCheck = localStorage.getItem('sremeas_last_photo_cleanup');
      const now = Date.now();
      if (!lastCheck || (now - parseInt(lastCheck, 10)) > 43200000) {
        const res = await cleanupExpiredVisitPhotos(supabase, 7);
        localStorage.setItem('sremeas_last_photo_cleanup', now.toString());
        if (res.photosDeleted > 0) {
          console.log(`[AutoCleanup] Cleaned up ${res.photosDeleted} photos from ${res.visitsCleaned} visits (> 7 days).`);
          fetchVisits();
        }
      }
    } catch (e) {
      console.warn("Auto cleanup notice:", e);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchVisits(), fetchCustomers(), fetchStaff(), fetchCalls()]);
    setLoading(false);
  };

  const fetchCalls = async () => {
    try {
      const data = await fetchCustomerCalls(supabase);
      if (data) setCalls(data);
    } catch (err) {
      console.warn("Exception fetching calls:", err);
    }
  };

  const fetchStaff = async () => {
    const list = await getStaffList(supabase);
    if (list) {
      setStaffList(list);
      if (currentUser) {
        const freshUser = list.find(s => (s.id && s.id === currentUser.id) || (s.username && s.username === currentUser.username));
        if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
          setCurrentUser(freshUser);
          localStorage.setItem('sremeas_logged_in_user', JSON.stringify(freshUser));
        }
      }
    }
  };

  const fetchVisits = async () => {
    try {
      let allVisits = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('field_visits')
          .select('*, customers(*)')
          .order('visit_date', { ascending: false })
          .range(from, from + step - 1);

        if (error) {
          console.error("Error fetching visits:", error);
          break;
        }
        if (!data || data.length === 0) break;
        allVisits = allVisits.concat(data);
        if (data.length < step) break;
        from += step;
      }
      setVisits(allVisits);
    } catch (err) {
      console.error("Exception fetching visits:", err);
    }
  };

  const fetchCustomers = async () => {
    try {
      let allCust = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('name', { ascending: true })
          .range(from, from + step - 1);

        if (error) {
          console.error("Error fetching customers:", error);
          break;
        }
        if (!data || data.length === 0) break;
        allCust = allCust.concat(data);
        if (data.length < step) break;
        from += step;
      }
      setCustomers(allCust);
    } catch (err) {
      console.error("Exception fetching customers:", err);
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveTab('visits');
  };

  const handleLogout = () => {
    if (window.confirm("តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធមែនទេ?")) {
      localStorage.removeItem('sremeas_logged_in_user');
      setCurrentUser(null);
    }
  };

  const handleOpenNewVisit = () => {
    if (!canCreateVisit) {
      return alert("អ្នកមិនមានសិទ្ធិកត់ត្រាការចុះចំការថ្មីទេ! សូមទាក់ទង Admin។");
    }
    setVisitToEdit(null);
    setDuplicateFrom(null);
    setPreselectedCustomer(null);
    setIsNewVisitOpen(true);
  };

  const handleEditVisit = (visit) => {
    if (!canEditVisit) {
      return alert("អ្នកមិនមានសិទ្ធិកែប្រែកំណត់ត្រាចុះចំការទេ! សូមទាក់ទង Admin។");
    }
    setDuplicateFrom(null);
    setPreselectedCustomer(null);
    setVisitToEdit(visit);
    setIsNewVisitOpen(true);
  };

  const handleDuplicateVisit = (visit) => {
    if (!canCreateVisit) {
      return alert("អ្នកមិនមានសិទ្ធិចម្លង ឬកត់ត្រាការចុះចំការថ្មីទេ! សូមទាក់ទង Admin។");
    }
    setVisitToEdit(null);
    setPreselectedCustomer(null);
    setDuplicateFrom(visit);
    setIsNewVisitOpen(true);
  };

  const handleDeleteVisit = async (visit) => {
    if (!canDeleteVisit) {
      return alert("អ្នកមិនមានសិទ្ធិលុបកំណត់ត្រាចុះចំការទេ! សូមទាក់ទង Admin។");
    }

    const custName = visit.customers?.name || 'ម្ចាស់ចំការ';
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបកំណត់ត្រាចុះចំការរបស់ "${custName}" មែនទេ?`)) return;

    try {
      // Clean up physical photos from storage if any
      if (Array.isArray(visit.photos) && visit.photos.length > 0) {
        await deleteVisitPhotosFromStorage(supabase, visit.photos);
      }

      const { error } = await supabase.from('field_visits').delete().eq('id', visit.id);
      if (error) throw error;

      alert("បានលុបកំណត់ត្រាចុះចំការរួចរាល់!");
      fetchVisits();
      if (selectedVisitDetail?.id === visit.id) setSelectedVisitDetail(null);
    } catch (err) {
      alert("មិនអាចលុបបានទេ: " + err.message);
    }
  };

  const handleVisitCreatedOrUpdated = () => {
    fetchVisits();
    setVisitToEdit(null);
    setDuplicateFrom(null);
  };

  const handleCustomerCreated = (newCust) => {
    setCustomers(prev => [...prev, newCust].sort((a,b) => (a.name||'').localeCompare(b.name||'')));
  };

  const handleCustomerUpdated = (updatedCust) => {
    setCustomers(prev => prev.map(c => c.id === updatedCust.id ? updatedCust : c));
    fetchVisits(); // refresh visit list to reflect updated customer name/phone
  };

  const handleCustomerDeleted = (deletedId) => {
    setCustomers(prev => prev.filter(c => c.id !== deletedId));
  };

  const handleSelectCustomerForVisit = (cust) => {
    if (!canCreateVisit) {
      return alert("អ្នកមិនមានសិទ្ធិកត់ត្រាការចុះចំការថ្មីទេ! សូមទាក់ទង Admin។");
    }
    setVisitToEdit(null);
    setDuplicateFrom(null);
    setPreselectedCustomer(cust);
    setIsNewVisitOpen(true);
  };

  // Permission checks
  const canViewVisits = hasPermission(currentUser, 'can_view_visits', true);
  const canCreateVisit = hasPermission(currentUser, 'can_create_visit', true);
  const canEditVisit = hasPermission(currentUser, 'can_edit_visit', true);
  const canDeleteVisit = hasPermission(currentUser, 'can_delete_visit', false);

  const canViewCustomers = hasPermission(currentUser, 'can_view_customers', true);
  const canCreateCustomer = hasPermission(currentUser, 'can_create_customer', true);
  const canEditCustomer = hasPermission(currentUser, 'can_edit_customer', true);
  const canDeleteCustomer = hasPermission(currentUser, 'can_delete_customer', false);

  const canViewStaff = currentUser?.role === 'Admin' || hasPermission(currentUser, 'can_view_staff', false) || Boolean(currentUser?.permissions?.can_manage_staff);
  const canViewReports = hasPermission(currentUser, 'can_view_reports', true);
  const canViewMap = hasPermission(currentUser, 'can_view_map', true);
  const isAdmin = canViewStaff;

  // Auto redirect if active tab is not permitted
  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'visits' && !canViewVisits) {
      if (canViewCustomers) setActiveTab('customers');
      else if (canViewReports) setActiveTab('reports');
      else if (canViewMap) setActiveTab('map');
      else if (canViewStaff) setActiveTab('admin');
    } else if (activeTab === 'customers' && !canViewCustomers) {
      if (canViewVisits) setActiveTab('visits');
      else if (canViewReports) setActiveTab('reports');
    } else if (activeTab === 'reports' && !canViewReports) {
      if (canViewVisits) setActiveTab('visits');
    } else if (activeTab === 'map' && !canViewMap) {
      if (canViewVisits) setActiveTab('visits');
    } else if (activeTab === 'admin' && !canViewStaff) {
      if (canViewVisits) setActiveTab('visits');
    }
  }, [currentUser, activeTab, canViewVisits, canViewCustomers, canViewReports, canViewMap, canViewStaff]);

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-16 md:pb-6">
      
      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sprout size={20} />
            </div>
            <div>
              <h1 className="font-black text-sm md:text-base text-slate-900 leading-tight">ស្រែមាស - ចុះចំការ</h1>
              <p className="text-[10px] text-slate-500 font-bold">Field Marketing & Visit Tracker</p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2">
            
            {/* User Badge / Profile Button */}
            <button 
              type="button"
              onClick={() => setIsEditProfileOpen(true)}
              title="ចុចដើម្បីកែប្រែ Profile / ប្តូររូបថត"
              className="flex items-center gap-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 px-2 py-1 sm:px-2.5 sm:py-1 rounded-xl text-xs transition-all cursor-pointer group"
            >
              {getStaffPhotoUrl(currentUser) ? (
                <img 
                  src={getStaffPhotoUrl(currentUser)} 
                  alt={currentUser.name} 
                  className="w-7 h-7 rounded-lg object-cover aspect-square border border-emerald-400 group-hover:scale-105 transition-transform shrink-0" 
                />
              ) : (
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  currentUser.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {currentUser.name ? currentUser.name[0] : 'U'}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <span className="font-bold text-slate-800 group-hover:text-emerald-900 block text-[11px] leading-tight">
                  {currentUser.name}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                  currentUser.role === 'Admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {currentUser.role} {currentUser.branch ? `• ${currentUser.branch}` : ''}
                </span>
              </div>
            </button>

            <button 
              onClick={fetchAll} 
              disabled={loading}
              title="ផ្ទុកទិន្នន័យឡើងវិញ"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            {isAdmin && (
              <button 
                onClick={() => setIsBackupModalOpen(true)}
                title="Backup & Restore ទិន្នន័យ"
                className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200 hover:border-emerald-200"
              >
                <Database size={14} className="text-emerald-600" />
                <span>Backup</span>
              </button>
            )}

            {canCreateVisit && (
              <button 
                onClick={handleOpenNewVisit}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>ចុះចំការថ្មី</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              title="ចាកចេញពីប្រព័ន្ធ (Logout)"
              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200"
            >
              <LogOut size={16} />
            </button>
          </div>

        </div>
      </header>

      {/* DESKTOP NAV TABS */}
      <div className="max-w-5xl w-full mx-auto px-4 pt-4 hidden md:block">
        <div className="flex bg-slate-200/80 p-1 rounded-xl w-fit">
          {canViewVisits && (
            <button 
              onClick={() => setActiveTab('visits')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'visits' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList size={14} />
              <span>កំណត់ត្រាចុះចំការ ({visits.length})</span>
            </button>
          )}

          {canViewReports && (
            <button 
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'reports' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 size={14} className={activeTab === 'reports' ? 'text-emerald-600' : 'text-slate-500'} />
              <span>របាយការណ៍ & ក្រាហ្វិក</span>
            </button>
          )}

          <button 
            onClick={() => setActiveTab('calls')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'calls' ? 'bg-white text-sky-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PhoneCall size={14} className={activeTab === 'calls' ? 'text-sky-600' : 'text-slate-500'} />
            <span>សួរសុខទុក្ខ ({calls.length})</span>
          </button>

          {canViewMap && (
            <button 
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map size={14} />
              <span>ផែនទីចំការ (Heatmap)</span>
            </button>
          )}

          {canViewCustomers && (
            <button 
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'customers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={14} />
              <span>បញ្ជីអតិថិជន ({customers.length})</span>
            </button>
          )}

          {canViewStaff && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'admin' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck size={14} className="text-blue-600" />
              <span>គ្រប់គ្រងបុគ្គលិក (Admin)</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-5xl w-full mx-auto p-4 flex-1">
        {loading && visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <RefreshCw size={24} className="animate-spin text-emerald-600" />
            <span className="text-xs font-bold">កំពុងទាញយកទិន្នន័យ...</span>
          </div>
        ) : (
          <>
            {activeTab === 'visits' && (
              <VisitList 
                visits={visits} 
                onSelectVisit={(v) => setSelectedVisitDetail(v)}
                onEditVisit={handleEditVisit}
                onDuplicateVisit={handleDuplicateVisit}
                onDeleteVisit={handleDeleteVisit}
                onOpenNewVisit={handleOpenNewVisit}
                currentUser={currentUser}
                staffList={staffList}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView 
                visits={visits}
                customers={customers}
                staffList={staffList}
                currentUser={currentUser}
                onSelectVisit={(v) => setSelectedVisitDetail(v)}
              />
            )}

            {activeTab === 'calls' && (
              <CallList 
                calls={calls}
                onRefreshCalls={fetchCalls}
                customers={customers}
                currentUser={currentUser}
                staffList={staffList}
                supabase={supabase}
              />
            )}

            {activeTab === 'map' && (
              <MapView 
                visits={visits} 
                onSelectVisit={(v) => setSelectedVisitDetail(v)} 
              />
            )}

            {activeTab === 'customers' && (
              <CustomerList 
                customers={customers} 
                onOpenNewCustomer={handleOpenNewVisit}
                onSelectCustomerForVisit={handleSelectCustomerForVisit}
                onOpenNewCall={(c) => {
                  setCallPreselectedCustomer(c);
                  setIsNewCallModalOpen(true);
                }}
                onCustomerCreated={handleCustomerCreated}
                onCustomerUpdated={handleCustomerUpdated}
                onCustomerDeleted={handleCustomerDeleted}
                currentUser={currentUser}
                staffList={staffList}
              />
            )}

            {activeTab === 'admin' && isAdmin && (
              <AdminDashboard 
                currentUser={currentUser}
                visits={visits}
                onRefreshVisits={fetchVisits}
                onStaffListChanged={() => {
                  fetchVisits();
                  fetchStaff();
                }}
              />
            )}
          </>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-1.5 px-2 shadow-lg">
        {canViewVisits && (
          <button 
            onClick={() => setActiveTab('visits')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
              activeTab === 'visits' ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            <ClipboardList size={18} />
            <span>កំណត់ត្រា</span>
          </button>
        )}

        {canViewReports && (
          <button 
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
              activeTab === 'reports' ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            <BarChart3 size={18} />
            <span>របាយការណ៍</span>
          </button>
        )}

        <button 
          onClick={() => setActiveTab('calls')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
            activeTab === 'calls' ? 'text-sky-700' : 'text-slate-400'
          }`}
        >
          <PhoneCall size={18} />
          <span>សួរសុខទុក្ខ</span>
        </button>

        {/* Center Primary Action: + ចុះចំការ */}
        {canCreateVisit && (
          <button 
            type="button"
            onClick={handleOpenNewVisit}
            className="flex flex-col items-center justify-center -mt-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white w-12 h-12 rounded-full shadow-lg border-2 border-white transition-all shrink-0 cursor-pointer"
            title="កត់ត្រាការចុះចំការថ្មី"
          >
            <Plus size={24} />
          </button>
        )}

        {canViewMap && (
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
              activeTab === 'map' ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            <Map size={18} />
            <span>ផែនទី</span>
          </button>
        )}

        {canViewCustomers && (
          <button 
            onClick={() => setActiveTab('customers')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
              activeTab === 'customers' ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            <Users size={18} />
            <span>អតិថិជន</span>
          </button>
        )}

        {canViewStaff && (
          <button 
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
              activeTab === 'admin' ? 'text-blue-700' : 'text-slate-400'
            }`}
          >
            <ShieldCheck size={18} />
            <span>បុគ្គលិក</span>
          </button>
        )}
      </nav>

      {/* MODALS */}
      <NewVisitModal 
        isOpen={isNewVisitOpen}
        visitToEdit={visitToEdit}
        duplicateFrom={duplicateFrom}
        preselectedCustomer={preselectedCustomer}
        onClose={() => {
          setIsNewVisitOpen(false);
          setVisitToEdit(null);
          setDuplicateFrom(null);
          setPreselectedCustomer(null);
        }}
        onVisitCreated={handleVisitCreatedOrUpdated}
        customers={customers}
        onCustomerCreated={handleCustomerCreated}
        onCustomerUpdated={handleCustomerUpdated}
        currentUser={currentUser}
        staffList={staffList}
      />

      <VisitDetailModal 
        visit={selectedVisitDetail}
        onDuplicateVisit={handleDuplicateVisit}
        currentUser={currentUser}
        staffList={staffList}
        onClose={() => setSelectedVisitDetail(null)}
      />

      {/* Backup & Restore Modal */}
      <BackupRestoreModal 
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        supabase={supabase}
        currentUser={currentUser}
        fallbackStaff={staffList}
        onDataRestored={() => {
          fetchAll();
        }}
      />

      {/* Edit My Profile Modal (Self-service) */}
      <EditProfileModal 
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser}
        supabase={supabase}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          fetchStaff();
        }}
      />

      {/* New Customer Call Modal (Triggered from Customer List shortcut or elsewhere) */}
      <NewCallModal 
        isOpen={isNewCallModalOpen}
        onClose={() => {
          setIsNewCallModalOpen(false);
          setCallPreselectedCustomer(null);
        }}
        onCallSaved={() => {
          fetchCalls();
        }}
        customers={customers}
        currentUser={currentUser}
        preselectedCustomer={callPreselectedCustomer}
        supabase={supabase}
      />

    </div>
  );
}

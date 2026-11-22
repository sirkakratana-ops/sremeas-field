import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Plus, Map, ClipboardList, Users, RefreshCw, Sprout, ShieldCheck, LogOut, User } from 'lucide-react';

import VisitList from './components/VisitList';
import MapView from './components/MapView';
import CustomerList from './components/CustomerList';
import AdminDashboard from './components/AdminDashboard';
import LoginScreen from './components/LoginScreen';
import NewVisitModal from './components/NewVisitModal';
import VisitDetailModal from './components/VisitDetailModal';
import { getStaffList } from './staffUtils';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sremeas_logged_in_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('visits'); // 'visits' | 'map' | 'customers' | 'admin'
  const [visits, setVisits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [visitToEdit, setVisitToEdit] = useState(null);
  const [selectedVisitDetail, setSelectedVisitDetail] = useState(null);

  useEffect(() => {
    if (currentUser) {
      fetchAll();
    }
  }, [currentUser]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchVisits(), fetchCustomers(), fetchStaff()]);
    setLoading(false);
  };

  const fetchStaff = async () => {
    const list = await getStaffList(supabase);
    if (list) setStaffList(list);
  };

  const fetchVisits = async () => {
    const { data, error } = await supabase
      .from('field_visits')
      .select('*, customers(*)')
      .order('visit_date', { ascending: false });

    if (error) console.error("Error fetching visits:", error);
    if (data) setVisits(data);
  };

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) console.error("Error fetching customers:", error);
    if (data) setCustomers(data);
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
    setVisitToEdit(null);
    setIsNewVisitOpen(true);
  };

  const handleEditVisit = (visit) => {
    setVisitToEdit(visit);
    setIsNewVisitOpen(true);
  };

  const handleDeleteVisit = async (visit) => {
    const canDelete = currentUser?.role === 'Admin' || Boolean(currentUser?.permissions?.can_delete_visit);
    if (!canDelete) {
      return alert("អ្នកមិនមានសិទ្ធិលុបកំណត់ត្រាចុះចំការទេ! សូមទាក់ទង Admin។");
    }

    const custName = visit.customers?.name || 'ម្ចាស់ចំការ';
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបកំណត់ត្រាចុះចំការរបស់ "${custName}" មែនទេ?`)) return;

    try {
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
    setVisitToEdit(null);
    setIsNewVisitOpen(true);
  };

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.role === 'Admin' || Boolean(currentUser.permissions?.can_manage_staff);

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
              <h1 className="font-black text-sm md:text-base text-slate-900 leading-tight">ស្រែមាន - ចុះចំការ</h1>
              <p className="text-[10px] text-slate-500 font-bold">Field Marketing & Visit Tracker</p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2">
            
            {/* User Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                currentUser.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {currentUser.name ? currentUser.name[0] : 'U'}
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-800 block text-[11px] leading-tight">
                  {currentUser.name}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                  currentUser.role === 'Admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {currentUser.role} {currentUser.branch ? `• ${currentUser.branch}` : ''}
                </span>
              </div>
            </div>

            <button 
              onClick={fetchAll} 
              disabled={loading}
              title="ផ្ទុកទិន្នន័យឡើងវិញ"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            <button 
              onClick={handleOpenNewVisit}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={15} />
              <span>ចុះចំការថ្មី</span>
            </button>

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
          <button 
            onClick={() => setActiveTab('visits')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'visits' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList size={14} />
            <span>កំណត់ត្រាចុះចំការ ({visits.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Map size={14} />
            <span>ផែនទីចំការ (Heatmap)</span>
          </button>

          <button 
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'customers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={14} />
            <span>បញ្ជីអតិថិជន ({customers.length})</span>
          </button>

          {isAdmin && (
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
                onDeleteVisit={handleDeleteVisit}
                onOpenNewVisit={handleOpenNewVisit}
                currentUser={currentUser}
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
                onCustomerCreated={handleCustomerCreated}
                onCustomerUpdated={handleCustomerUpdated}
                onCustomerDeleted={handleCustomerDeleted}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'admin' && isAdmin && (
              <AdminDashboard 
                currentUser={currentUser}
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-2 px-2 shadow-lg">
        <button 
          onClick={() => setActiveTab('visits')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
            activeTab === 'visits' ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          <ClipboardList size={18} />
          <span>កំណត់ត្រា</span>
        </button>

        <button 
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
            activeTab === 'map' ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          <Map size={18} />
          <span>ផែនទី</span>
        </button>

        <button 
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
            activeTab === 'customers' ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          <Users size={18} />
          <span>អតិថិជន</span>
        </button>

        {isAdmin && (
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
        onClose={() => {
          setIsNewVisitOpen(false);
          setVisitToEdit(null);
        }}
        onVisitCreated={handleVisitCreatedOrUpdated}
        customers={customers}
        onCustomerCreated={handleCustomerCreated}
        currentUser={currentUser}
        staffList={staffList}
      />

      <VisitDetailModal 
        visit={selectedVisitDetail}
        onClose={() => setSelectedVisitDetail(null)}
      />

    </div>
  );
}

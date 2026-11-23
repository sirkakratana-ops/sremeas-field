import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Sprout, Lock, User, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { ADMIN_FULL_PERMISSIONS } from '../staffUtils';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!username.trim() || !password.trim()) {
      setErrorMessage("សូមបញ្ចូល Username និង Password!");
      return;
    }

    setLoading(true);
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // 1. Try querying Supabase 'staff' table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (staffData && !staffError) {
        if (staffData.password !== cleanPassword) {
          setErrorMessage("Password មិនត្រឹមត្រូវទេ!");
          setLoading(false);
          return;
        }

        if (staffData.status === 'ផ្អាក') {
          setErrorMessage("គណនីរបស់អ្នកត្រូវបានផ្អាកដំណើរការបណ្តោះអាសន្ន។ សូមទាក់ទង Admin!");
          setLoading(false);
          return;
        }

        // Login success with Supabase user
        localStorage.setItem('sremeas_logged_in_user', JSON.stringify(staffData));
        localStorage.setItem('sremeas_staff_name', staffData.name || '');
        onLoginSuccess(staffData);
        return;
      }

      // 2. If table doesn't exist or query failed, check local storage fallback
      const storedLocal = localStorage.getItem('sremeas_local_staff');
      let localStaffList = [];
      if (storedLocal) {
        try {
          localStaffList = JSON.parse(storedLocal);
        } catch {
          localStaffList = [];
        }
      }

      // Check default initial admin if not in local list
      if (!localStaffList.some(s => s.username === 'admin')) {
        localStaffList.push({
          id: 'local-admin-001',
          name: 'Admin ប្រព័ន្ធ',
          gender: 'ប្រុស',
          phone: '012 345 678',
          role: 'Admin',
          branch: 'ការិយាល័យកណ្តាល',
          username: 'admin',
          password: 'admin123',
          status: 'សកម្ម',
          permissions: { ...ADMIN_FULL_PERMISSIONS }
        });
        localStorage.setItem('sremeas_local_staff', JSON.stringify(localStaffList));
      }

      const matched = localStaffList.find(s => s.username?.toLowerCase() === cleanUsername);
      if (matched) {
        if (matched.password !== cleanPassword) {
          setErrorMessage("Password មិនត្រឹមត្រូវទេ!");
          setLoading(false);
          return;
        }

        if (matched.status === 'ផ្អាក') {
          setErrorMessage("គណនីរបស់អ្នកត្រូវបានផ្អាកបណ្តោះអាសន្ន!");
          setLoading(false);
          return;
        }

        localStorage.setItem('sremeas_logged_in_user', JSON.stringify(matched));
        localStorage.setItem('sremeas_staff_name', matched.name || '');
        onLoginSuccess(matched);
        return;
      }

      // If user not found in both Supabase and localStorage
      setErrorMessage("រកមិនឃើញ Username នេះក្នុងប្រព័ន្ធទេ!");

    } catch (err) {
      console.error("Login check error:", err);
      setErrorMessage("មានបញ្ហាក្នុងការភ្ជាប់៖ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md mb-3">
            <Sprout size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 leading-tight">ស្រែមាស - ចុះចំការ</h2>
          <p className="text-xs text-slate-500 font-bold mt-1">Field Marketing & Visit Tracker</p>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="font-bold text-slate-700 text-xs block mb-1 flex items-center gap-1">
              <User size={13} className="text-slate-400" />
              <span>Username (ឈ្មោះគណនី)</span>
            </label>
            <input 
              type="text" 
              required
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin ឬ ឈ្មោះបុគ្គលិក..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 text-xs block mb-1 flex items-center gap-1">
              <Lock size={13} className="text-slate-400" />
              <span>Password (លេខសម្ងាត់)</span>
            </label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>កំពុងផ្ទៀងផ្ទាត់...</span>
              </>
            ) : (
              <>
                <span>ចូលប្រព័ន្ធ</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Helper for default credentials */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600">
            <span className="font-bold text-slate-700 block mb-0.5">គណនី Admin ដំបូង៖</span>
            <div className="font-mono text-emerald-800 font-bold">
              User: <span className="text-slate-900">admin</span> | Pass: <span className="text-slate-900">admin123</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

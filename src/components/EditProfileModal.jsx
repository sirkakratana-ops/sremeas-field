import React, { useState, useEffect } from 'react';
import { 
  X, Camera, User, Phone, Lock, Save, Loader2, 
  CheckCircle2, AlertCircle, Eye, EyeOff, Building, 
  ShieldCheck, RefreshCw, Trash2
} from 'lucide-react';
import { 
  formatPhoneNumber, 
  handlePhoneInputChange, 
  getStaffPhotoUrl 
} from '../staffUtils';
import { compressSquareAvatar } from '../imageUtils';

export default function EditProfileModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  onProfileUpdated, 
  supabase 
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('ប្រុស');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setGender(currentUser.gender || 'ប្រុស');
      setPassword(currentUser.password || '');
      const url = getStaffPhotoUrl(currentUser) || '';
      setExistingPhotoUrl(url);
      setPhotoPreview(url);
      setPhotoFile(null);
      setIsPhotoRemoved(false);
      setStatusMessage(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsCompressingPhoto(true);
    try {
      // 1:1 Center crop & compress to 480x480 square avatar
      const res = await compressSquareAvatar(file, { size: 480, quality: 0.85 });
      if (res?.file) {
        setPhotoFile(res.file);
        setPhotoPreview(res.previewUrl);
        setIsPhotoRemoved(false);
      }
    } catch (err) {
      console.error('Failed to compress avatar:', err);
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setIsPhotoRemoved(false);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    setIsPhotoRemoved(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'សូមបញ្ចូលឈ្មោះពេញរបស់អ្នក!' });
      return;
    }
    if (!password.trim()) {
      setStatusMessage({ type: 'error', text: 'សូមបញ្ចូលពាក្យសម្ងាត់!' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      // 1. Upload photo if newly selected
      let finalPhotoUrl = existingPhotoUrl;
      if (isPhotoRemoved) {
        finalPhotoUrl = null;
      } else if (photoFile) {
        const fileExt = photoFile.name?.split('.').pop() || 'jpg';
        const fileName = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `staff/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('visit-photos')
          .upload(filePath, photoFile, {
            contentType: photoFile.type || 'image/jpeg',
            upsert: true
          });

        if (uploadErr) {
          console.warn('Profile photo upload error:', uploadErr);
        } else {
          const { data: pubData } = supabase.storage.from('visit-photos').getPublicUrl(filePath);
          if (pubData?.publicUrl) {
            finalPhotoUrl = pubData.publicUrl;
          }
        }
      }

      // 2. Prepare payload
      const permissionsObj = {
        ...(currentUser.permissions || {}),
        photo_url: finalPhotoUrl
      };

      const payload = {
        name: name.trim(),
        phone: formatPhoneNumber(phone) || null,
        gender,
        password: password.trim(),
        photo_url: finalPhotoUrl,
        permissions: permissionsObj
      };

      // 3. Save to Supabase staff table
      let saveError = null;
      if (currentUser.id) {
        const { error } = await supabase.from('staff').update(payload).eq('id', currentUser.id);
        saveError = error;
      } else if (currentUser.username) {
        const { error } = await supabase.from('staff').update(payload).eq('username', currentUser.username);
        saveError = error;
      }

      // Fallback if column staff.photo_url does not exist in schema cache
      if (saveError && (saveError.message?.includes('column') || saveError.code === '42703' || saveError.code === 'PGRST204')) {
        const { photo_url: _pu, ...fallbackPayload } = payload;
        if (currentUser.id) {
          const { error: err2 } = await supabase.from('staff').update(fallbackPayload).eq('id', currentUser.id);
          saveError = err2;
        } else if (currentUser.username) {
          const { error: err2 } = await supabase.from('staff').update(fallbackPayload).eq('username', currentUser.username);
          saveError = err2;
        }
      }

      if (saveError) {
        throw new Error(saveError.message || 'មិនអាចរក្សាទុកព័ត៌មានបានទេ');
      }

      // 4. Update current user state
      const updatedUser = {
        ...currentUser,
        name: name.trim(),
        phone: formatPhoneNumber(phone) || null,
        gender,
        password: password.trim(),
        photo_url: finalPhotoUrl,
        permissions: permissionsObj
      };

      localStorage.setItem('sremeas_logged_in_user', JSON.stringify(updatedUser));
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      setStatusMessage({ type: 'success', text: 'បានកែប្រែព័ត៌មាន Profile ផ្ទាល់ខ្លួនដោយជោគជ័យ!' });
      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (err) {
      console.error('Error updating profile:', err);
      setStatusMessage({ type: 'error', text: err.message || 'បរាជ័យក្នុងការកែប្រែ Profile' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md my-6 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <User size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">កែប្រែ Profile ផ្ទាល់ខ្លួន</h3>
              <p className="text-[11px] text-slate-300">
                គណនី៖ <b className="text-white font-mono">{currentUser.username}</b>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3 rounded-xl border flex items-start gap-2 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-bold">{statusMessage.text}</span>
            </div>
          )}

          {/* SQUARE PROFILE PHOTO SECTION */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center gap-3">
            <span className="text-[11px] font-bold text-slate-700">រូបថត Profile ផ្ទាល់ខ្លួន (រាងការ៉េ 1:1)</span>
            
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl border-2 border-emerald-500 overflow-hidden aspect-square bg-white shadow-md flex items-center justify-center relative">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Profile Preview" 
                    className="w-full h-full object-cover aspect-square" 
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center gap-1 font-bold">
                    <User size={32} />
                    <span className="text-[10px]">គ្មានរូប</span>
                  </div>
                )}
                {isCompressingPhoto && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                )}
              </div>

              {/* Quick file upload button on avatar */}
              <label className="absolute bottom-[-6px] right-[-6px] bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full shadow-md cursor-pointer transition-transform active:scale-90" title="ប្តូររូបថត Profile">
                <Camera size={14} />
                <input 
                  type="file" 
                  accept="image/*,.heic,.heif,image/heic,image/heif"
                  onChange={handlePhotoSelect}
                  className="hidden" 
                />
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <label className="bg-white hover:bg-slate-100 text-emerald-700 font-bold px-3 py-1.5 rounded-xl border border-emerald-200 cursor-pointer text-xs flex items-center gap-1.5 shadow-2xs">
                <Camera size={13} />
                <span>{photoPreview ? 'ប្តូររូបថ្មី' : '+ ថែមរូបថត'}</span>
                <input 
                  type="file" 
                  accept="image/*,.heic,.heif,image/heic,image/heif"
                  onChange={handlePhotoSelect}
                  className="hidden" 
                />
              </label>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="bg-white hover:bg-rose-50 text-rose-600 font-bold px-2.5 py-1.5 rounded-xl border border-rose-200 text-xs flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Trash2 size={13} />
                  <span>លុបរូប</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              រូបភាពនឹងត្រូវកាត់តម្រឹមជារាងការ៉េស្មើ (Square) ដោយស្វ័យប្រវត្តិ និងបង្ហាញនៅចុងក្រោយនៃរបាយការណ៍ Telegram
            </p>
          </div>

          {/* User Meta (Read Only) */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
            <div>
              <span className="text-slate-400 block font-bold">តួនាទី (Role)</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <ShieldCheck size={12} className="text-blue-600" />
                <span>{currentUser.role || 'បុគ្គលិក'}</span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold">សាខា (Branch)</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Building size={12} className="text-slate-500" />
                <span>{currentUser.branch || 'ការិយាល័យកណ្តាល'}</span>
              </span>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              ឈ្មោះពេញ (Full Name) *
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ឧ. ប៊ុន មករា"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 pl-8 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500"
              />
              <User size={14} className="absolute left-2.5 top-3 text-slate-400" />
            </div>
          </div>

          {/* Gender & Phone */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">ភេទ</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500"
              >
                <option value="ប្រុស">ប្រុស</option>
                <option value="ស្រី">ស្រី</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                លេខទូរស័ព្ទ (012 345 6789)
              </label>
              <div className="relative">
                <input 
                  type="tel" 
                  value={phone}
                  onChange={e => setPhone(handlePhoneInputChange(e.target.value, phone))}
                  placeholder="012 345 678"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 pl-8 text-xs font-bold font-mono text-slate-900 focus:bg-white focus:border-emerald-500"
                />
                <Phone size={14} className="absolute left-2.5 top-3 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              ពាក្យសម្ងាត់ (Password) *
            </label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="បញ្ចូលពាក្យសម្ងាត់ថ្មី"
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 pl-8 pr-9 text-xs font-mono text-slate-900 focus:bg-white focus:border-emerald-500"
              />
              <Lock size={14} className="absolute left-2.5 top-3 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              អ្នកអាចប្តូរពាក្យសម្ងាត់ផ្ទាល់ខ្លួននៅទីនេះបានគ្រប់ពេល
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              បោះបង់
            </button>

            <button
              type="submit"
              disabled={isSaving || isCompressingPhoto}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក Profile'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

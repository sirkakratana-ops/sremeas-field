import React, { useState, useEffect } from 'react';
import { 
  X, Phone, User, Calendar, Clock, Sparkles, Save, 
  Loader2, CheckCircle2, AlertCircle, Building, MapPin, 
  Sprout, FileText, ChevronDown, Plus, Check
} from 'lucide-react';
import { 
  CALL_TYPES, 
  DECISION_SUGGESTIONS, 
  FEEDBACK_SUGGESTIONS, 
  ADVICE_SUGGESTIONS,
  saveCustomerCall 
} from '../callUtils';
import { formatPhoneNumber, formatProvince } from '../staffUtils';

function getLocalDateTimeString(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return new Date().toISOString().slice(0, 16);
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
}

export default function NewCallModal({ 
  isOpen, 
  onClose, 
  onCallSaved, 
  customers = [], 
  currentUser, 
  callToEdit = null,
  preselectedCustomer = null,
  supabase 
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [staffName, setStaffName] = useState('');
  const [branch, setBranch] = useState('ការិយាល័យកណ្តាល');
  const [callDate, setCallDate] = useState(() => getLocalDateTimeString());
  const [callType, setCallType] = useState('សួរសុខទុក្ខទូទៅ');
  
  const [customerFeedback, setCustomerFeedback] = useState('');
  const [teamAdvice, setTeamAdvice] = useState('');
  const [customerDecision, setCustomerDecision] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (callToEdit) {
        setSelectedCustomerId(callToEdit.customer_id || '');
        setCustomerName(callToEdit.customer_name || '');
        setCustomerPhone(callToEdit.customer_phone || '');
        setStaffName(callToEdit.staff_name || currentUser?.name || '');
        setBranch(callToEdit.branch || currentUser?.branch || 'ការិយាល័យកណ្តាល');
        setCallDate(getLocalDateTimeString(callToEdit.call_date));
        setCallType(callToEdit.call_type || 'សួរសុខទុក្ខទូទៅ');
        setCustomerFeedback(callToEdit.customer_feedback || '');
        setTeamAdvice(callToEdit.team_advice || '');
        setCustomerDecision(callToEdit.customer_decision || '');
        setNextFollowupDate(callToEdit.next_followup_date || '');
        setNotes(callToEdit.notes || '');
        setCustomerSearch(callToEdit.customer_name || '');
      } else {
        // New Call Log
        setStaffName(currentUser?.name || localStorage.getItem('sremeas_staff_name') || '');
        setBranch(currentUser?.branch || 'ការិយាល័យកណ្តាល');
        setCallDate(getLocalDateTimeString());
        setCallType('សួរសុខទុក្ខទូទៅ');
        setCustomerFeedback('');
        setTeamAdvice('');
        setCustomerDecision('យល់ព្រមអនុវត្តតាមការណែនាំ');
        setNextFollowupDate('');
        setNotes('');

        if (preselectedCustomer) {
          setSelectedCustomerId(preselectedCustomer.id || '');
          setCustomerName(preselectedCustomer.name || '');
          setCustomerPhone(preselectedCustomer.phone || '');
          setCustomerSearch(preselectedCustomer.name || '');
          if (preselectedCustomer.branch) setBranch(preselectedCustomer.branch);
        } else {
          setSelectedCustomerId('');
          setCustomerName('');
          setCustomerPhone('');
          setCustomerSearch('');
        }
      }
    }
  }, [isOpen, callToEdit, preselectedCustomer, currentUser]);

  if (!isOpen) return null;

  // Filter customers for autocomplete
  const filteredCustomers = customerSearch.trim()
    ? customers.filter(c => 
        (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone || '').includes(customerSearch)
      ).slice(0, 10)
    : customers.slice(0, 8);

  const selectedCustomerObj = customers.find(c => c.id === selectedCustomerId) || 
    (preselectedCustomer && preselectedCustomer.id === selectedCustomerId ? preselectedCustomer : null);

  const handleSelectCustomer = (c) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name || '');
    setCustomerPhone(c.phone || '');
    setCustomerSearch(c.name || '');
    if (c.branch) setBranch(c.branch);
    setIsCustomerDropdownOpen(false);
  };

  const handleAppendFeedback = (phrase) => {
    setCustomerFeedback(prev => {
      const clean = prev.trim();
      return clean ? `${clean} និង ${phrase}` : phrase;
    });
  };

  const handleAppendAdvice = (phrase) => {
    setTeamAdvice(prev => {
      const clean = prev.trim();
      return clean ? `${clean}\n• ${phrase}` : phrase;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('សូមជ្រើសរើស ឬបញ្ចូលឈ្មោះអតិថិជន!');
      return;
    }
    if (!customerFeedback.trim()) {
      setErrorMsg('សូមបញ្ចូលព័ត៌មានទទួលបានពីអតិថិជន!');
      return;
    }
    if (!teamAdvice.trim()) {
      setErrorMsg('សូមបញ្ចូលការណែនាំរបស់ក្រុមការងារ!');
      return;
    }
    if (!customerDecision.trim()) {
      setErrorMsg('សូមបញ្ចូលការសម្រេចចិត្តរបស់អតិថិជន!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const callData = {
        id: callToEdit?.id,
        customer_id: selectedCustomerId || null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        staff_name: staffName.trim() || currentUser?.name || 'Admin',
        branch,
        call_date: new Date(callDate).toISOString(),
        call_type: callType,
        customer_feedback: customerFeedback.trim(),
        team_advice: teamAdvice.trim(),
        customer_decision: customerDecision.trim(),
        next_followup_date: nextFollowupDate || null,
        notes: notes.trim() || null,
        customers: selectedCustomerObj || (callToEdit?.customers ? callToEdit.customers : null)
      };

      const result = await saveCustomerCall(supabase, callData);
      if (onCallSaved) {
        onCallSaved(result);
      }
      onClose();
    } catch (err) {
      console.error('Error saving call log:', err);
      setErrorMsg(err.message || 'បរាជ័យក្នុងការរក្សាទុក');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl my-6 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <Phone size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                {callToEdit ? 'កែប្រែកំណត់ត្រាខលសួរសុខទុក្ខ' : 'កត់ត្រាការខលសួរសុខទុក្ខភ្ញៀវ'}
              </h3>
              <p className="text-[11px] text-slate-300">
                តាមដានការលូតលាស់ និងការសម្រេចចិត្តរបស់អតិថិជន
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
        <form onSubmit={handleSubmit} className="p-5 max-h-[78vh] overflow-y-auto space-y-4 text-xs">

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2 font-bold text-xs">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: CUSTOMER SELECTION & BASIC INFO */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-700 block text-xs">
              ១. ព័ត៌មានអតិថិជន & អ្នកខល
            </span>

            {/* Customer Search / Autocomplete */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                ស្វែងរក ឬជ្រើសរើសអតិថិជន *
              </label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="វាយឈ្មោះ ឬលេខទូរស័ព្ទដើម្បីស្វែងរក..."
                  value={customerSearch}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  onChange={e => {
                    setCustomerSearch(e.target.value);
                    setCustomerName(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 pl-8 text-xs font-bold text-slate-900 focus:border-sky-500"
                />
                <User size={14} className="absolute left-2.5 top-3 text-slate-400" />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearch('');
                      setCustomerName('');
                      setSelectedCustomerId('');
                      setCustomerPhone('');
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {isCustomerDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left p-2 rounded-lg hover:bg-sky-50 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{c.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatPhoneNumber(c.phone) || 'គ្មានលេខ'} {c.province ? `• ${formatProvince(c.province)}` : ''}
                          </span>
                        </div>
                        {selectedCustomerId === c.id && (
                          <Check size={14} className="text-sky-600" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      រកមិនឃើញអតិថិជននេះទេ (អ្នកអាចប្រើឈ្មោះ «{customerSearch}» នេះដោយផ្ទាល់បាន)
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCustomerDropdownOpen(false)}
                    className="w-full text-center py-1 text-[10px] text-slate-400 hover:text-slate-600 border-t border-slate-100 mt-1"
                  >
                    បិទបញ្ជី
                  </button>
                </div>
              )}
            </div>

            {/* Selected Customer Details Banner if selected */}
            {selectedCustomerObj && (
              <div className="p-2.5 bg-sky-50/70 border border-sky-200 rounded-xl flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-bold text-sky-950 block">{selectedCustomerObj.name}</span>
                  <span className="text-slate-600">
                    {formatPhoneNumber(selectedCustomerObj.phone)} • {selectedCustomerObj.commune ? `${selectedCustomerObj.commune}, ` : ''}{formatProvince(selectedCustomerObj.province)}
                  </span>
                </div>
                {selectedCustomerObj.primary_crop && (
                  <span className="bg-white border border-sky-200 text-sky-800 font-bold px-2 py-0.5 rounded-md text-[10px]">
                    {selectedCustomerObj.primary_crop}
                  </span>
                )}
              </div>
            )}

            {/* Customer Phone & Call Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">លេខទូរស័ព្ទអតិថិជន</label>
                <div className="relative">
                  <input 
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="012 345 678"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 pl-8 text-xs font-mono font-bold text-slate-900"
                  />
                  <Phone size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">ប្រភេទការខល</label>
                <select
                  value={callType}
                  onChange={e => setCallType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800"
                >
                  {CALL_TYPES.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Caller & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">អ្នកខល (Staff)</label>
                <input 
                  type="text"
                  value={staffName}
                  onChange={e => setStaffName(e.target.value)}
                  placeholder="ឈ្មោះអ្នកខល"
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">កាលបរិច្ឆេទ & ម៉ោងខល</label>
                <input 
                  type="datetime-local"
                  value={callDate}
                  onChange={e => setCallDate(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ព័ត៌មានទទួលបានពីអតិថិជន (CUSTOMER FEEDBACK) */}
          <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                <FileText size={14} className="text-emerald-600" />
                <span>២. ព័ត៌មានទទួលបានពីអតិថិជន (Customer Feedback) *</span>
              </label>
            </div>
            
            <p className="text-[10px] text-slate-500">
              ស្ថានភាពដំណាំបច្ចុប្បន្ន, ការលូតលាស់, បញ្ហាប្រឈមដែលកសិករកំពុងជួប, ឬសំណួរពីអតិថិជន៖
            </p>

            <textarea 
              rows={3}
              value={customerFeedback}
              onChange={e => setCustomerFeedback(e.target.value)}
              placeholder="ឧ. កសិករប្រាប់ថា ស្វាយចន្ទីលូតលាស់ល្អ តែមានសត្វល្អិតស៊ីត្រួយតិចតួច..."
              required
              className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 text-xs text-slate-800 leading-relaxed focus:border-emerald-500 focus:outline-none"
            />

            {/* Quick Suggestions Pills */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 block">ឃ្លាស្នើឡើងរហ័ស (ចុចដើម្បីថែម)៖</span>
              <div className="flex flex-wrap gap-1">
                {FEEDBACK_SUGGESTIONS.map((phrase, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAppendFeedback(phrase)}
                    className="text-[10px] bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg px-2 py-0.5 transition-colors text-left"
                  >
                    + {phrase}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: ការណែនាំរបស់ក្រុមការងារ (TEAM RECOMMENDATIONS) */}
          <div className="p-3.5 bg-sky-50/50 rounded-2xl border border-sky-200 space-y-2">
            <label className="font-bold text-sky-900 flex items-center gap-1.5 text-xs">
              <Sparkles size={14} className="text-sky-600" />
              <span>៣. ការណែនាំរបស់ក្រុមការងារ (Team Advice) *</span>
            </label>
            
            <p className="text-[10px] text-slate-500">
              ការណែនាំបច្ចេកទេសថែទាំ, វិធីសាស្ត្រប្រើប្រាស់ជី/ថ្នាំ, ឬដំណោះស្រាយដែលបានផ្តល់ជូន៖
            </p>

            <textarea 
              rows={3}
              value={teamAdvice}
              onChange={e => setTeamAdvice(e.target.value)}
              placeholder="ឧ. បានណែនាំឱ្យបាញ់ថ្នាំការពារសត្វល្អិតនៅពេលព្រឹកព្រលឹម និងបន្ថែមជីបំប៉នស្លឹក..."
              required
              className="w-full bg-white border border-sky-300 rounded-xl p-2.5 text-xs text-slate-800 leading-relaxed focus:border-sky-500 focus:outline-none"
            />

            {/* Quick Suggestions Pills */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-sky-800 block">ឃ្លាស្នើឡើងរហ័ស (ចុចដើម្បីថែម)៖</span>
              <div className="flex flex-wrap gap-1">
                {ADVICE_SUGGESTIONS.map((phrase, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAppendAdvice(phrase)}
                    className="text-[10px] bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg px-2 py-0.5 transition-colors text-left"
                  >
                    + {phrase}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: ការសម្រេចចិត្តរបស់អតិថិជន (CUSTOMER DECISION) */}
          <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2.5">
            <label className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
              <CheckCircle2 size={14} className="text-amber-600" />
              <span>៤. ការសម្រេចចិត្តរបស់អតិថិជនក្រោយពីទទួលបានការណែនាំ *</span>
            </label>

            {/* Decision Quick Selection Pills */}
            <div className="grid grid-cols-2 gap-1.5">
              {DECISION_SUGGESTIONS.map((dec, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomerDecision(dec)}
                  className={`p-2 rounded-xl border text-left text-[11px] font-bold transition-all flex items-center justify-between ${
                    customerDecision === dec 
                      ? 'bg-amber-500 text-white border-amber-600 shadow-2xs' 
                      : 'bg-white hover:bg-amber-100/60 text-slate-800 border-amber-200'
                  }`}
                >
                  <span>{dec}</span>
                  {customerDecision === dec && <Check size={13} className="shrink-0" />}
                </button>
              ))}
            </div>

            {/* Editable text for custom decision */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                អត្ថបទការសម្រេចចិត្តលម្អិត៖
              </label>
              <input 
                type="text"
                value={customerDecision}
                onChange={e => setCustomerDecision(e.target.value)}
                placeholder="ឧ. យល់ព្រមអនុវត្តតាមការណែនាំ និងបញ្ជាទិញជីបន្ថែម ២ បាវ..."
                required
                className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:border-amber-500"
              />
            </div>
          </div>

          {/* SECTION 5: FOLLOW UP DATE & NOTES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Calendar size={13} className="text-slate-500" />
                <span>កាលបរិច្ឆេទខលតាមដានលើកក្រោយ</span>
              </label>
              <input 
                type="date"
                value={nextFollowupDate}
                onChange={e => setNextFollowupDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                កំណត់សម្គាល់បន្ថែម
              </label>
              <input 
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ចំណាំផ្សេងៗ..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              បោះបង់
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSubmitting ? 'កំពុងរក្សាទុក...' : (callToEdit ? 'កែប្រែកំណត់ត្រា' : 'រក្សាទុកការខល')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

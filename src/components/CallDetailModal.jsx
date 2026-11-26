import React, { useState } from 'react';
import { 
  X, Phone, User, Calendar, MapPin, Building, 
  Sparkles, CheckCircle2, FileText, Send, Edit, 
  Trash2, Copy, Check, Clock, Sprout 
} from 'lucide-react';
import { formatCallDate, formatCallDateShort, formatCallTelegramText } from '../callUtils';
import { formatPhoneNumber, formatProvince } from '../staffUtils';
import ShareCallModal from './ShareCallModal';

export default function CallDetailModal({ 
  call, 
  isOpen, 
  onClose, 
  onEditCall, 
  onDeleteCall, 
  currentUser 
}) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !call) return null;

  const handleCopy = async () => {
    try {
      const text = formatCallTelegramText(call);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("មិនអាចចម្លងបានទេ");
    }
  };

  const phoneStr = formatPhoneNumber(call.customer_phone || call.customers?.phone);
  const addressParts = [
    call.customers?.village,
    call.customers?.commune,
    call.customers?.district,
    formatProvince(call.customers?.province)
  ].filter(Boolean);
  const addressStr = addressParts.length > 0 ? addressParts.join(', ') : (call.location_address || 'មិនបានបញ្ជាក់');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg my-8 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <Phone size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <span>ព័ត៌មានលម្អិតនៃការខលសួរសុខទុក្ខ</span>
              </h3>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                កាលបរិច្ឆេទ៖ {formatCallDate(call.call_date)}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4 text-xs">

          {/* Caller & Customer Banner */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 text-[10px] font-bold block uppercase">អ្នកខល (Staff)</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 text-sm mt-0.5">
                <User size={14} className="text-sky-600 shrink-0" />
                <span className="truncate">{call.staff_name}</span>
              </span>
              <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-1 font-medium">
                <Building size={11} className="text-slate-400 shrink-0" />
                <span>សាខា៖ <b>{call.branch || 'ការិយាល័យកណ្តាល'}</b></span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] font-bold block uppercase">អតិថិជន</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block truncate">
                {call.customer_name || call.customers?.name || 'មិនស្គាល់'}
              </span>
              {phoneStr && (
                <a href={`tel:${call.customer_phone || call.customers?.phone}`} className="text-emerald-700 text-[11px] font-mono hover:underline flex items-center gap-1 mt-0.5 font-bold">
                  <Phone size={10} />
                  <span>{phoneStr}</span>
                </a>
              )}
            </div>
          </div>

          {/* Customer Location & Crops if any */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-700">
              <MapPin size={13} className="text-rose-500 shrink-0" />
              <span>ទីតាំង៖ <b>{addressStr}</b></span>
            </div>
            {(call.customers?.primary_crop || call.crop_type) && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-800 shadow-2xs">
                <Sprout size={11} className="text-emerald-600" />
                <span>{call.customers?.primary_crop || call.crop_type}</span>
              </div>
            )}
          </div>

          {/* Call Type */}
          <div className="flex items-center justify-between p-2.5 bg-sky-50/60 rounded-xl border border-sky-200 text-xs">
            <span className="font-bold text-sky-900 flex items-center gap-1.5">
              <Phone size={13} className="text-sky-600" />
              <span>ប្រភេទការខល៖</span>
            </span>
            <span className="bg-sky-100 text-sky-800 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
              {call.call_type || 'សួរសុខទុក្ខទូទៅ'}
            </span>
          </div>

          {/* 1. Customer Feedback */}
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-1">
            <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
              <FileText size={13} className="text-emerald-600" />
              <span>ព័ត៌មានទទួលបានពីអតិថិជន (Customer Feedback)៖</span>
            </span>
            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap pl-4 font-medium text-xs">
              {call.customer_feedback || '—'}
            </p>
          </div>

          {/* 2. Team Advice */}
          <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-200 space-y-1">
            <span className="text-[11px] font-bold text-sky-900 flex items-center gap-1">
              <Sparkles size={13} className="text-sky-600" />
              <span>ការណែនាំរបស់ក្រុមការងារ (Team Advice)៖</span>
            </span>
            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap pl-4 font-medium text-xs">
              {call.team_advice || '—'}
            </p>
          </div>

          {/* 3. Customer Decision */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
            <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
              <CheckCircle2 size={13} className="text-amber-600" />
              <span>ការសម្រេចចិត្តរបស់អតិថិជនក្រោយពីទទួលបានការណែនាំ៖</span>
            </span>
            <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-slate-900 font-bold text-xs leading-relaxed">
              {call.customer_decision || '—'}
            </div>
          </div>

          {/* Follow-up Date & Notes */}
          {(call.next_followup_date || call.notes) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
              {call.next_followup_date && (
                <div>
                  <span className="text-slate-400 block font-bold">កាលបរិច្ឆេទតាមដានបន្ត៖</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Calendar size={12} className="text-slate-500" />
                    <span>{formatCallDateShort(call.next_followup_date)}</span>
                  </span>
                </div>
              )}
              {call.notes && (
                <div>
                  <span className="text-slate-400 block font-bold">កំណត់សម្គាល់៖</span>
                  <span className="text-slate-800 block mt-0.5">{call.notes}</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Share to Telegram Bot */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Send size={13} />
              <span>ផ្ញើ Telegram</span>
            </button>

            {/* Copy Text */}
            <button
              type="button"
              onClick={handleCopy}
              className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copied ? 'បានចម្លង!' : 'ចម្លង'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onEditCall && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditCall(call);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Edit size={13} />
                <span>កែប្រែ</span>
              </button>
            )}

            {onDeleteCall && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`តើអ្នកពិតជាចង់លុបកំណត់ត្រាខលរបស់អតិថិជន «${call.customer_name}» មែនទេ?`)) {
                    onDeleteCall(call.id);
                    onClose();
                  }
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold p-1.5 rounded-xl transition-colors cursor-pointer"
                title="លុបកំណត់ត្រា"
              >
                <Trash2 size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              បិទ
            </button>
          </div>
        </div>

      </div>

      {/* Share Modal */}
      <ShareCallModal 
        call={call}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}

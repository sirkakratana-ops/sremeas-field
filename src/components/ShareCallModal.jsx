import React, { useState, useEffect } from 'react';
import { 
  X, Send, Copy, Check, Settings, Bot, ExternalLink, 
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, 
  Loader2, FileText, Phone, Info
} from 'lucide-react';
import { 
  formatCallTelegramText, 
  sendCallViaTelegramBot 
} from '../callUtils';
import { 
  getTelegramSettings, 
  saveTelegramSettings 
} from '../telegramUtils';

export default function ShareCallModal({ call, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [botSettings, setBotSettings] = useState(() => getTelegramSettings());
  const [isSendingBot, setIsSendingBot] = useState(false);
  const [botStatusMessage, setBotStatusMessage] = useState(null);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBotSettings(getTelegramSettings());
      setCopied(false);
      setBotStatusMessage(null);
      setSettingsSavedNotice(false);
    }
  }, [isOpen, call]);

  if (!isOpen || !call) return null;

  const reportText = formatCallTelegramText(call);
  const hasBotConfigured = Boolean(botSettings.botToken && botSettings.chatId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("មិនអាចចម្លងបានទេ");
    }
  };

  const handleOpenTelegramShare = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://www.mkt.sremeas.com')}&text=${encodeURIComponent(reportText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveTelegramSettings(botSettings);
    setSettingsSavedNotice(true);
    setTimeout(() => setSettingsSavedNotice(false), 2000);
  };

  const handleSendViaBot = async () => {
    if (!hasBotConfigured) {
      setShowSettings(true);
      return;
    }

    try {
      setIsSendingBot(true);
      setBotStatusMessage(null);
      await sendCallViaTelegramBot(call, botSettings);
      setBotStatusMessage({
        type: 'success',
        text: `បានផ្ញើរបាយការណ៍ខលសួរសុខទុក្ខចូល Telegram Group «${botSettings.groupName || botSettings.chatId}» ដោយជោគជ័យ!`
      });
    } catch (err) {
      setBotStatusMessage({
        type: 'error',
        text: `បរាជ័យក្នុងការផ្ញើ៖ ${err.message}`
      });
    } finally {
      setIsSendingBot(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg my-6 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-sky-400" />
            <div>
              <h3 className="font-bold text-sm leading-tight">ផ្ញើរបាយការណ៍ខលទៅ Telegram Group</h3>
              <p className="text-[11px] text-slate-300">
                អតិថិជន៖ {call.customer_name || 'មិនស្គាល់'} • {call.staff_name}
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

          {/* Status Alert if any */}
          {botStatusMessage && (
            <div className={`p-3 rounded-xl border flex items-start gap-2 ${
              botStatusMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {botStatusMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="text-xs font-bold leading-relaxed">{botStatusMessage.text}</span>
            </div>
          )}

          {/* Section 1: Bot Send */}
          <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Bot size={15} className="text-sky-600" />
                <span>ផ្ញើស្វ័យប្រវត្តិតាម Telegram Bot</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="text-[11px] text-sky-700 hover:text-sky-900 flex items-center gap-1 font-bold hover:underline"
              >
                <Settings size={12} />
                <span>{showSettings ? 'លាក់ការកំណត់' : (hasBotConfigured ? 'កែប្រែ Bot' : 'កំណត់ Bot')}</span>
                {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {hasBotConfigured ? (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-600">
                  Group គោលដៅ៖ <strong className="text-slate-900 font-mono">{botSettings.groupName || botSettings.chatId}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleSendViaBot}
                  disabled={isSendingBot}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  {isSendingBot ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  <span>{isSendingBot ? 'កំពុងផ្ញើ...' : 'ផ្ញើចូល Telegram Group ភ្លាមៗ'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  សូមបញ្ចូល Telegram Bot Token និង Group Chat ID ដើម្បីអាចផ្ញើសារស្វ័យប្រវត្តិ៖
                </p>
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Settings size={13} />
                  <span>កំណត់ Bot Token & Group ID</span>
                </button>
              </div>
            )}

            {/* Collapsible Settings Form */}
            {showSettings && (
              <form onSubmit={handleSaveSettings} className="pt-2 border-t border-sky-200/80 space-y-2 text-xs bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Telegram Bot Token *</label>
                  <input 
                    type="text" 
                    value={botSettings.botToken}
                    onChange={e => setBotSettings(prev => ({ ...prev, botToken: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Group Chat ID *</label>
                    <input 
                      type="text" 
                      value={botSettings.chatId}
                      onChange={e => setBotSettings(prev => ({ ...prev, chatId: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">ឈ្មោះ Group</label>
                    <input 
                      type="text" 
                      value={botSettings.groupName}
                      onChange={e => setBotSettings(prev => ({ ...prev, groupName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {settingsSavedNotice && (
                    <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                      <Check size={12} /> បានរក្សាទុក!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                  >
                    រក្សាទុកការកំណត់
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Section 2: Copy or Share Link */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-700 block text-xs">ជម្រើសផ្សេងទៀត៖</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleOpenTelegramShare}
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Send size={14} />
                <span>ផ្ញើតាម Telegram Link</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className={`font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border transition-all ${
                  copied 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'បានចម្លងរួចរាល់!' : 'ចម្លងអត្ថបទ'}</span>
              </button>
            </div>
          </div>

          {/* Preview Text */}
          <div className="space-y-1">
            <span className="font-bold text-slate-600 block text-[11px]">
              គំរូអត្ថបទដែលត្រូវផ្ញើ (Message Preview)
            </span>
            <div className="p-3 bg-slate-900 text-sky-300 font-mono text-[11px] rounded-xl border border-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {reportText}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            បិទផ្ទាំង
          </button>
        </div>

      </div>
    </div>
  );
}

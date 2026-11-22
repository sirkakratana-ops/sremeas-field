import React, { useState, useEffect } from 'react';
import { 
  X, Send, Copy, Check, Settings, Bot, ExternalLink, 
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, 
  Loader2, Share2, FileText, MessageSquare 
} from 'lucide-react';
import { 
  formatVisitTelegramText, 
  openTelegramShare, 
  copyVisitReportToClipboard,
  getTelegramSettings,
  saveTelegramSettings,
  sendVisitViaTelegramBot 
} from '../telegramUtils';

export default function ShareVisitModal({ visit, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [botSettings, setBotSettings] = useState(() => getTelegramSettings());
  const [isSendingBot, setIsSendingBot] = useState(false);
  const [botStatusMessage, setBotStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBotSettings(getTelegramSettings());
      setCopied(false);
      setBotStatusMessage(null);
      setSettingsSavedNotice(false);
    }
  }, [isOpen, visit]);

  if (!isOpen || !visit) return null;

  const reportText = formatVisitTelegramText(visit);
  const hasBotConfigured = Boolean(botSettings.botToken && botSettings.chatId);

  // 1. Direct Telegram Share (Opens Telegram App or Web to pick any group)
  const handleOpenTelegramShare = () => {
    openTelegramShare(visit);
  };

  // 2. Copy report text to clipboard
  const handleCopy = async () => {
    try {
      await copyVisitReportToClipboard(visit);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("មិនអាចចម្លងបានទេ សូមចម្លងដោយផ្ទាល់ពីប្រអប់ខាងក្រោម!");
    }
  };

  // 3. Save Telegram Bot Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveTelegramSettings(botSettings);
    setSettingsSavedNotice(true);
    setTimeout(() => setSettingsSavedNotice(false), 2500);
  };

  // 4. Send report directly via Telegram Bot API
  const handleSendViaBot = async () => {
    if (!hasBotConfigured) {
      setShowSettings(true);
      return;
    }

    try {
      setIsSendingBot(true);
      setBotStatusMessage(null);
      await sendVisitViaTelegramBot(visit, botSettings);
      setBotStatusMessage({
        type: 'success',
        text: `បានផ្ញើរបាយការណ៍ចូល Telegram Group «${botSettings.groupName || botSettings.chatId}» ដោយជោគជ័យ!`
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

  // 5. Test Bot Connection
  const handleTestBot = async () => {
    if (!botSettings.botToken.trim() || !botSettings.chatId.trim()) {
      alert("សូមបញ្ចូល Bot Token និង Chat ID ជាមុនសិន!");
      return;
    }

    try {
      setIsTestingBot(true);
      setBotStatusMessage(null);
      const testText = `សារតេស្តតភ្ជាប់ពីប្រព័ន្ធគ្រប់គ្រងការចុះចំការ ស្រែទាស\nBot និង Chat ID ដំណើរការជាធម្មតា!`;
      const res = await fetch(`https://api.telegram.org/bot${botSettings.botToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: botSettings.chatId.trim(), text: testText })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.description || 'បរាជ័យក្នុងការតេស្ត');
      setBotStatusMessage({
        type: 'success',
        text: "តេស្តជោគជ័យ! សារសាកល្បងបានទៅដល់ Telegram Group រួចរាល់ហើយ។"
      });
    } catch (err) {
      setBotStatusMessage({
        type: 'error',
        text: `តេស្តបរាជ័យ៖ ${err.message}`
      });
    } finally {
      setIsTestingBot(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg my-6 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <Send size={16} className="text-sky-400" />
              <span>ផ្ញើរបាយការណ៍ចុះចំការទៅ Telegram Group</span>
            </h3>
            <p className="text-[11px] text-slate-300 font-mono mt-0.5">
              ម្ចាស់ចំការ៖ {visit.customers?.name || 'មិនស្គាល់'} • {new Date(visit.visit_date).toLocaleDateString('km-KH')}
            </p>
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
              <span className="text-xs font-medium leading-relaxed">{botStatusMessage.text}</span>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Share via Telegram App / Web */}
            <button
              type="button"
              onClick={handleOpenTelegramShare}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Send size={15} />
              <span>ផ្ញើទៅ Telegram Group</span>
            </button>

            {/* Copy Report to Clipboard */}
            <button
              type="button"
              onClick={handleCopy}
              className={`w-full font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 border transition-all active:scale-[0.98] ${
                copied 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
              <span>{copied ? 'បានចម្លងរួចរាល់!' : 'ចម្លងអត្ថបទរបាយការណ៍'}</span>
            </button>
          </div>

          {/* Automatic Bot Delivery Option */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Bot size={14} className="text-sky-600" />
                <span>ផ្ញើស្វ័យប្រវត្តិតាម Telegram Bot</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium hover:underline"
              >
                <Settings size={12} />
                <span>{showSettings ? 'លាក់ការកំណត់' : 'ការកំណត់ Bot'}</span>
                {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {hasBotConfigured ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="text-[11px] text-slate-600">
                  <span>Group: </span>
                  <span className="font-bold text-slate-900 font-mono">
                    {botSettings.groupName || botSettings.chatId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSendViaBot}
                  disabled={isSendingBot}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSendingBot ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{isSendingBot ? 'កំពុងផ្ញើ...' : 'ផ្ញើចូល Group ភ្លាមៗ'}</span>
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                លោកអ្នកអាចកំណត់ Telegram Bot Token និង Chat ID ដើម្បីផ្ញើរបាយការណ៍ចូល Telegram Group ដោយស្វ័យប្រវត្តិតែមួយចុច។
              </p>
            )}

            {/* Collapsible Bot Settings Form */}
            {showSettings && (
              <form onSubmit={handleSaveSettings} className="pt-2 border-t border-slate-200 space-y-2.5 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Telegram Bot Token</label>
                  <input 
                    type="text" 
                    placeholder="ឧ. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={botSettings.botToken}
                    onChange={e => setBotSettings(prev => ({ ...prev, botToken: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    បង្កើត និងយកចេញពី @BotFather លើ Telegram
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Group Chat ID</label>
                    <input 
                      type="text" 
                      placeholder="ឧ. -1001234567890"
                      value={botSettings.chatId}
                      onChange={e => setBotSettings(prev => ({ ...prev, chatId: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Chat ID របស់ Telegram Group
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">ឈ្មោះ Group (សម្គាល់)</label>
                    <input 
                      type="text" 
                      placeholder="ឧ. ក្រុមការងារចុះចំការ"
                      value={botSettings.groupName}
                      onChange={e => setBotSettings(prev => ({ ...prev, groupName: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTestBot}
                    disabled={isTestingBot || !botSettings.botToken || !botSettings.chatId}
                    className="text-sky-600 hover:text-sky-800 font-bold text-xs flex items-center gap-1 disabled:opacity-40"
                  >
                    {isTestingBot ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    <span>តេស្តផ្ញើសារសាកល្បង</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {settingsSavedNotice && (
                      <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                        <Check size={12} /> បានរក្សាទុក!
                      </span>
                    )}
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                    >
                      រក្សាទុកការកំណត់
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Report Text Live Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-bold flex items-center gap-1 text-[11px]">
                <FileText size={13} className="text-slate-500" />
                <span>គំរូអត្ថបទដែលត្រូវផ្ញើ (Message Preview)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {reportText.length} តួអក្សរ
              </span>
            </div>

            <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl border border-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
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

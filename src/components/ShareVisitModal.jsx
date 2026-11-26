import React, { useState, useEffect } from 'react';
import { 
  X, Send, Copy, Check, Settings, Bot, ExternalLink, 
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, 
  Loader2, Share2, FileText, Image as ImageIcon, Info, HelpCircle,
  User
} from 'lucide-react';
import { 
  formatVisitTelegramText, 
  openTelegramShare, 
  copyVisitReportToClipboard,
  getTelegramSettings,
  saveTelegramSettings,
  sendVisitViaTelegramBot,
  resolveReportPhotosForTelegram
} from '../telegramUtils';

export default function ShareVisitModal({ visit, isOpen, onClose, staffList = [] }) {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [botSettings, setBotSettings] = useState(() => getTelegramSettings());
  const [isSendingBot, setIsSendingBot] = useState(false);
  const [botStatusMessage, setBotStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);
  const [reportPhotos, setReportPhotos] = useState({
    fieldPhotos: [],
    staffPhotos: [],
    allPhotos: []
  });
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  useEffect(() => {
    if (isOpen && visit) {
      setBotSettings(getTelegramSettings());
      setCopied(false);
      setBotStatusMessage(null);
      setSettingsSavedNotice(false);

      let isMounted = true;
      setIsLoadingPhotos(true);
      resolveReportPhotosForTelegram(visit, staffList).then(res => {
        if (isMounted) {
          setReportPhotos(res);
          setIsLoadingPhotos(false);
        }
      }).catch(err => {
        console.warn('Failed to resolve report photos:', err);
        if (isMounted) setIsLoadingPhotos(false);
      });

      return () => { isMounted = false; };
    }
  }, [isOpen, visit, staffList]);

  if (!isOpen || !visit) return null;

  const reportText = formatVisitTelegramText(visit);
  const hasBotConfigured = Boolean(botSettings.botToken && botSettings.chatId);
  const allPhotos = reportPhotos.allPhotos;

  // 1. Direct Telegram Share (Fixed URL to prevent Bad Request)
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

  // 4. Send report directly via Telegram Bot API (with native photos!)
  const handleSendViaBot = async () => {
    if (!hasBotConfigured) {
      setShowSettings(true);
      return;
    }

    try {
      setIsSendingBot(true);
      setBotStatusMessage(null);
      await sendVisitViaTelegramBot(visit, botSettings, staffList);
      const totalCount = allPhotos.length;
      setBotStatusMessage({
        type: 'success',
        text: `បានផ្ញើរបាយការណ៍ ${totalCount > 0 ? `រួមទាំងរូបភាព (${totalCount} សន្លឹក រួមមានរូបចុះចំការ និងរូប Profile បុគ្គលិក) ` : ''}ចូល Telegram Group «${botSettings.groupName || botSettings.chatId}» ដោយជោគជ័យ!`
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

          {/* Photos Preview Banner */}
          {(allPhotos.length > 0 || isLoadingPhotos) && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-xs">
                  <ImageIcon size={14} className="text-emerald-600" />
                  <span>រូបភាពត្រូវភ្ជាប់ទៅ Telegram ({allPhotos.length} សន្លឹក)</span>
                </span>
                {isLoadingPhotos ? (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin text-emerald-600" /> កំពុងរៀបចំរូបភាព...
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Profile បុគ្គលិកនៅលំដាប់ចុងក្រោយ
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {/* 1. Field photos */}
                {reportPhotos.fieldPhotos.map((p, idx) => (
                  <a key={`field-${idx}`} href={p} target="_blank" rel="noreferrer" className="w-16 h-12 rounded-lg border border-emerald-200 overflow-hidden shrink-0 group relative" title={`រូបចុះចំការ #${idx+1}`}>
                    <img src={p} alt={`Field Photo ${idx+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center py-0.2">ចំការ {idx+1}</span>
                  </a>
                ))}

                {/* 2. Staff Profile photos (Strictly at the end!) */}
                {reportPhotos.staffPhotos.map((p, idx) => (
                  <a key={`staff-${idx}`} href={p} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg border-2 border-emerald-500 overflow-hidden shrink-0 group relative aspect-square shadow-2xs" title={`រូប Profile បុគ្គលិក #${idx+1}`}>
                    <img src={p} alt={`Staff Profile ${idx+1}`} className="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform" />
                    <span className="absolute bottom-0 inset-x-0 bg-emerald-700/80 text-[8px] font-bold text-white text-center py-0.2 flex items-center justify-center gap-0.5">
                      <User size={8} /> Profile
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 1: Automatic Bot Send (Supports Native Image Delivery) */}
          <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Bot size={15} className="text-sky-600" />
                <span>ផ្ញើស្វ័យប្រវត្តិតាម Telegram Bot (រួមទាំងរូបភាព)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="text-[11px] text-sky-700 hover:text-sky-900 flex items-center gap-1 font-bold hover:underline"
              >
                <Settings size={12} />
                <span>{showSettings ? 'លាក់ការកំណត់' : (hasBotConfigured ? 'កែប្រែការកំណត់' : 'កំណត់ Bot ឥឡូវនេះ')}</span>
                {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {hasBotConfigured ? (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Group គោលដៅ៖ <strong className="text-slate-900 font-mono">{botSettings.groupName || botSettings.chatId}</strong></span>
                  {allPhotos.length > 0 && <span className="text-emerald-700 font-bold">({allPhotos.length} រូបភាព)</span>}
                </div>
                <button
                  type="button"
                  onClick={handleSendViaBot}
                  disabled={isSendingBot}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  {isSendingBot ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  <span>
                    {isSendingBot 
                      ? 'កំពុងផ្ញើចូល Telegram Group...' 
                      : `ផ្ញើចូល Telegram Group ភ្លាមៗ ${allPhotos.length > 0 ? `(រួមទាំងរូបភាព ${allPhotos.length} សន្លឹក)` : ''}`}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  ដើម្បីអាចផ្ញើ<strong>រូបភាពជាក់ស្តែងបង្ហាញក្នុង Telegram Group</strong> ផ្ទាល់បាន សូមកំណត់ Telegram Bot Token និង Group Chat ID ខាងក្រោម (កំណត់តែម្តងគត់ ប្រព័ន្ធនឹងចងចាំរហូត)៖
                </p>
                {!showSettings && (
                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Settings size={13} />
                    <span>បញ្ចូល Bot Token & Group ID ដើម្បីផ្ញើរូបភាព</span>
                  </button>
                )}
              </div>
            )}

            {/* Collapsible Bot Settings Form */}
            {showSettings && (
              <form onSubmit={handleSaveSettings} className="pt-2 border-t border-sky-200/80 space-y-2.5 text-xs bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
                
                {/* 3 Step Instruction Guide */}
                <div className="bg-sky-50/70 p-2.5 rounded-lg border border-sky-200/70 text-[11px] text-slate-700 space-y-1">
                  <div className="font-bold text-sky-900 flex items-center gap-1">
                    <Info size={12} className="text-sky-600" />
                    <span>របៀបបង្កើត និងយក Bot Token & Group Chat ID (៣ ជំហានងាយៗ):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-slate-600 leading-relaxed">
                    <li>បើក Telegram ស្វែងរក <b>@BotFather</b> រួចផ្ញើពាក្យ <code>/newbot</code> ដើម្បីយក <b>Bot Token</b></li>
                    <li>Add Bot នោះចូលទៅក្នុង Telegram Group របស់អ្នក ហើយកំណត់សិទ្ធិជា <b>Admin</b></li>
                    <li>យក <b>Group ID</b> (ឧ. <code>-100xxxxxxxxxx</code>) តាមរយៈ bot <b>@userinfobot</b> ឬ <b>@RawDataBot</b></li>
                  </ol>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Telegram Bot Token *</label>
                  <input 
                    type="text" 
                    placeholder="ឧ. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
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
                      placeholder="ឧ. -1001234567890"
                      value={botSettings.chatId}
                      onChange={e => setBotSettings(prev => ({ ...prev, chatId: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">ឈ្មោះ Group (សម្គាល់)</label>
                    <input 
                      type="text" 
                      placeholder="ឧ. ក្រុមការងារចុះចំការ"
                      value={botSettings.groupName}
                      onChange={e => setBotSettings(prev => ({ ...prev, groupName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
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

          {/* SECTION 2: Share via Browser Link / Copy Text */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-700 block text-xs">
              ជម្រើសចែករំលែកផ្សេងទៀត៖
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Share via Telegram App / Web (Fixed from Bad Request) */}
              <button
                type="button"
                onClick={handleOpenTelegramShare}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-[0.98]"
              >
                <Send size={14} />
                <span>ផ្ញើតាម Telegram Share Link</span>
              </button>

              {/* Copy Full Report Text */}
              <button
                type="button"
                onClick={handleCopy}
                className={`w-full font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border transition-all active:scale-[0.98] ${
                  copied 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'បានចម្លងរួចរាល់!' : 'ចម្លងអត្ថបទរបាយការណ៍'}</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              * ចំណាំ៖ Telegram Share Link តាម Browser គាំទ្រតែអត្ថបទ។ ដើម្បីផ្ញើបង្ហាញរូបភាពជាក់ស្តែងផ្ទាល់ សូមប្រើប៊ូតុង Bot ខាងលើ។
            </p>
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

            <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl border border-slate-800 max-h-44 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
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

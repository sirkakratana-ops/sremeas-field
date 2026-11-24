import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Database, HardDrive, Download, Upload, ShieldCheck, 
  CheckCircle2, AlertTriangle, FileText, RefreshCw, 
  FileSpreadsheet, Copy, Check, Clock, Layers, ArrowUpCircle, 
  Sparkles, Info, Users, ClipboardList
} from 'lucide-react';
import { 
  exportFullJsonBackup, 
  exportSqlDisasterRecoveryScript, 
  exportCsvBackup, 
  validateBackupJson, 
  executeRestore, 
  getAutoBackupInfo, 
  downloadCachedAutoBackup 
} from '../backupUtils';

export default function BackupRestoreModal({ isOpen, onClose, supabase, currentUser, fallbackStaff = [], onDataRestored }) {
  const [activeSubTab, setActiveSubTab] = useState('backup'); // 'backup' | 'restore'
  
  // Export states
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingSql, setIsExportingSql] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [exportNotice, setExportNotice] = useState('');

  // Auto-backup snapshot state
  const [autoBackupInfo, setAutoBackupInfo] = useState({ exists: false });

  // Restore states
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedBackup, setParsedBackup] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(null);
  const [restoreResult, setRestoreResult] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setAutoBackupInfo(getAutoBackupInfo());
      setExportNotice('');
      setRestoreResult(null);
      setValidationError('');
      setSelectedFile(null);
      setParsedBackup(null);
      setRestoreProgress(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Export JSON Handler
  const handleExportJson = async () => {
    try {
      setIsExportingJson(true);
      setExportNotice('');
      const res = await exportFullJsonBackup(supabase, currentUser, fallbackStaff);
      setAutoBackupInfo(getAutoBackupInfo());
      setExportNotice(`បានទាញយកឯកសារ ${res.fileName} ដោយជោគជ័យ! (អតិថិជន ${res.stats.totalCustomers} នាក់, កំណត់ត្រា ${res.stats.totalVisits} ករណី, បុគ្គលិក ${res.stats.totalStaff} នាក់)`);
    } catch (err) {
      console.error(err);
      setExportNotice('មានបញ្ហាក្នុងការទាញយកទិន្នន័យ៖ ' + err.message);
    } finally {
      setIsExportingJson(false);
    }
  };

  // 2. Export SQL Script Handler
  const handleExportSql = async () => {
    try {
      setIsExportingSql(true);
      setExportNotice('');
      const res = await exportSqlDisasterRecoveryScript(supabase, currentUser, fallbackStaff);
      setExportNotice(`បានបង្កើតឯកសារ SQL Disaster Recovery (${res.fileName}) រួចរាល់!`);
    } catch (err) {
      console.error(err);
      setExportNotice('មានបញ្ហាក្នុងការបង្កើតកូដ SQL៖ ' + err.message);
    } finally {
      setIsExportingSql(false);
    }
  };

  // Copy SQL Script directly
  const handleCopySqlScript = async () => {
    try {
      setIsExportingSql(true);
      const res = await exportSqlDisasterRecoveryScript(supabase, currentUser, fallbackStaff);
      if (res.sqlScript) {
        await navigator.clipboard.writeText(res.sqlScript);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('មានបញ្ហាក្នុងការចម្លង SQL៖ ' + err.message);
    } finally {
      setIsExportingSql(false);
    }
  };

  // 3. Export CSV Handler
  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      setExportNotice('');
      const res = await exportCsvBackup(supabase, fallbackStaff);
      setExportNotice(`បានទាញយកឯកសារ CSV សម្រាប់ Microsoft Excel រួចរាល់! (អតិថិជន ${res.stats.totalCustomers} នាក់, កំណត់ត្រា ${res.stats.totalVisits} ករណី)`);
    } catch (err) {
      console.error(err);
      setExportNotice('មានបញ្ហាក្នុងការទាញយក CSV៖ ' + err.message);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // 4. Download Cached Auto Backup
  const handleDownloadCachedSnapshot = () => {
    const success = downloadCachedAutoBackup();
    if (success) {
      setExportNotice('បានទាញយកឯកសារ Backup Snapshot ស្វ័យប្រវត្តិពី Browser រួចរាល់!');
    } else {
      alert('មិនទាន់មានទិន្នន័យ Auto-Backup ក្នុង Browser នៅឡើយទេ។ សូមចុច "ទាញយក Backup ឥឡូវនេះ"។');
    }
  };

  // 5. File Selection for Restore
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationError('');
    setParsedBackup(null);
    setRestoreResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      const validation = validateBackupJson(content);
      if (!validation.isValid) {
        setValidationError(validation.error);
        setParsedBackup(null);
      } else {
        setParsedBackup(validation);
        setValidationError('');
      }
    };
    reader.onerror = () => {
      setValidationError('មិនអាចអានឯកសារបានទេ។ សូមសាកល្បងម្តងទៀត។');
    };
    reader.readAsText(file);
  };

  // 6. Execute Restore
  const handleStartRestore = async () => {
    if (!parsedBackup || !parsedBackup.data) return;

    const confirmMessage = `តើអ្នកពិតជាចង់ស្តារ (Restore) ទិន្នន័យនេះទៅកាន់ Supabase មែនទេ?\n\n` +
      `- អតិថិជន៖ ${parsedBackup.stats.totalCustomers} នាក់\n` +
      `- កំណត់ត្រាចុះចំការ៖ ${parsedBackup.stats.totalVisits} ករណី\n` +
      `- បុគ្គលិក៖ ${parsedBackup.stats.totalStaff} នាក់\n\n` +
      `ទិន្នន័យនឹងត្រូវបញ្ចូលបន្ថែម និងធ្វើបច្ចុប្បន្នភាពដោយសុវត្ថិភាព។`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setIsRestoring(true);
      setRestoreResult(null);
      setRestoreProgress({ phase: 'កំពុងចាប់ផ្តើម...', current: 0, total: 100, overallPercent: 5 });

      const result = await executeRestore(supabase, parsedBackup.data, (progress) => {
        setRestoreProgress(progress);
      });

      setRestoreResult(result);

      if (result.hasPartialSuccess && onDataRestored) {
        onDataRestored();
      }
    } catch (err) {
      console.error(err);
      setRestoreResult({
        success: false,
        errors: [err.message]
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center shadow-xs">
              <Database size={22} className="text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg leading-tight">
                  មជ្ឈមណ្ឌល Backup & ស្តារទិន្នន័យ
                </h3>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/20">
                  សុវត្ថិភាពទិន្នន័យ
                </span>
              </div>
              <p className="text-xs text-white/80 font-medium">
                ស្រែមាស - ចុះចំការ • Data Backup, SQL Recovery & Import
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="បិទ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Sub-Tabs Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 pt-3 flex gap-2">
          <button
            onClick={() => setActiveSubTab('backup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeSubTab === 'backup' 
                ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Download size={14} className={activeSubTab === 'backup' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>១. ទាញយកការបម្រុងទុក (Backup Data)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('restore')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeSubTab === 'restore' 
                ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Upload size={14} className={activeSubTab === 'restore' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>២. ស្តារទិន្នន័យឡើងវិញ (Restore / Import)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          
          {/* Notification Banner if any */}
          {exportNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{exportNotice}</div>
            </div>
          )}

          {/* ============================== TAB 1: BACKUP ============================== */}
          {activeSubTab === 'backup' && (
            <div className="space-y-4">
              
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-start gap-3">
                <Info size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 leading-relaxed">
                  ដើម្បីធានាសុវត្ថិភាពទិន្នន័យ និងការពារការបាត់បង់ដោយយថាហេតុ លោកអ្នកគួរធ្វើការទាញយក <strong>Full JSON Backup</strong> ឬ <strong>SQL Script</strong> ទុកជារៀងរាល់សប្តាហ៍ ឬរាល់ពេលមានការផ្លាស់ប្តូរទិន្នន័យសំខាន់ៗ។
                </div>
              </div>

              {/* Grid Options for Backup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* 1. Full JSON Backup Card */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                        <HardDrive size={18} />
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        ណែនាំ (Recommended)
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">Full Database Backup (.JSON)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      បម្រុងទុកទិន្នន័យទាំងអស់ (អតិថិជន, កំណត់ត្រាចុះចំការ, បុគ្គលិក, ទីតាំង GPS) ក្នុងឯកសារ JSON តែមួយ សម្រាប់ប្រើប្រាស់ស្តារឡើងវិញបាន ១០០%។
                    </p>
                  </div>

                  <button
                    onClick={handleExportJson}
                    disabled={isExportingJson}
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isExportingJson ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>{isExportingJson ? 'កំពុងបង្កើតឯកសារ...' : 'ទាញយក Backup JSON ឥឡូវនេះ'}</span>
                  </button>
                </div>

                {/* 2. SQL Disaster Recovery Script */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                        <Database size={18} />
                      </div>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        Disaster Recovery
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">SQL Database Dump (.SQL)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      កូដ SQL ពេញលេញសម្រាប់បង្កើតតារាងឡើងវិញ និង Insert ទិន្នន័យទាំងអស់ទៅកាន់ Supabase SQL Editor ដោយផ្ទាល់។
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleExportSql}
                      disabled={isExportingSql}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 active:scale-98 text-white font-bold py-2 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isExportingSql ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                      <span>ទាញយក .SQL</span>
                    </button>
                    <button
                      onClick={handleCopySqlScript}
                      disabled={isExportingSql}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-200"
                      title="ចម្លងកូដ SQL ទាំងអស់ទៅ Clipboard"
                    >
                      {copiedSql ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedSql ? 'បានចម្លង!' : 'ចម្លង SQL'}</span>
                    </button>
                  </div>
                </div>

                {/* 3. Excel / CSV Export Card */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                        <FileSpreadsheet size={18} />
                      </div>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        Microsoft Excel
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">Excel & CSV Exports (.CSV)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      នាំចេញទិន្នន័យអតិថិជន និងការចុះចំការជាឯកសារ Spreadsheet គាំទ្រពុម្ពអក្សរខ្មែរ UTF-8 ពេញលេញ សម្រាប់បើកលើ Excel។
                    </p>
                  </div>

                  <button
                    onClick={handleExportCsv}
                    disabled={isExportingCsv}
                    className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-200 cursor-pointer disabled:opacity-50"
                  >
                    {isExportingCsv ? <RefreshCw size={14} className="animate-spin" /> : <FileSpreadsheet size={14} className="text-emerald-700" />}
                    <span>{isExportingCsv ? 'កំពុងបង្កើត CSV...' : 'ទាញយក CSV (អតិថិជន & កំណត់ត្រា)'}</span>
                  </button>
                </div>

                {/* 4. Local Browser Auto-Backup Card */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                        <Clock size={18} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        autoBackupInfo.exists ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {autoBackupInfo.exists ? 'មានទិន្នន័យបម្រុង' : 'មិនទាន់មាន'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">Browser Auto-Backup Snapshot</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {autoBackupInfo.exists ? (
                        <>
                          បានបម្រុងទុកស្វ័យប្រវត្តិកាលពី៖ <strong>{new Date(autoBackupInfo.timestamp).toLocaleString('km-KH')}</strong>
                          <br />
                          (អតិថិជន {autoBackupInfo.stats?.totalCustomers || 0} នាក់, កំណត់ត្រា {autoBackupInfo.stats?.totalVisits || 0} ករណី)
                        </>
                      ) : (
                        'នៅពេលអ្នកចុច Backup ទិន្នន័យ ឯកសារ Snapshot មួយច្បាប់នឹងត្រូវរក្សាទុកក្នុង Browser ដោយស្វ័យប្រវត្តិ។'
                      )}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadCachedSnapshot}
                    disabled={!autoBackupInfo.exists}
                    className="mt-4 w-full bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-teal-200 cursor-pointer disabled:opacity-40"
                  >
                    <Download size={14} />
                    <span>ទាញយក Snapshot ពី Browser</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ============================== TAB 2: RESTORE ============================== */}
          {activeSubTab === 'restore' && (
            <div className="space-y-4">
              
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>ការប្រុងប្រយ័ត្ន៖</strong> មុខងារនេះប្រើសម្រាប់ស្តារទិន្នន័យពីឯកសារ Backup JSON ឡើងវិញ។ ទិន្នន័យនឹងត្រូវបញ្ចូលបន្ថែម (Upsert) ទៅកាន់ Database Supabase ដោយផ្អែកលើលេខសម្គាល់ ID ដើម មិនធ្វើឱ្យបាត់បង់ទិន្នន័យដែលមានស្រាប់ឡើយ។
                </div>
              </div>

              {/* File Upload Box */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".json,application/json" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
                
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Upload size={24} />
                </div>
                
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  {selectedFile ? selectedFile.name : 'ចុចទីនេះដើម្បីជ្រើសរើសឯកសារ Backup (.JSON)'}
                </h4>
                <p className="text-xs text-slate-400">
                  {selectedFile 
                    ? `ទំហំឯកសារ៖ ${(selectedFile.size / 1024).toFixed(1)} KB` 
                    : 'គាំទ្រតែឯកសារ .json ដែលបានបង្កើតចេញពីមុខងារ Backup នៃប្រព័ន្ធនេះ'}
                </p>
              </div>

              {/* Validation Error Banner */}
              {validationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Preview of Parsed Backup */}
              {parsedBackup && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <span>ព័ត៌មានឯកសារ Backup ដែលបានរកឃើញ</span>
                    </span>
                    {parsedBackup.exportedAt && (
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(parsedBackup.exportedAt).toLocaleString('km-KH')}
                      </span>
                    )}
                  </div>

                  {/* Stats Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold flex items-center justify-center gap-1">
                        <Users size={12} className="text-emerald-600" /> អតិថិជន
                      </div>
                      <div className="text-base font-black text-slate-800 mt-0.5">
                        {parsedBackup.stats.totalCustomers} នាក់
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold flex items-center justify-center gap-1">
                        <ClipboardList size={12} className="text-blue-600" /> កត់ត្រាចុះចំការ
                      </div>
                      <div className="text-base font-black text-slate-800 mt-0.5">
                        {parsedBackup.stats.totalVisits} ករណី
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold flex items-center justify-center gap-1">
                        <ShieldCheck size={12} className="text-teal-600" /> បុគ្គលិក
                      </div>
                      <div className="text-base font-black text-slate-800 mt-0.5">
                        {parsedBackup.stats.totalStaff} នាក់
                      </div>
                    </div>
                  </div>

                  {/* Action Confirmation Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleStartRestore}
                      disabled={isRestoring}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <ArrowUpCircle size={16} />
                      )}
                      <span>{isRestoring ? 'កំពុងដំណើរការស្តារទិន្នន័យ...' : 'ចាប់ផ្តើមស្តារទិន្នន័យទៅកាន់ Supabase'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Progress Bar during Restore */}
              {isRestoring && restoreProgress && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>{restoreProgress.phase}</span>
                    <span className="font-mono text-emerald-700">{restoreProgress.overallPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${restoreProgress.overallPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>ដំណើរការដោយស្វ័យប្រវត្តិតាមកញ្ចប់ទិន្នន័យ</span>
                    <span>{restoreProgress.current} / {restoreProgress.total}</span>
                  </div>
                </div>
              )}

              {/* Result Summary */}
              {restoreResult && (
                <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-fadeIn ${
                  restoreResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : restoreResult.hasPartialSuccess
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {restoreResult.success ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <AlertTriangle size={18} className={restoreResult.hasPartialSuccess ? 'text-amber-600' : 'text-rose-600'} />
                    )}
                    <span>
                      {restoreResult.success 
                        ? 'ការស្តារទិន្នន័យទទួលបានជោគជ័យ ១០០%!' 
                        : restoreResult.hasPartialSuccess
                        ? 'ការស្តារទិន្នន័យបានជោគជ័យមួយផ្នែក'
                        : 'ការស្តារទិន្នន័យបានបរាជ័យ'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 font-medium text-[11px]">
                    <div>អតិថិជន៖ <strong>{restoreResult.restoredCustomers || 0} នាក់</strong></div>
                    <div>ចុះចំការ៖ <strong>{restoreResult.restoredVisits || 0} ករណី</strong></div>
                    <div>បុគ្គលិក៖ <strong>{restoreResult.restoredStaff || 0} នាក់</strong></div>
                  </div>

                  {restoreResult.errors && restoreResult.errors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-rose-200 text-rose-700 space-y-1">
                      <div className="font-bold">កំណត់ត្រាកំហុស៖</div>
                      {restoreResult.errors.map((err, idx) => (
                        <div key={idx} className="font-mono text-[10px]">&bull; {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium">
            ប្រព័ន្ធបម្រុងទុកទិន្នន័យកម្រិតសហគ្រាស (Zero Data Loss)
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            បិទ
          </button>
        </div>

      </div>
    </div>
  );
}

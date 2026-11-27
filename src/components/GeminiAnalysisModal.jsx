import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Send, Copy, Check, Settings, Bot, ExternalLink, 
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Loader2, 
  RefreshCw, MessageSquare, Bug, PhoneCall, FileText, HelpCircle,
  Key, ShieldCheck, Printer
} from 'lucide-react';
import { 
  getGeminiApiKey, 
  saveGeminiApiKey, 
  getSelectedGeminiModel, 
  saveSelectedGeminiModel, 
  GEMINI_MODELS, 
  testGeminiConnection, 
  analyzeReportWithGemini,
  sendAiReportToTelegram
} from '../geminiUtils.js';

// Simple, clean Markdown renderer for AI generated analysis
function MarkdownViewer({ content }) {
  if (!content) return null;

  // Split lines and parse basic markdown structures
  const lines = content.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1.5 my-2.5 pl-2">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
              <span className="text-emerald-600 mt-1 shrink-0">•</span>
              <span>{renderInlineFormatting(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const renderInlineFormatting = (text) => {
    // Bold: **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={idx} className="text-xs font-bold text-slate-800 mt-3 mb-1.5 flex items-center gap-1.5">
          {renderInlineFormatting(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={idx} className="text-sm font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-100 flex items-center gap-1.5 text-emerald-800">
          {renderInlineFormatting(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={idx} className="text-base font-black text-slate-900 mt-4 mb-2 pb-1.5 border-b border-slate-200">
          {renderInlineFormatting(trimmed.slice(2))}
        </h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      currentList.push(trimmed.slice(2));
    } else if (/^\d+\.\s+/.test(trimmed)) {
      flushList();
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      elements.push(
        <div key={idx} className="flex items-start gap-2 text-xs text-slate-800 my-1.5 leading-relaxed bg-slate-50/70 p-2 rounded-xl border border-slate-100">
          <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md text-[11px] shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <div className="flex-1">{renderInlineFormatting(numMatch[2])}</div>
        </div>
      );
    } else if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(<hr key={idx} className="my-3 border-slate-200" />);
    } else if (trimmed.length > 0) {
      flushList();
      elements.push(
        <p key={idx} className="text-xs text-slate-700 leading-relaxed my-1.5">
          {renderInlineFormatting(trimmed)}
        </p>
      );
    } else {
      flushList();
    }
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

export default function GeminiAnalysisModal({
  isOpen,
  onClose,
  visits = [],
  calls = [],
  filterInfo = {}
}) {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_GEMINI_MODEL);
  const [showConfig, setShowConfig] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null); // { type: 'success' | 'error', text: '' }

  const [activeTab, setActiveTab] = useState('strategic'); // 'strategic' | 'pests' | 'calls' | 'custom'
  const [customQuestion, setCustomQuestion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisError, setAnalysisError] = useState(null);

  const [copied, setCopied] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);

  // Load existing key & model on open
  useEffect(() => {
    if (isOpen) {
      const savedKey = getGeminiApiKey();
      setApiKey(savedKey);
      setSelectedModel(getSelectedGeminiModel());
      setAnalysisError(null);
      setTelegramStatus(null);
      setCopied(false);
      
      // Auto open config if key is missing
      if (!savedKey) {
        setShowConfig(true);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasApiKey = Boolean(apiKey.trim());

  // Test Gemini Key
  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      alert("សូមបញ្ចូល Google Gemini API Key ជាមុនសិន!");
      return;
    }

    try {
      setIsTestingKey(true);
      setKeyStatus(null);
      await testGeminiConnection(apiKey.trim(), selectedModel);
      saveGeminiApiKey(apiKey.trim());
      saveSelectedGeminiModel(selectedModel);
      setKeyStatus({
        type: 'success',
        text: 'តេស្តតភ្ជាប់ជោគជ័យ! API Key ដំណើរការយ៉ាងត្រឹមត្រូវ។'
      });
    } catch (err) {
      setKeyStatus({
        type: 'error',
        text: `តេស្តបរាជ័យ៖ ${err.message}`
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  // Save Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveGeminiApiKey(apiKey.trim());
    saveSelectedGeminiModel(selectedModel);
    setShowConfig(false);
    setKeyStatus(null);
  };

  // Run AI Analysis
  const handleRunAnalysis = async (tabToRun = activeTab) => {
    if (!hasApiKey) {
      setShowConfig(true);
      return;
    }

    if (tabToRun === 'custom' && !customQuestion.trim()) {
      alert("សូមបញ្ចូលសំណួររបស់អ្នកជាមុនសិន!");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setTelegramStatus(null);
    setCopied(false);

    try {
      const result = await analyzeReportWithGemini({
        analysisType: tabToRun,
        customQuestion: customQuestion.trim(),
        visits,
        calls,
        filterInfo,
        apiKey: apiKey.trim(),
        model: selectedModel
      });
      setAnalysisResult(result);
    } catch (err) {
      console.error("Gemini analysis error:", err);
      setAnalysisError(err.message || 'បរាជ័យក្នុងការវិភាគទិន្នន័យដោយ Gemini');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy result
  const handleCopy = async () => {
    if (!analysisResult) return;
    try {
      await navigator.clipboard.writeText(analysisResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("មិនអាចចម្លងបានទេ សូមជ្រើសរើសចម្លងដោយផ្ទាល់ពីប្រអប់!");
    }
  };

  // Send to Telegram
  const handleSendTelegram = async () => {
    if (!analysisResult) return;
    try {
      setIsSendingTelegram(true);
      setTelegramStatus(null);
      await sendAiReportToTelegram(analysisResult, filterInfo);
      setTelegramStatus({
        type: 'success',
        text: 'បានផ្ញើការវិភាគ AI ចូល Telegram Group ដោយជោគជ័យ!'
      });
    } catch (err) {
      setTelegramStatus({
        type: 'error',
        text: `បរាជ័យក្នុងការផ្ញើទៅ Telegram៖ ${err.message}`
      });
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const sampleQuestions = [
    "តើសាខាណាមានបញ្ហាច្រើនជាងគេ ហើយជាបញ្ហាអ្វី?",
    "តើកសិករភាគច្រើនយល់ព្រមតាមការណែនាំរបស់បុគ្គលិកដែរឬទេ?",
    "តើដំណាំស្វាយចន្ទីកំពុងជួបបញ្ហាអ្វីខ្លះក្នុងខែនេះ?",
    "តើផលិតផលណាដែលបុគ្គលិកបានណែនាំច្រើនជាងគេ?"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
        
        {/* ================= HEADER ================= */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Sparkles size={18} className="text-yellow-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-sm flex items-center gap-1.5">
                <span>វិភាគទិន្នន័យរបាយការណ៍ដោយ Google Gemini AI</span>
                <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30 px-1.5 py-0.2 rounded-full font-mono">2.5 Flash</span>
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                ទិន្នន័យបច្ចុប្បន្ន៖ <strong className="text-emerald-300 font-normal">{filterInfo.dateRangeLabel || 'ទាំងអស់'}</strong> • សាខា៖ <strong className="text-emerald-300 font-normal">{filterInfo.branch || 'គ្រប់សាខា'}</strong> • ({visits.length} ចុះចំការ • {calls.length} ការខល)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                hasApiKey 
                  ? 'border-indigo-400/40 text-indigo-200 hover:bg-indigo-900/40' 
                  : 'border-amber-400 bg-amber-500/20 text-amber-300 animate-bounce'
              }`}
              title="កំណត់ Gemini API Key & Model"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">{hasApiKey ? 'ការកំណត់ Key' : 'បញ្ចូល Key'}</span>
            </button>

            <button 
              type="button" 
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= SETTINGS PANEL (COLLAPSIBLE) ================= */}
        {showConfig && (
          <form onSubmit={handleSaveSettings} className="p-4 bg-indigo-50/70 border-b border-indigo-100 text-xs space-y-3 shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Key size={14} className="text-indigo-600" />
                <span>ការកំណត់ Google Gemini API Key</span>
              </span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 underline font-medium"
              >
                <span>យក API Key ឥតគិតថ្លៃនៅ Google AI Studio</span>
                <ExternalLink size={11} />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="បិទភ្ជាប់ Gemini API Key (ឧ. AIzaSy...)"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>

              <div>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                >
                  {GEMINI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {keyStatus && (
              <div className={`p-2 rounded-xl border text-[11px] flex items-center gap-1.5 ${
                keyStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {keyStatus.type === 'success' ? <CheckCircle2 size={13} className="text-emerald-600 shrink-0" /> : <AlertCircle size={13} className="text-rose-600 shrink-0" />}
                <span>{keyStatus.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTestingKey}
                className="px-3 py-1.5 bg-white border border-indigo-300 hover:bg-indigo-100 text-indigo-800 font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isTestingKey ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                <span>{isTestingKey ? 'កំពុងតេស្ត...' : 'តេស្តតភ្ជាប់'}</span>
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                រក្សាទុក Key
              </button>
            </div>
          </form>
        )}

        {/* ================= TABS NAVIGATION ================= */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0">
          {[
            { id: 'strategic', label: '📑 វិភាគយុទ្ធសាស្ត្រជារួម', desc: 'សង្ខេបប្រតិបត្តិ និងអនុសាសន៍' },
            { id: 'pests', label: '🐛 បញ្ហាដំណាំ & សត្វល្អិត', desc: 'វិភាគជំងឺ សត្វល្អិត និងវិធានការ' },
            { id: 'calls', label: '📞 ការខល & អតិថិជន', desc: 'ការឆ្លើយតប និងការសម្រេចចិត្ត' },
            { id: 'custom', label: '💬 សួរសំណួរផ្ទាល់ខ្លួន', desc: 'សួរអ្វីក៏បានពីទិន្នន័យ' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                // Clear previous error if switching
                setAnalysisError(null);
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ================= MODAL BODY / CONTENT ================= */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Custom Question input if 'custom' tab is active */}
          {activeTab === 'custom' && (
            <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2.5 animate-fadeIn">
              <label className="block text-xs font-bold text-purple-900">
                វាយបញ្ចូលសំណួររបស់អ្នកអំពីទិន្នន័យចុះចំការ និងការខលសួរសុខទុក្ខ៖
              </label>
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                rows={2}
                placeholder="ឧ. តើសាខាសៀមរាបមានកសិករដាំអ្វីច្រើនជាងគេ ហើយមានបញ្ហាអ្វីខ្លះ?..."
                className="w-full p-2.5 bg-white rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs text-slate-800 leading-relaxed"
              />
              
              {/* Sample Question Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500">សំណួរគំរូ៖</span>
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomQuestion(q)}
                    className="text-[10px] bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleRunAnalysis(activeTab)}
              disabled={isAnalyzing || !hasApiKey}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin text-yellow-300" />
                  <span>Google Gemini កំពុងវិភាគទិន្នន័យយ៉ាងស៊ីជម្រៅ...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-yellow-300" />
                  <span>{analysisResult ? 'វិភាគទិន្នន័យឡើងវិញ (Re-run Analysis)' : 'ចាប់ផ្តើមវិភាគទិន្នន័យឥឡូវនេះ (Analyze with Gemini)'}</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback & Error Alerts */}
          {analysisError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">ការវិភាគបានបរាជ័យ៖</span>
                <span className="text-[11px] leading-relaxed">{analysisError}</span>
              </div>
            </div>
          )}

          {telegramStatus && (
            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between animate-fadeIn ${
              telegramStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-1.5">
                {telegramStatus.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
                <span>{telegramStatus.text}</span>
              </div>
              <button type="button" onClick={() => setTelegramStatus(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Analysis Result Box */}
          {analysisResult ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden animate-fadeIn">
              
              {/* Result Actions Bar */}
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>លទ្ធផលនៃការវិភាគដោយ Gemini</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    title="ចម្លងអត្ថបទទាំងអស់"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copied ? 'បានចម្លង!' : 'ចម្លង'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendTelegram}
                    disabled={isSendingTelegram}
                    className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    title="ផ្ញើរបាយការណ៍វិភាគនេះទៅ Telegram Group"
                  >
                    {isSendingTelegram ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    <span>{isSendingTelegram ? 'កំពុងផ្ញើ...' : 'ផ្ញើទៅ Telegram'}</span>
                  </button>
                </div>
              </div>

              {/* Formatted Markdown Content */}
              <div className="p-5 max-h-[50vh] overflow-y-auto bg-white select-text">
                <MarkdownViewer content={analysisResult} />
              </div>

              {/* Footer info */}
              <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>ម៉ូដែល៖ <strong className="text-indigo-700 font-mono">{selectedModel}</strong></span>
                <span>ស្រែមាស Intelligence System</span>
              </div>
            </div>
          ) : (
            !isAnalyzing && (
              <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Sparkles size={24} />
                </div>
                <h4 className="text-xs font-bold text-slate-700">មិនទាន់មានលទ្ធផលវិភាគនៅឡើយទេ</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                  សូមជ្រើសរើសប្រភេទនៃការវិភាគខាងលើ ហើយចុចលើប៊ូតុង <strong>«ចាប់ផ្តើមវិភាគទិន្នន័យឥឡូវនេះ»</strong> ដើម្បីឱ្យ Google Gemini សង្ខេប និងផ្តល់អនុសាសន៍យុទ្ធសាស្ត្រ។
                </p>
              </div>
            )
          )}

        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <span className="text-[11px] text-slate-500">
            គាំទ្រភាសាខ្មែរ ១០០% • Powered by Google Gemini AI
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            បិទផ្ទាំង
          </button>
        </div>

      </div>
    </div>
  );
}

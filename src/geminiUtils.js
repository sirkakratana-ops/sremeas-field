// Google Gemini API Utilities for Sremeas Field Report Analysis
import { getTelegramSettings } from './telegramUtils.js';

export const GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (ជំនាន់ថ្មីចុងក្រោយ - លឿន & ឆ្លាតវៃ - ណែនាំ)', isDefault: true },
  { id: 'gemini-3.8-pro', name: 'Gemini 3.8 Pro (ការវិភាគស៊ីជម្រៅ)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
];

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

/**
 * Retrieve saved Gemini API key from localStorage or Vite environment variable
 */
export function getGeminiApiKey() {
  try {
    const stored = localStorage.getItem('sremeas_gemini_api_key');
    if (stored && stored.trim()) return stored.trim();
  } catch (err) {
    console.warn('Failed to read gemini api key from localStorage:', err);
  }
  return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
}

/**
 * Save Gemini API key to localStorage
 */
export function saveGeminiApiKey(key) {
  try {
    const cleanKey = (key || '').trim();
    if (cleanKey) {
      localStorage.setItem('sremeas_gemini_api_key', cleanKey);
    } else {
      localStorage.removeItem('sremeas_gemini_api_key');
    }
    return true;
  } catch (err) {
    console.warn('Failed to save gemini api key:', err);
    return false;
  }
}

/**
 * Retrieve selected Gemini model
 */
export function getSelectedGeminiModel() {
  try {
    const saved = localStorage.getItem('sremeas_gemini_model');
    // If the saved model is obsolete 'gemini-2.5-flash', automatically migrate to 'gemini-3.8-flash'
    if (saved === 'gemini-2.5-flash') {
      try { localStorage.setItem('sremeas_gemini_model', DEFAULT_GEMINI_MODEL); } catch {}
      return DEFAULT_GEMINI_MODEL;
    }
    return saved || DEFAULT_GEMINI_MODEL;
  } catch {
    return DEFAULT_GEMINI_MODEL;
  }
}

/**
 * Save selected Gemini model
 */
export function saveSelectedGeminiModel(model) {
  try {
    localStorage.setItem('sremeas_gemini_model', model || DEFAULT_GEMINI_MODEL);
  } catch (err) {
    console.warn('Failed to save selected gemini model:', err);
  }
}

/**
 * Test Gemini API connection with a minimal prompt
 */
export async function testGeminiConnection(apiKey, model = null) {
  const key = (apiKey || getGeminiApiKey()).trim();
  if (!key) {
    throw new Error('សូមបញ្ចូល Google Gemini API Key ជាមុនសិន!');
  }

  const activeModel = model || getSelectedGeminiModel();

  const callTest = async (modelToUse) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${key}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'សូមឆ្លើយតបខ្លីមួយម៉ាត់ថា "OK" ដើម្បីបញ្ជាក់ការតភ្ជាប់។' }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 20
        }
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const errMsg = data.error?.message || `HTTP ${response.status} ${response.statusText}`;
      // Check if error suggests a newer model (e.g. "use models/gemini-3.8-flash")
      const suggestedModelMatch = errMsg.match(/use models\/(gemini-[\w.-]+)/i);
      if (suggestedModelMatch && suggestedModelMatch[1] && suggestedModelMatch[1] !== modelToUse) {
        const nextModel = suggestedModelMatch[1];
        console.warn(`Model ${modelToUse} obsolete. Retrying test with suggested model ${nextModel}...`);
        saveSelectedGeminiModel(nextModel);
        return await callTest(nextModel);
      }
      throw new Error(errMsg);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { ok: true, reply, modelUsed: modelToUse };
  };

  return await callTest(activeModel);
}

/**
 * Summarize and structure raw field visits & customer calls into an information-dense prompt context
 */
export function prepareReportDataForGemini({ visits = [], calls = [], filterInfo = {} }) {
  // 1. Visit Stats & Summaries
  const totalVisits = visits.length;
  const uniqueCustomers = new Set(visits.map(v => v.customer_id || v.customers?.name).filter(Boolean)).size;

  // Crops & Land Size
  const cropCounts = {};
  let totalHectares = 0;
  visits.forEach(v => {
    let crops = Array.isArray(v.crops) ? v.crops : [];
    if (crops.length === 0 && v.crop_type) {
      crops = [{ crop_type: v.crop_type, farm_size_ha: v.farm_size_ha }];
    }
    crops.forEach(c => {
      const type = (c.crop_type || 'មិនបញ្ជាក់').trim();
      cropCounts[type] = (cropCounts[type] || 0) + 1;
      const ha = parseFloat(c.farm_size_ha) || 0;
      totalHectares += ha;
    });
  });

  // Top Issues identified
  const issuesList = visits
    .map(v => (v.issues_identified || '').trim())
    .filter(Boolean)
    .slice(0, 40);

  // Recommendations given
  const solutionsList = visits
    .map(v => (v.products_recommended || '').trim())
    .filter(Boolean)
    .slice(0, 40);

  // Visit Purposes
  const purposeCounts = {};
  visits.forEach(v => {
    const p = (v.visit_purpose || v.notes?.match(/\[គោលបំណង:\s*([^\]]+)\]/)?.[1] || 'ចុះពិនិត្យទូទៅ').trim();
    purposeCounts[p] = (purposeCounts[p] || 0) + 1;
  });

  // Staff Ranking
  const staffActivity = {};
  visits.forEach(v => {
    const rep = (v.staff_name || '').trim();
    if (rep) staffActivity[rep] = (staffActivity[rep] || 0) + 1;
    let team = Array.isArray(v.team_members) ? v.team_members : [];
    team.forEach(m => {
      const mem = (m || '').trim();
      if (mem && mem !== rep) staffActivity[mem] = (staffActivity[mem] || 0) + 1;
    });
  });

  // Branch breakdown
  const branchCounts = {};
  visits.forEach(v => {
    const b = (v.branch || 'មិនបញ្ជាក់').trim();
    branchCounts[b] = (branchCounts[b] || 0) + 1;
  });

  // 2. Customer Phone Calls
  const totalCalls = calls.length;
  const callFeedbacks = calls
    .map(c => `• ${c.customer_name || 'អតិថិជន'} (${c.branch || ''}): ព័ត៌មាន=${c.customer_feedback || 'គ្មាន'}, ការណែនាំ=${c.team_advice || 'គ្មាន'}, ការសម្រេចចិត្ត=${c.customer_decision || 'គ្មាន'}`)
    .slice(0, 30);

  const callDecisions = {};
  calls.forEach(c => {
    const d = (c.customer_decision || 'មិនទាន់សម្រេច').trim();
    callDecisions[d] = (callDecisions[d] || 0) + 1;
  });

  return {
    meta: {
      dateRange: filterInfo.dateRangeLabel || 'ទាំងអស់',
      branch: filterInfo.branch || 'គ្រប់សាខា',
      staff: filterInfo.staff || 'គ្រប់បុគ្គលិក',
      totalVisits,
      totalCalls,
      uniqueCustomers,
      totalHectares: Math.round(totalHectares * 10) / 10
    },
    crops: cropCounts,
    purposes: purposeCounts,
    branches: branchCounts,
    staff: staffActivity,
    sampleIssues: issuesList,
    sampleSolutions: solutionsList,
    sampleCalls: callFeedbacks,
    callDecisions
  };
}

/**
 * Execute content generation using Google Gemini API
 */
export async function callGeminiAPI({
  prompt,
  systemInstruction = '',
  apiKey = null,
  model = null,
  temperature = 0.4
}) {
  const key = (apiKey || getGeminiApiKey()).trim();
  if (!key) {
    throw new Error('សូមបញ្ចូល Google Gemini API Key ជាមុនសិននៅក្នុងផ្ទាំងកំណត់!');
  }

  const activeModel = model || getSelectedGeminiModel();

  const executeCall = async (modelToUse) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${key}`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.95
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const errMsg = data.error?.message || `HTTP ${response.status} ${response.statusText}`;
      // Check if error suggests a newer model (e.g. "use models/gemini-3.8-flash")
      const suggestedModelMatch = errMsg.match(/use models\/(gemini-[\w.-]+)/i);
      if (suggestedModelMatch && suggestedModelMatch[1] && suggestedModelMatch[1] !== modelToUse) {
        const nextModel = suggestedModelMatch[1];
        console.warn(`Model ${modelToUse} obsolete. Automatically retrying with suggested model ${nextModel}...`);
        saveSelectedGeminiModel(nextModel);
        return await executeCall(nextModel);
      }
      throw new Error(`Gemini Error: ${errMsg}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      throw new Error('Gemini មិនបានបញ្ជូនចម្លើយមកវិញទេ សូមព្យាយាមម្តងទៀត!');
    }

    return text;
  };

  return await executeCall(activeModel);
}

/**
 * Standard System Instruction for Sremeas Agronomist & Business Analyst
 */
const SREMEAS_SYSTEM_INSTRUCTION = `
អ្នកគឺជាអ្នកជំនាញជាន់ខ្ពស់ផ្នែកក្សេត្រសាស្ត្រ (Senior Agronomist) និងអ្នកវិភាគយុទ្ធសាស្ត្រអាជីវកម្ម (Business Intelligence Analyst) នៃក្រុមហ៊ុនកសិកម្ម «ស្រែមាស» (Sremeas) នៅក្នុងប្រទេសកម្ពុជា។

គោលការណ៍ឆ្លើយតបរបស់អ្នក៖
1. ត្រូវឆ្លើយតបជាភាសាខ្មែរផ្លូវការ យ៉ាងក្បោះក្បាយ ច្បាស់លាស់ មានវិជ្ជាជីវៈខ្ពស់ និងរៀបចំជាទម្រង់ Structured Markdown ស្អាតបាត (មានក្បាលចំណងជើង #, ##, បញ្ជីចុចចំនុច •, និង emoji ឱ្យមើលទៅទាក់ទាញ)។
2. វិភាគដោយផ្អែកលើទិន្នន័យជាក់ស្តែងដែលបានផ្តល់ជូន (ទិន្នន័យចុះចំការ និងការខលសួរសុខទុក្ខភ្ញៀវ) ដោយមិនទាញការសន្និដ្ឋានដែលគ្មានមូលដ្ឋានឡើយ។
3. ផ្តល់នូវអនុសាសន៍យុទ្ធសាស្ត្រជាក់ស្តែង (Actionable Insights) ដល់ថ្នាក់ដឹកនាំ និងក្រុមការងារចុះផ្ទាល់ដី ដើម្បីបង្កើនទិន្នផលកសិករ និងពង្រីកការលក់ផលិតផលកសិកម្មស្រែមាស។
`;

/**
 * Run specialized AI analysis on field & call data
 */
export async function analyzeReportWithGemini({
  analysisType = 'strategic', // 'strategic' | 'pests' | 'calls' | 'custom'
  customQuestion = '',
  visits = [],
  calls = [],
  filterInfo = {},
  apiKey = null,
  model = null
}) {
  const data = prepareReportDataForGemini({ visits, calls, filterInfo });

  const dataContextJson = JSON.stringify(data, null, 2);

  let userPrompt = '';

  if (analysisType === 'strategic') {
    userPrompt = `
នេះជាទិន្នន័យជាក់ស្តែងនៃការចុះចំការ និងការខលសួរសុខទុក្ខអតិថិជនរបស់ក្រុមហ៊ុនស្រែមាស ក្នុងចន្លោះពេល «${data.meta.dateRange}» សម្រាប់សាខា «${data.meta.branch}»៖

\`\`\`json
${dataContextJson}
\`\`\`

សូមធ្វើការវិភាគទិន្នន័យយុទ្ធសាស្ត្រជារួម (Comprehensive Strategic Analysis) សម្រាប់ថ្នាក់ដឹកនាំពិនិត្យ ដោយបែងចែកជា ៥ ផ្នែកសំខាន់ៗ៖
1. 📊 **សេចក្តីសង្ខេបប្រតិបត្តិ (Executive Summary):** ទំហំសកម្មភាពចុះចំការ (${data.meta.totalVisits} លើក), ការខលតាមដាន (${data.meta.totalCalls} លើក), ផ្ទៃដីកសិកម្មសរុប (~${data.meta.totalHectares} ហិកតា), និងដំណាំចម្បងៗ។
2. ⚠️ **ការវិភាគបញ្ហាប្រឈម & និន្នាការតាមតំបន់ (Key Issues & Trends):** វិភាគបញ្ហាដែលកសិករជួបប្រទះច្រើនជាងគេ (សត្វល្អិត, ជំងឺ, អាកាសធាតុ, ដី...) តាមសាខា និងប្រភេទដំណាំ។
3. 💡 **ប្រសិទ្ធភាពនៃដំណោះស្រាយ & ការណែនាំ (Solutions & Advisory Effectiveness):** វិភាគផលិតផល និងដំណោះស្រាយដែលបុគ្គលិកបានណែនាំ។
4. 🧑‍🌾 **ការយល់ឃើញ & ឥរិយាបថរបស់កសិករ (Customer Sentiment & Decisions):** វិភាគលទ្ធផលនៃការខលតាមដាន អត្រានៃការយល់ព្រមអនុវត្តតាម និងកង្វល់របស់កសិករ។
5. 🎯 **អនុសាសន៍យុទ្ធសាស្ត្រសម្រាប់ថ្នាក់ដឹកនាំ (Strategic Recommendations for Leadership):** ផ្តល់នូវអនុសាសន៍ជាក់ស្តែង ៣ ទៅ ៥ ចំណុច សម្រាប់ជំហានបន្ទាប់ (ផលិតផលដែលគួរត្រៀមស្តុក, តំបន់ដែលត្រូវចុះជួយសង្គ្រោះជាបន្ទាន់, ផែនការបណ្តុះបណ្តាលកសិករ)។
`;
  } else if (analysisType === 'pests') {
    userPrompt = `
ផ្អែកលើទិន្នន័យចុះចំការរបស់ក្រុមហ៊ុនស្រែមាស៖
\`\`\`json
${dataContextJson}
\`\`\`

សូមធ្វើការវិភាគស៊ីជម្រៅលើ **«បញ្ហាជំងឺ សត្វល្អិត និងសុខភាពដំណាំ»**៖
1. 🐛 **ប្រភេទសត្វល្អិត និងជំងឺចម្បងៗ:** ដែលកើតមានញឹកញាប់បំផុតលើដំណាំនីមួយៗ (ស្វាយចន្ទី, ដំឡូងមី, ស្រូវ, ធុរេន... បើមាន)។
2. 🗺️ **ការបែងចែកតាមភូមិសាស្ត្រ/សាខា:** តំបន់ណាដែលកំពុងរងផលប៉ះពាល់ធ្ងន់ធ្ងរជាងគេ។
3. 🧪 **ដំណោះស្រាយ និងវិធានការការពារបច្ចេកទេស:** ថ្នាំការពារសត្វល្អិត ជីបំប៉ន និងបច្ចេកទេសកសិកម្មត្រឹមត្រូវដែលកសិករគួរអនុវត្ត។
4. 🚨 **ការប្រកាសអាសន្ន និងការត្រៀមបង្ការ:** អ្វីដែលកសិករត្រូវប្រយ័ត្នក្នុងរដូវកាលខាងមុខ។
`;
  } else if (analysisType === 'calls') {
    userPrompt = `
ផ្អែកលើទិន្នន័យការខលសួរសុខទុក្ខអតិថិជនរបស់ក្រុមហ៊ុនស្រែមាស៖
\`\`\`json
${dataContextJson}
\`\`\`

សូមធ្វើការវិភាគលើ **«លទ្ធផលការខលតាមដាន & ឥរិយាបថអតិថិជន»**៖
1. 📞 **ស្ថានភាពនៃការទំនាក់ទំនង:** ចំនួនការខល (${data.meta.totalCalls} លើក) និងប្រធានបទដែលបានជជែកជាមួយកសិករ។
2. ✅ **អត្រានៃការសម្រេចចិត្តរបស់កសិករ:** ភាគរយកសិករដែលយល់ព្រមអនុវត្តតាមការណែនាំ, កសិករដែលនៅស្ទាក់ស្ទើរ, និងកសិករដែលបដិសេធ។
3. 💬 **កង្វល់ចម្បងរបស់អតិថិជន:** តម្លៃផលិតផល, ភាពយឺតយ៉ាវ, ប្រសិទ្ធភាពថ្នាំ, ឬបញ្ហាទីផ្សារកសិផល។
4. 📈 **យុទ្ធសាស្ត្រកែលម្អការខលតាមដាន:** របៀបណែនាំឱ្យកាន់តែមានប្រសិទ្ធភាព និងជំរុញការបញ្ជាទិញឡើងវិញ (Customer Retention & Re-order Strategy)។
`;
  } else {
    // Custom Question
    userPrompt = `
ផ្អែកលើទិន្នន័យជាក់ស្តែងនៃការចុះចំការ និងការខលសួរសុខទុក្ខអតិថិជនស្រែមាសខាងក្រោម៖
\`\`\`json
${dataContextJson}
\`\`\`

សំណួរពីអ្នកប្រើប្រាស់៖
«${customQuestion}»

សូមឆ្លើយតបសំណួរនេះឱ្យបានក្បោះក្បាយ ច្បាស់លាស់ ផ្អែកលើទិន្នន័យពិតខាងលើជាភាសាខ្មែរផ្លូវការ។
`;
  }

  return await callGeminiAPI({
    prompt: userPrompt,
    systemInstruction: SREMEAS_SYSTEM_INSTRUCTION,
    apiKey,
    model
  });
}

/**
 * Send AI generated analysis report to Telegram Group
 */
export async function sendAiReportToTelegram(reportText, filterInfo = {}) {
  const settings = getTelegramSettings();
  const botToken = settings?.botToken?.trim();
  const chatId = settings?.chatId?.trim();

  if (!botToken || !chatId) {
    throw new Error('សូមបញ្ចូល Telegram Bot Token និង Chat ID ជាមុនសិន!');
  }

  const header = [
    `✨ របាយការណ៍វិភាគទិន្នន័យដោយ Google Gemini AI`,
    `🏢 ក្រុមហ៊ុន ស្រែមាស (Sremeas Field Intelligence)`,
    `📅 កាលបរិច្ឆេទ: ${filterInfo.dateRangeLabel || 'ទាំងអស់'}`,
    `🏢 សាខា: ${filterInfo.branch || 'គ្រប់សាខា'}`,
    `━━━━━━━━━━━━━━`,
    ``
  ].join('\n');

  const footer = [
    ``,
    `━━━━━━━━━━━━━━`,
    `🤖 វិភាគដោយ Google Gemini AI សម្រាប់ថ្នាក់ដឹកនាំពិនិត្យ`
  ].join('\n');

  const fullMessage = header + reportText + footer;

  // Telegram sendMessage limit is 4096 characters.
  // Split into safe chunks if necessary.
  const CHUNK_SIZE = 3800;
  if (fullMessage.length <= CHUNK_SIZE) {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: fullMessage,
        disable_web_page_preview: true
      })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.description || 'បរាជ័យក្នុងការផ្ញើទៅ Telegram');
    return data;
  } else {
    // Send in multi-part chunks
    let remaining = fullMessage;
    let part = 1;
    let lastResult = null;
    while (remaining.length > 0) {
      const chunk = remaining.slice(0, CHUNK_SIZE);
      remaining = remaining.slice(CHUNK_SIZE);
      const chunkText = `[ផ្នែកទី ${part}]\n` + chunk;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunkText,
          disable_web_page_preview: true
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.description || `បរាជ័យក្នុងការផ្ញើផ្នែកទី ${part}`);
      lastResult = data;
      part++;
    }
    return lastResult;
  }
}

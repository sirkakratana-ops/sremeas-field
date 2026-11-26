// Customer Phone Call Follow-up Utilities & Storage Handler
import { formatPhoneNumber, formatProvince } from './staffUtils.js';
import { getTelegramSettings } from './telegramUtils.js';

export const CALL_TYPES = [
  'សួរសុខទុក្ខទូទៅ',
  'តាមដានការលូតលាស់ដំណាំ',
  'ដោះស្រាយបញ្ហាជំងឺ/សត្វល្អិត',
  'តាមដានក្រោយការណែនាំ/ប្រើប្រាស់',
  'ណែនាំផលិតផលថ្មី',
  'សាកសួរការបញ្ជាទិញ',
  'ផ្សេងៗ'
];

export const DECISION_SUGGESTIONS = [
  'យល់ព្រមអនុវត្តតាមការណែនាំ',
  'យល់ព្រមបញ្ជាទិញផលិតផល',
  'សុំពិចារណាមើលសិន',
  'សុំពិគ្រោះជាមួយក្រុមគ្រួសារ',
  'មិនទាន់មានលទ្ធភាព/ផ្អាកសិន',
  'ពេញចិត្តនឹងលទ្ធផលក្រោយប្រើប្រាស់',
  'មិនទាន់ចាប់អារម្មណ៍'
];

export const FEEDBACK_SUGGESTIONS = [
  'ដំណាំលូតលាស់ល្អ ដើមរឹងមាំ គ្មានបញ្ហាអ្វីទេ',
  'ស្លឹកចាប់ផ្តើមលឿង ដើមក្រិន មិនសូវលូតលាស់ល្អ',
  'មានសត្វល្អិត/ដង្កូវស៊ីត្រួយ និងចោះស្លឹក',
  'ក្រោយប្រើប្រាស់ជី/ថ្នាំរួច ឃើញបែកមែកធាងល្អ និងបែកធាងច្រើន',
  'អាកាសធាតុក្តៅខ្លាំង ខ្វះទឹកស្រោចស្រព',
  'ទិន្នផលប្រមូលផលកើនឡើងជាទីគាប់ចិត្ត'
];

export const ADVICE_SUGGESTIONS = [
  'ណែនាំឱ្យបាញ់ថ្នាំការពារសត្វល្អិតនៅពេលព្រឹកព្រលឹម ឬពេលល្ងាចត្រជាក់',
  'ណែនាំឱ្យបន្ថយការស្រោចទឹក និងបន្ថែមជីបំប៉នឫស និងស្លឹក',
  'ណែនាំឱ្យប្រើប្រាស់ផលិតផលស្រែមាសតាមកម្រិតស្តង់ដារ និងតាមកាលវិភាគ',
  'ណែនាំឱ្យកាត់មែកខូចចោលដើម្បីកុំឱ្យឆ្លងរាលដាល',
  'ណែនាំវិធីសាស្ត្រលាយជី និងថ្នាំកុំឱ្យប៉ះពាល់ដល់ការលូតលាស់'
];

export const SQL_CALL_TABLE_SCRIPT = `
-- ==========================================================
-- បង្កើតតារាងកត់ត្រាការខលសួរសុខទុក្ខភ្ញៀវ (Customer Call Logs Table)
-- ==========================================================
create table if not exists customer_calls (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  staff_name text not null,
  branch text default 'ការិយាល័យកណ្តាល',
  call_date timestamp with time zone default now(),
  call_type text default 'សួរសុខទុក្ខទូទៅ',
  customer_feedback text not null, -- ព័ត៌មានទទួលបានពីអតិថិជន
  team_advice text not null,        -- ការណែនាំរបស់ក្រុមការងារ
  customer_decision text not null,  -- ការសម្រេចចិត្តរបស់អតិថិជនក្រោយពីទទួលបានការណែនាំ
  next_followup_date date,
  notes text,
  created_at timestamp with time zone default now()
);

-- បើកសិទ្ធិ RLS សម្រាប់តារាង customer_calls
alter table customer_calls enable row level security;
create policy "Allow all access to customer_calls" 
  on customer_calls for all 
  using (true) 
  with check (true);
`;

/**
 * Format Call Date for display (DD/MM/YYYY hh:mm A)
 */
export function formatCallDate(dateVal) {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateVal);
  }
}

/**
 * Format Call Date in short format (DD/MM/YYYY)
 */
export function formatCallDateShort(dateVal) {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateVal);
  }
}

/**
 * Format executive telegram text for a customer phone call
 */
export function formatCallTelegramText(call) {
  if (!call) return '';

  const dateStr = formatCallDate(call.call_date);
  const nextDateStr = call.next_followup_date ? formatCallDateShort(call.next_followup_date) : 'គ្មាន';

  // Address
  const locParts = [
    call.customers?.village,
    call.customers?.commune,
    call.customers?.district,
    formatProvince(call.customers?.province)
  ].filter(Boolean);
  const locStr = locParts.length > 0 ? locParts.join(', ') : (call.location_address || 'មិនបានបញ្ជាក់');

  const phoneStr = formatPhoneNumber(call.customer_phone || call.customers?.phone) || '—';
  const cropStr = call.customers?.primary_crop || call.crop_type || '—';

  const lines = [
    `📞 របាយការណ៍ខលសួរសុខទុក្ខអតិថិជន`,
    ``,
    `📅 កាលបរិច្ឆេទ: ${dateStr}`,
    `👤 អ្នកខល: ${call.staff_name || '—'}`,
    `🏢 សាខា: ${call.branch || 'ការិយាល័យកណ្តាល'}`,
    `🎯 ប្រភេទការខល: ${call.call_type || 'សួរសុខទុក្ខទូទៅ'}`,
    `━━━━━━━━━━━━━━`,
    `🧑‍🌾 ព័ត៌មានអតិថិជន`,
    `• ឈ្មោះអតិថិជន: ${call.customer_name || call.customers?.name || 'មិនស្គាល់'}`,
    `• លេខទូរស័ព្ទ: ${phoneStr}`,
    `• អាសយដ្ឋាន: ${locStr}`,
    `• ដំណាំ: ${cropStr}`,
    ``,
    `📋 ព័ត៌មានទទួលបានពីអតិថិជន:`,
    `${call.customer_feedback || '—'}`,
    ``,
    `💡 ការណែនាំរបស់ក្រុមការងារ:`,
    `${call.team_advice || '—'}`,
    ``,
    `✅ ការសម្រេចចិត្តរបស់អតិថិជនក្រោយពីទទួលបានការណែនាំ:`,
    `${call.customer_decision || '—'}`,
    ``,
    `📌 កាលបរិច្ឆេទតាមដានបន្ត: ${nextDateStr}`,
    call.notes ? `\n📝 កំណត់សម្គាល់: ${call.notes}` : '',
    `━━━━━━━━━━━━━━`,
    `🙏 សូមថ្នាក់ដឹកនាំពិនិត្យ និងផ្តល់យោបល់`
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Send customer call log directly to Telegram Group via Bot API
 */
export async function sendCallViaTelegramBot(call, customSettings = null) {
  const settings = customSettings || getTelegramSettings();
  const botToken = settings?.botToken?.trim();
  const chatId = settings?.chatId?.trim();

  if (!botToken || !chatId) {
    throw new Error('សូមបញ្ចូល Telegram Bot Token និង Chat ID ជាមុនសិន!');
  }

  const text = formatCallTelegramText(call);

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      disable_web_page_preview: true
    })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.description || 'មិនអាចផ្ញើសារចូល Telegram Group បានទេ!');
  }
  return data;
}

/**
 * Fetch all customer call logs from Supabase with LocalStorage cache fallback
 */
export async function fetchCustomerCalls(supabaseClient) {
  // 1. Try querying Supabase
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('customer_calls')
        .select('*, customers(*)')
        .order('call_date', { ascending: false });

      if (!error && Array.isArray(data)) {
        // Save to cache
        try {
          localStorage.setItem('sremeas_customer_calls_cache', JSON.stringify(data));
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn('Error fetching calls from Supabase, falling back to cache:', err);
    }
  }

  // 2. Read from localStorage fallback
  try {
    const raw = localStorage.getItem('sremeas_customer_calls_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

/**
 * Save (create or update) customer call log
 */
export async function saveCustomerCall(supabaseClient, callData) {
  if (!callData) throw new Error('No call data provided');

  const id = callData.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    id,
    customer_id: callData.customer_id || null,
    customer_name: (callData.customer_name || '').trim(),
    customer_phone: (callData.customer_phone || '').trim() || null,
    staff_name: (callData.staff_name || '').trim(),
    branch: (callData.branch || 'ការិយាល័យកណ្តាល').trim(),
    call_date: callData.call_date || now,
    call_type: callData.call_type || 'សួរសុខទុក្ខទូទៅ',
    customer_feedback: (callData.customer_feedback || '').trim(),
    team_advice: (callData.team_advice || '').trim(),
    customer_decision: (callData.customer_decision || '').trim(),
    next_followup_date: callData.next_followup_date || null,
    notes: (callData.notes || '').trim() || null
  };

  // 1. Try upserting to Supabase
  let savedToCloud = false;
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('customer_calls')
        .upsert(payload);

      if (!error) {
        savedToCloud = true;
      } else {
        console.warn('Supabase upsert call error (using local storage fallback):', error.message);
      }
    } catch (err) {
      console.warn('Network error saving to cloud, saving locally:', err);
    }
  }

  // 2. Always persist to localStorage cache
  try {
    const raw = localStorage.getItem('sremeas_customer_calls_cache');
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    const existingIdx = list.findIndex(c => c.id === id);
    const enrichedCall = {
      ...payload,
      customers: callData.customers || null
    };

    if (existingIdx >= 0) {
      list[existingIdx] = enrichedCall;
    } else {
      list.unshift(enrichedCall);
    }

    localStorage.setItem('sremeas_customer_calls_cache', JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to update localStorage cache:', err);
  }

  return { ...payload, customers: callData.customers || null, savedToCloud };
}

/**
 * Delete a customer call log
 */
export async function deleteCustomerCall(supabaseClient, id) {
  if (!id) return;

  // 1. Delete from Supabase
  if (supabaseClient) {
    try {
      await supabaseClient.from('customer_calls').delete().eq('id', id);
    } catch (err) {
      console.warn('Error deleting call from Supabase:', err);
    }
  }

  // 2. Delete from localStorage cache
  try {
    const raw = localStorage.getItem('sremeas_customer_calls_cache');
    if (raw) {
      let list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list = list.filter(c => c.id !== id);
        localStorage.setItem('sremeas_customer_calls_cache', JSON.stringify(list));
      }
    }
  } catch (err) {
    console.warn('Failed to delete from localStorage cache:', err);
  }
}

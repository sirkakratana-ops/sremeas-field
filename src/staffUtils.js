// Staff utilities, crop helpers & date calculation functions

export const CROP_SUGGESTIONS = [
  'ស្វាយចន្ទី', 'ទុរេន', 'ស្រូវ', 'ដំឡូងមី', 'ពោត', 
  'កៅស៊ូ', 'ស្វាយ', 'ម្រេច', 'ក្រូចពោធិ៍សាត់', 'ចេក', 
  'មៀន/តាង៉ែន', 'កាហ្វេ', 'បន្លែចម្រុះ'
];

export const VARIETY_SUGGESTIONS = {
  'ស្វាយចន្ទី': ['M23', 'M10', 'M1', 'H09', 'សំបូរ', 'ម៉ាឡេ'],
  'ទុរេន': ['ម៊ូសាងឃីង (Musang King)', 'ប្ល៊ែកថន (Black Thorn)', 'ម៉ាន់ថង (Monthong)', 'កានយ៉ាវ (Kanyao)', 'ឱខាក់'],
  'ស្រូវ': ['ផ្ការំដួល', 'សែនក្រអូប', 'អ៊ីអ៊ែរ (IR)', '៥០៤', 'គា៥'],
  'ដំឡូងមី': ['គីឡូ៩', 'គីឡូ៨', 'ពូជថៃ ៨១', 'ពូជស្រុក'],
  'ស្វាយ': ['កែវរមៀត', 'កែវចិន', 'អូកុង'],
  'ម្រេច': ['ម្រេចកំពត', 'ម្រេចពូជខ្មែរ']
};

export const SQL_SCHEMA_SCRIPT = `-- ==========================================================
-- 1. បន្ថែមជួរឈរ (Columns) ក្នុងតារាង customers
-- ==========================================================
alter table if exists customers 
  add column if not exists gender text,
  add column if not exists customer_type text default 'កសិករ',
  add column if not exists commune text,
  add column if not exists district text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists crops jsonb default '[]'::jsonb;

-- ==========================================================
-- 2. បន្ថែមជួរឈរ crops ក្នុងតារាង field_visits
-- ==========================================================
alter table if exists field_visits 
  add column if not exists crops jsonb default '[]'::jsonb;

-- ==========================================================
-- 3. បង្កើតតារាងបុគ្គលិក (Staff Table)
-- ==========================================================
create table if not exists staff (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  gender text default 'ប្រុស',
  phone text,
  dob date,
  email text,
  role text default 'បុគ្គលិកទីផ្សារ',
  branch text default 'ការិយាល័យកណ្តាល',
  username text unique not null,
  password text not null,
  status text default 'សកម្ម',
  permissions jsonb default '{"can_manage_staff": false, "can_edit_customer": true, "can_delete_customer": false, "can_delete_visit": false, "can_export_reports": true}'::jsonb,
  created_at timestamp with time zone default now()
);

-- បើកសិទ្ធិ RLS សម្រាប់តារាង staff
alter table staff enable row level security;
create policy "Allow all access to staff" 
  on staff for all 
  using (true) 
  with check (true);

-- បង្កើតគណនី Admin ដំបូង
insert into staff (name, gender, phone, email, role, branch, username, password, status, permissions)
values (
  'Admin ប្រព័ន្ធ',
  'ប្រុស',
  '012 345 678',
  'admin@sremeas.com',
  'Admin',
  'ការិយាល័យកណ្តាល',
  'admin',
  'admin123',
  'សកម្ម',
  '{"can_manage_staff": true, "can_edit_customer": true, "can_delete_customer": true, "can_delete_visit": true, "can_export_reports": true}'::jsonb
) on conflict (username) do nothing;`;

/**
 * Calculate age automatically from Date of Birth (YYYY-MM-DD or DD-MM-YYYY)
 */
export function calculateAge(dobString) {
  if (!dobString) return null;
  let birthDate;
  if (typeof dobString === 'string' && dobString.includes('-')) {
    const parts = dobString.split('-');
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      birthDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else {
      birthDate = new Date(dobString);
    }
  } else {
    birthDate = new Date(dobString);
  }

  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Format date string into DD-MM-YYYY format
 */
export function formatDateDMY(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format date for HTML input type="date" (YYYY-MM-DD)
 */
export function toInputDateFormat(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Normalize and parse crops list from DB or JSON
 */
export function parseCrops(cropsData, fallbackCrop = '', fallbackSize = null) {
  if (Array.isArray(cropsData) && cropsData.length > 0) {
    return cropsData;
  }
  if (typeof cropsData === 'string') {
    try {
      const parsed = JSON.parse(cropsData);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  if (fallbackCrop) {
    return [{
      crop_type: fallbackCrop,
      variety: '',
      farm_size_ha: fallbackSize || null,
      plant_count: null,
      crop_age: ''
    }];
  }
  return [];
}

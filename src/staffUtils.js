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

/**
 * Extract distinct branch names strictly from staff table
 */
export function getStaffBranches(staffList = []) {
  if (!Array.isArray(staffList)) return ['ការិយាល័យកណ្តាល'];
  const branches = Array.from(new Set(
    staffList.map(s => (s?.branch || '').trim()).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));
  return branches.length > 0 ? branches : ['ការិយាល័យកណ្តាល'];
}

export const BRANCH_SUGGESTIONS = [];

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
  add column if not exists crops jsonb default '[]'::jsonb,
  add column if not exists branches jsonb default '[]'::jsonb,
  add column if not exists branch text;

-- ==========================================================
-- 2. បន្ថែមជួរឈរ crops, branch, team_members ក្នុងតារាង field_visits
-- ==========================================================
alter table if exists field_visits 
  add column if not exists crops jsonb default '[]'::jsonb,
  add column if not exists branch text,
  add column if not exists team_members jsonb default '[]'::jsonb;

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

/**
 * Normalize and parse customer branches list from DB or JSON
 */
export function parseBranches(branchesData, fallbackBranch = '') {
  if (Array.isArray(branchesData) && branchesData.length > 0) {
    return branchesData.filter(Boolean);
  }
  if (typeof branchesData === 'string' && branchesData.trim()) {
    try {
      const parsed = JSON.parse(branchesData);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(Boolean);
    } catch {}
    return branchesData.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (fallbackBranch) {
    if (typeof fallbackBranch === 'string') {
      return fallbackBranch.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Fetch staff members from Supabase with localStorage / fallback support
 */
export async function getStaffList(supabaseClient) {
  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('staff').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Error fetching staff list:', e);
  }

  // LocalStorage fallback
  try {
    const local = localStorage.getItem('sremeas_local_staff');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return [
    {
      id: 'staff-default-admin',
      name: 'Admin ប្រព័ន្ធ',
      role: 'Admin',
      branch: 'ការិយាល័យកណ្តាល',
      status: 'សកម្ម'
    }
  ];
}

/**
 * Normalize phone number to standard digits format (e.g. "015612512")
 * Strips spaces, dashes, dots, parentheses, and converts Cambodia code +855 / 855 to 0.
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('8550')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('855') && digits.length >= 11) {
    digits = '0' + digits.slice(3);
  }
  return digits;
}

/**
 * Generate common Cambodian phone spacing formats for database query matching
 */
export function getPhoneVariations(phone) {
  const norm = normalizePhone(phone);
  if (!norm || norm.length < 8) return [];
  const vars = new Set();
  vars.add(norm); // 015612512
  
  if (norm.length === 9) {
    // 3-3-3 (e.g. 015 612 512)
    vars.add(norm.slice(0, 3) + ' ' + norm.slice(3, 6) + ' ' + norm.slice(6));
    vars.add(norm.slice(0, 3) + '-' + norm.slice(3, 6) + '-' + norm.slice(6));
    // 3-2-2-2 (e.g. 015 61 25 12)
    vars.add(norm.slice(0, 3) + ' ' + norm.slice(3, 5) + ' ' + norm.slice(5, 7) + ' ' + norm.slice(7));
  } else if (norm.length === 10) {
    // 3-3-4 (e.g. 012 345 6789)
    vars.add(norm.slice(0, 3) + ' ' + norm.slice(3, 6) + ' ' + norm.slice(6));
    vars.add(norm.slice(0, 3) + '-' + norm.slice(3, 6) + '-' + norm.slice(6));
    // 3-3-2-2 (e.g. 012 345 67 89)
    vars.add(norm.slice(0, 3) + ' ' + norm.slice(3, 6) + ' ' + norm.slice(6, 8) + ' ' + norm.slice(8));
  }
  return Array.from(vars);
}

/**
 * Check if a customer with the given phone number already exists
 * Returns the matching customer object if found, or null if no duplicate exists.
 */
export async function checkDuplicateCustomerPhone(phone, excludeCustomerId = null, customersList = [], supabaseClient = null) {
  const norm = normalizePhone(phone);
  if (!norm || norm.length < 8) return null;

  // 1. Check in-memory customers list
  if (Array.isArray(customersList) && customersList.length > 0) {
    const found = customersList.find(c => {
      if (excludeCustomerId && c.id === excludeCustomerId) return false;
      return normalizePhone(c.phone) === norm;
    });
    if (found) return found;
  }

  // 2. Query Supabase database to be thorough
  if (supabaseClient) {
    try {
      const raw = String(phone).trim();
      const variations = getPhoneVariations(phone);
      const last3 = norm.slice(-3);
      
      const filterList = [
        `phone.eq.${raw}`,
        ...variations.map(v => `phone.eq.${v}`),
        `phone.ilike.%${last3}%`
      ];
      const orFilters = filterList.join(',');

      const { data, error } = await supabaseClient
        .from('customers')
        .select('id, name, phone, village, commune, district, province, branch, branches, customer_type, primary_crop, crops')
        .not('phone', 'is', null)
        .or(orFilters)
        .limit(25);

      if (!error && Array.isArray(data)) {
        const match = data.find(c => {
          if (excludeCustomerId && c.id === excludeCustomerId) return false;
          return normalizePhone(c.phone) === norm;
        });
        if (match) return match;
      }
    } catch (err) {
      console.warn('Error during phone duplication check:', err);
    }
  }

  return null;
}

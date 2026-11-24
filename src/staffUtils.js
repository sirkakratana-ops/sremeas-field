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

export const PURPOSE_SUGGESTIONS = [
  'ចុះពិនិត្យដំណាំ',
  'តាមដានការលូតលាស់',
  'ដោះស្រាយបញ្ហាជំងឺ/សត្វល្អិត',
  'ណែនាំបច្ចេកទេសប្រើប្រាស់ជី/ថ្នាំ',
  'ចុះណែនាំផលិតផលថ្មី',
  'ជួបសំណេះសំណាលកសិករ',
  'តាមដានប្រសិទ្ធភាពក្រោយប្រើប្រាស់',
  'វាយតម្លៃទិន្នផលប្រមូលផល'
];

/**
 * Clean and normalize branch names by stripping zero-width spaces, special whitespace, and trimming.
 */
export function cleanBranchName(branch) {
  if (!branch) return '';
  return String(branch)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Extract distinct branch names strictly from staff table
 */
export function getStaffBranches(staffList = []) {
  if (!Array.isArray(staffList)) return ['ការិយាល័យកណ្តាល'];
  const branches = Array.from(new Set(
    staffList.map(s => cleanBranchName(s?.branch)).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));
  return branches.length > 0 ? branches : ['ការិយាល័យកណ្តាល'];
}

export const BRANCH_SUGGESTIONS = [];

export const DEFAULT_USER_PERMISSIONS = {
  // 1. បញ្ជីចុះចំការ (Visits)
  can_view_visits: true,
  can_create_visit: true,
  can_edit_visit: true,
  can_delete_visit: false,

  // 2. បញ្ជីអតិថិជន (Customers)
  can_view_customers: true,
  can_create_customer: true,
  can_edit_customer: true,
  can_delete_customer: false,

  // 3. បញ្ជីបុគ្គលិក (Staff)
  can_view_staff: false,
  can_create_staff: false,
  can_edit_staff: false,
  can_delete_staff: false,
  can_manage_staff: false,

  // 4. របាយការណ៍ & ផែនទី (Reports & Maps)
  can_view_reports: true,
  can_export_reports: true,
  can_view_map: true,
};

export const ADMIN_FULL_PERMISSIONS = {
  can_view_visits: true,
  can_create_visit: true,
  can_edit_visit: true,
  can_delete_visit: true,

  can_view_customers: true,
  can_create_customer: true,
  can_edit_customer: true,
  can_delete_customer: true,

  can_view_staff: true,
  can_create_staff: true,
  can_edit_staff: true,
  can_delete_staff: true,
  can_manage_staff: true,

  can_view_reports: true,
  can_export_reports: true,
  can_view_map: true,
};

/**
 * Check whether a user has a specific permission
 */
export function hasPermission(user, permKey, defaultVal = true) {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  if (!user.permissions) return defaultVal;

  if (permKey === 'can_view_staff' || permKey === 'can_create_staff' || permKey === 'can_edit_staff') {
    if (user.permissions.can_manage_staff) return true;
  }
  if (permKey === 'can_manage_staff') {
    if (user.permissions.can_view_staff || user.permissions.can_create_staff || user.permissions.can_edit_staff) return true;
  }

  return user.permissions[permKey] !== undefined ? Boolean(user.permissions[permKey]) : defaultVal;
}

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
-- 2. បន្ថែមជួរឈរ crops, branch, team_members, farmer_history ក្នុងតារាង field_visits
-- ==========================================================
alter table if exists field_visits 
  add column if not exists crops jsonb default '[]'::jsonb,
  add column if not exists branch text,
  add column if not exists team_members jsonb default '[]'::jsonb,
  add column if not exists farmer_history text;

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
) on conflict (username) do nothing;

-- ==========================================================
-- 4. គោលការណ៍លុបរូបភាពចាស់លើសពី ៧ថ្ងៃ ដោយស្វ័យប្រវត្តិ (Storage & Data Cleanup)
-- ==========================================================
create or replace function cleanup_old_visit_photos()
returns void as $$
begin
  -- លុប references ក្នុង field_visits
  update field_visits
  set photos = '[]'::jsonb
  where (visit_date < now() - interval '7 days' or created_at < now() - interval '7 days')
    and photos is not null
    and jsonb_array_length(photos) > 0;

  -- លុប Object រូបភាពក្នុង Supabase Storage
  delete from storage.objects
  where bucket_id = 'visit-photos'
    and created_at < now() - interval '7 days';
end;
$$ language plpgsql security definer;`;

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
 * Format phone number to standard Cambodian display: 012 345 678 (9 digits) or 012 345 6789 (10 digits).
 * Handles raw continuous digits, dashes, spaces, and international +855 prefix.
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  const norm = normalizePhone(phone);
  if (!norm) return '';

  const d = norm.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)}`;
}

/**
 * Handle user typing phone input dynamically with smooth backspace handling.
 */
export function handlePhoneInputChange(rawValue, previousValue = '') {
  if (previousValue && previousValue.endsWith(' ') && rawValue === previousValue.slice(0, -1)) {
    return formatPhoneNumber(rawValue.slice(0, -1));
  }
  return formatPhoneNumber(rawValue);
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

/**
 * 25 Provinces & Capital of Cambodia in Khmer
 */
export const CAMBODIA_PROVINCES = [
  'បន្ទាយមានជ័យ',
  'បាត់ដំបង',
  'កំពង់ចាម',
  'កំពង់ឆ្នាំង',
  'កំពង់ស្ពឺ',
  'កំពង់ធំ',
  'កំពត',
  'កណ្តាល',
  'កោះកុង',
  'ក្រចេះ',
  'មណ្ឌលគិរី',
  'ភ្នំពេញ',
  'ព្រះវិហារ',
  'ព្រៃវែង',
  'ពោធិ៍សាត់',
  'រតនគិរី',
  'សៀមរាប',
  'ព្រះសីហនុ',
  'ស្ទឹងត្រែង',
  'ស្វាយរៀង',
  'តាកែវ',
  'ឧត្តរមានជ័យ',
  'កែប',
  'ប៉ៃលិន',
  'ត្បូងឃ្មុំ'
];

/**
 * English to Khmer Province Mapping
 */
export const PROVINCE_EN_TO_KH = {
  'battambang': 'បាត់ដំបង',
  'tbong khmum': 'ត្បូងឃ្មុំ',
  'tboung khmum': 'ត្បូងឃ្មុំ',
  'tbongkhmum': 'ត្បូងឃ្មុំ',
  'kratie': 'ក្រចេះ',
  'siem reap': 'សៀមរាប',
  'siemreap': 'សៀមរាប',
  'kampong cham': 'កំពង់ចាម',
  'kampongcham': 'កំពង់ចាម',
  'kampong thom': 'កំពង់ធំ',
  'kampongthom': 'កំពង់ធំ',
  'mondulkiri': 'មណ្ឌលគិរី',
  'preah vihear': 'ព្រះវិហារ',
  'preahvihear': 'ព្រះវិហារ',
  'pursat': 'ពោធិ៍សាត់',
  'oddar meanchey': 'ឧត្តរមានជ័យ',
  'oddarmeanchey': 'ឧត្តរមានជ័យ',
  'otdar meanchey': 'ឧត្តរមានជ័យ',
  'pailin': 'ប៉ៃលិន',
  'banteay meanchey': 'បន្ទាយមានជ័យ',
  'banteaymeanchey': 'បន្ទាយមានជ័យ',
  'ratanakiri': 'រតនគិរី',
  'steung treng': 'ស្ទឹងត្រែង',
  'stung treng': 'ស្ទឹងត្រែង',
  'steungtreng': 'ស្ទឹងត្រែង',
  'stungtreng': 'ស្ទឹងត្រែង',
  'kep': 'កែប',
  'koh kong': 'កោះកុង',
  'kohkong': 'កោះកុង',
  'prey veng': 'ព្រៃវែង',
  'preyveng': 'ព្រៃវែង',
  'kampong chhnang': 'កំពង់ឆ្នាំង',
  'kampongchhnang': 'កំពង់ឆ្នាំង',
  'kampong speu': 'កំពង់ស្ពឺ',
  'kampongspeu': 'កំពង់ស្ពឺ',
  'kandal': 'កណ្តាល',
  'phnom penh': 'ភ្នំពេញ',
  'phnompenh': 'ភ្នំពេញ',
  'svay rieng': 'ស្វាយរៀង',
  'svayrieng': 'ស្វាយរៀង',
  'takeo': 'តាកែវ',
  'kampot': 'កំពត',
  'preah sihanouk': 'ព្រះសីហនុ',
  'sihanoukville': 'ព្រះសីហនុ',
  'sihanouk': 'ព្រះសីហនុ'
};

/**
 * Format any province string to standard Khmer name
 */
export function formatProvince(province) {
  if (!province) return '';
  const trimmed = String(province).trim();
  const lower = trimmed.toLowerCase();
  if (PROVINCE_EN_TO_KH[lower]) {
    return PROVINCE_EN_TO_KH[lower];
  }
  return trimmed;
}

/**
 * Extract Latitude and Longitude from Google Maps, Apple Maps, OpenStreetMap, Waze or raw coordinates string.
 * Returns { lat: number, lng: number } or null.
 */
export function extractCoordinatesFromMapUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {}

  // 1. DMS format: e.g. 11°33'23.0"N 104°55'41.5"E or 11d33m23.0sN 104d55m41.5sE
  const dmsRegex = /(\d+[\D]+\d+[\D]+[\d.]+[\D]*[NSns])[\D]+(\d+[\D]+\d+[\D]+[\d.]+[\D]*[EWew])/;
  const dmsMatch = decoded.match(dmsRegex);
  if (dmsMatch) {
    const parseDMS = (str) => {
      const m = str.match(/(\d+)[\D]+(\d+)[\D]+([\d.]+)[\D]*([NSEWnsew])/);
      if (!m) return null;
      let val = parseFloat(m[1]) + (parseFloat(m[2]) / 60) + (parseFloat(m[3]) / 3600);
      const dir = m[4].toUpperCase();
      if (dir === 'S' || dir === 'W') val = -val;
      return val;
    };
    const lat = parseDMS(dmsMatch[1]);
    const lng = parseDMS(dmsMatch[2]);
    if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 2. Google Maps @lat,lng: e.g. /@11.5564,104.9282
  const atMatch = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 3. OpenStreetMap ?mlat=...&mlon=...
  const osmMatch = decoded.match(/[?&]mlat=(-?\d+\.\d+)&mlon=(-?\d+\.\d+)/i);
  if (osmMatch) {
    const lat = parseFloat(osmMatch[1]);
    const lng = parseFloat(osmMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 4. Query parameter q=, ll=, sll=, query=, coordinate=, destination=, daddr= (e.g. Google Maps, Apple Maps, Waze)
  // handles optional "loc:" prefix (WhatsApp): q=loc:11.5564,104.9282
  const paramMatch = decoded.match(/[?&](?:q|ll|sll|query|coordinate|destination|daddr)=(?:loc:)?(-?\d+\.\d+)(?:,|%2C|\+|\s+)(-?\d+\.\d+)/i);
  if (paramMatch) {
    const lat = parseFloat(paramMatch[1]);
    const lng = parseFloat(paramMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 5. Google Maps !3d<lat>!4d<lng>
  const dataMatch = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 6. /place/<lat>,<lng> or /place/<lat>+<lng>
  const placeMatch = decoded.match(/\/place\/(-?\d+\.\d+)(?:,|%2C|\+|\s+)(-?\d+\.\d+)/i);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 7. Generic coordinate pair in string: lat [-90, 90], lng [-180, 180]
  const genericMatch = decoded.match(/(-?\d{1,2}\.\d{3,16})[\s,;]+(-?\d{1,3}\.\d{3,16})/);
  if (genericMatch) {
    const v1 = parseFloat(genericMatch[1]);
    const v2 = parseFloat(genericMatch[2]);
    if (Math.abs(v1) <= 90 && Math.abs(v2) <= 180) {
      return { lat: Number(v1.toFixed(6)), lng: Number(v2.toFixed(6)) };
    }
  }

  return null;
}

/**
 * Check if the input is a short link from Google Maps (which doesn't contain raw coordinates)
 */
export function isShortMapUrl(input) {
  if (!input || typeof input !== 'string') return false;
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(input.trim());
}

/**
 * Extract purpose from visit object or parse from notes
 */
export function extractVisitPurpose(visit) {
  if (!visit) return '';
  if (visit.purpose && typeof visit.purpose === 'string' && visit.purpose.trim()) {
    return visit.purpose.trim();
  }
  const notes = visit.notes || '';
  if (typeof notes === 'string') {
    const match = notes.match(/\[គោលបំណង\]:\s*([^\n\r]*)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

/**
 * Extract farmer history from visit object or parse from notes
 */
export function extractFarmerHistory(visit) {
  if (!visit) return '';
  if (visit.farmer_history && typeof visit.farmer_history === 'string' && visit.farmer_history.trim()) {
    return visit.farmer_history.trim();
  }
  const notes = visit.notes || '';
  if (typeof notes === 'string') {
    const match = notes.match(/\[ប្រវត្តិប្រើប្រាស់\]:\s*([^\n\r]*)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

/**
 * Clean notes string to remove embedded metadata like [គោលបំណង]: ... and [ប្រវត្តិប្រើប្រាស់]: ...
 */
export function cleanNotesText(rawNotes) {
  if (!rawNotes || typeof rawNotes !== 'string') return '';
  return rawNotes
    .replace(/\[គោលបំណង\]:\s*[^\n\r]*(\r?\n)?/gi, '')
    .replace(/\[ប្រវត្តិប្រើប្រាស់\]:\s*[^\n\r]*(\r?\n)?/gi, '')
    .trim();
}




// Utility functions for Database Backup, SQL Dump, Disaster Recovery & Restore
// Strictly zero emojis used

/**
 * Fetch all records for a table from Supabase with batch pagination to bypass 1000 row limits
 */
export async function fetchAllRows(supabase, tableName, selectQuery = '*', orderCol = 'created_at', ascending = false) {
  let allRows = [];
  let from = 0;
  const step = 1000;

  while (true) {
    let query = supabase.from(tableName).select(selectQuery).range(from, from + step - 1);
    if (orderCol) {
      query = query.order(orderCol, { ascending });
    }

    const { data, error } = await query;
    if (error) {
      console.warn(`Error fetching batch for ${tableName}:`, error);
      break;
    }
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data);
    if (data.length < step) break;
    from += step;
  }

  return allRows;
}

/**
 * Fetch complete application data for full backup
 */
export async function fetchCompleteBackupData(supabase, fallbackStaff = []) {
  // 1. Fetch Customers
  let customers = [];
  try {
    customers = await fetchAllRows(supabase, 'customers', '*', 'name', true);
  } catch (err) {
    console.error('Failed to fetch customers for backup:', err);
  }

  // 2. Fetch Field Visits
  let fieldVisits = [];
  try {
    fieldVisits = await fetchAllRows(supabase, 'field_visits', '*', 'visit_date', false);
  } catch (err) {
    console.error('Failed to fetch field visits for backup:', err);
  }

  // 3. Fetch Staff
  let staff = [];
  try {
    staff = await fetchAllRows(supabase, 'staff', '*', 'name', true);
  } catch (err) {
    console.warn('Failed to fetch staff from Supabase, checking fallback:', err);
  }

  // Fallback to local staff if supabase staff is empty
  if (!staff || staff.length === 0) {
    try {
      const stored = localStorage.getItem('sremeas_local_staff');
      if (stored) {
        staff = JSON.parse(stored);
      } else if (Array.isArray(fallbackStaff) && fallbackStaff.length > 0) {
        staff = fallbackStaff;
      }
    } catch {}
  }

  return {
    customers,
    fieldVisits,
    staff,
    stats: {
      totalCustomers: customers.length,
      totalVisits: fieldVisits.length,
      totalStaff: staff.length
    }
  };
}

/**
 * Clean visit records before backup or restore by removing joined customer properties
 */
export function sanitizeVisitForDatabase(visit) {
  if (!visit) return null;
  const { customers: _c, ...clean } = visit;
  return clean;
}

/**
 * Trigger browser file download for text/json/sql/csv content
 */
export function downloadFile(content, fileName, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Format timestamp string for file names (YYYY-MM-DD_HHmm)
 */
export function getBackupTimestampString(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}_${h}${min}`;
}

/**
 * Export full database backup as JSON file and cache snapshot to localStorage
 */
export async function exportFullJsonBackup(supabase, currentUser, fallbackStaff = []) {
  const backupData = await fetchCompleteBackupData(supabase, fallbackStaff);

  const payload = {
    app: 'sremeas-field',
    appNameKh: 'ស្រែមាស - ចុះចំការ',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    exportedBy: {
      name: currentUser?.name || 'Admin',
      role: currentUser?.role || 'Admin',
      branch: currentUser?.branch || 'ការិយាល័យកណ្តាល'
    },
    stats: backupData.stats,
    data: {
      customers: backupData.customers,
      field_visits: backupData.fieldVisits.map(sanitizeVisitForDatabase),
      staff: backupData.staff
    }
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const timeStr = getBackupTimestampString();
  const fileName = `sremeas_backup_${timeStr}.json`;

  // Save to auto-backup cache
  try {
    localStorage.setItem('sremeas_auto_backup_latest', jsonStr);
    localStorage.setItem('sremeas_auto_backup_timestamp', new Date().toISOString());
  } catch (err) {
    console.warn('LocalStorage quota exceeded for auto-backup cache:', err);
  }

  downloadFile(jsonStr, fileName, 'application/json');

  return {
    success: true,
    fileName,
    stats: backupData.stats
  };
}

/**
 * Escape SQL text literals
 */
function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Generate full SQL disaster recovery script
 */
export async function exportSqlDisasterRecoveryScript(supabase, currentUser, fallbackStaff = []) {
  const backupData = await fetchCompleteBackupData(supabase, fallbackStaff);
  const timeStr = getBackupTimestampString();
  const exportedAt = new Date().toLocaleString('km-KH');

  let sql = `-- ==========================================================================\n`;
  sql += `-- ស្រែមាស - ចុះចំការ (Sremeas Field) - Database Disaster Recovery SQL Script\n`;
  sql += `-- កាលបរិច្ឆេទបង្កើត៖ ${exportedAt}\n`;
  sql += `-- បង្កើតដោយ៖ ${currentUser?.name || 'Admin'} (${currentUser?.role || 'Admin'})\n`;
  sql += `-- សរុប៖ អតិថិជន ${backupData.stats.totalCustomers} នាក់, កំណត់ត្រាចុះចំការ ${backupData.stats.totalVisits} ករណី, បុគ្គលិក ${backupData.stats.totalStaff} នាក់\n`;
  sql += `-- ==========================================================================\n\n`;

  // 1. DDL: Create Tables & Enable RLS
  sql += `-- 1. បង្កើតតារាងអតិថិជន (Customers Table)\n`;
  sql += `CREATE TABLE IF NOT EXISTS customers (\n`;
  sql += `  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n`;
  sql += `  name TEXT NOT NULL,\n`;
  sql += `  phone TEXT,\n`;
  sql += `  gender TEXT,\n`;
  sql += `  customer_type TEXT DEFAULT 'កសិករ',\n`;
  sql += `  village TEXT,\n`;
  sql += `  commune TEXT,\n`;
  sql += `  district TEXT,\n`;
  sql += `  province TEXT,\n`;
  sql += `  branch TEXT,\n`;
  sql += `  crops JSONB DEFAULT '[]'::jsonb,\n`;
  sql += `  branches JSONB DEFAULT '[]'::jsonb,\n`;
  sql += `  latitude DOUBLE PRECISION,\n`;
  sql += `  longitude DOUBLE PRECISION,\n`;
  sql += `  notes TEXT,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT NOW()\n`;
  sql += `);\n`;
  sql += `ALTER TABLE customers ENABLE ROW LEVEL SECURITY;\n`;
  sql += `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow all access to customers') THEN\n`;
  sql += `  CREATE POLICY "Allow all access to customers" ON customers FOR ALL USING (true) WITH CHECK (true);\n`;
  sql += `END IF; END $$;\n\n`;

  sql += `-- 2. បង្កើតតារាងបុគ្គលិក (Staff Table)\n`;
  sql += `CREATE TABLE IF NOT EXISTS staff (\n`;
  sql += `  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n`;
  sql += `  name TEXT NOT NULL,\n`;
  sql += `  gender TEXT DEFAULT 'ប្រុស',\n`;
  sql += `  phone TEXT,\n`;
  sql += `  dob DATE,\n`;
  sql += `  email TEXT,\n`;
  sql += `  role TEXT DEFAULT 'បុគ្គលិកទីផ្សារ',\n`;
  sql += `  branch TEXT DEFAULT 'ការិយាល័យកណ្តាល',\n`;
  sql += `  username TEXT UNIQUE NOT NULL,\n`;
  sql += `  password TEXT NOT NULL,\n`;
  sql += `  status TEXT DEFAULT 'សកម្ម',\n`;
  sql += `  permissions JSONB DEFAULT '{"can_manage_staff": false}'::jsonb,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT NOW()\n`;
  sql += `);\n`;
  sql += `ALTER TABLE staff ENABLE ROW LEVEL SECURITY;\n`;
  sql += `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff' AND policyname = 'Allow all access to staff') THEN\n`;
  sql += `  CREATE POLICY "Allow all access to staff" ON staff FOR ALL USING (true) WITH CHECK (true);\n`;
  sql += `END IF; END $$;\n\n`;

  sql += `-- 3. បង្កើតតារាងកំណត់ត្រាចុះចំការ (Field Visits Table)\n`;
  sql += `CREATE TABLE IF NOT EXISTS field_visits (\n`;
  sql += `  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n`;
  sql += `  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,\n`;
  sql += `  visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n`;
  sql += `  crop_type TEXT,\n`;
  sql += `  farm_size_ha DOUBLE PRECISION,\n`;
  sql += `  crop_status TEXT,\n`;
  sql += `  issues_identified TEXT,\n`;
  sql += `  products_recommended TEXT,\n`;
  sql += `  photos JSONB DEFAULT '[]'::jsonb,\n`;
  sql += `  location_address TEXT,\n`;
  sql += `  latitude DOUBLE PRECISION,\n`;
  sql += `  longitude DOUBLE PRECISION,\n`;
  sql += `  staff_name TEXT,\n`;
  sql += `  branch TEXT,\n`;
  sql += `  crops JSONB DEFAULT '[]'::jsonb,\n`;
  sql += `  team_members JSONB DEFAULT '[]'::jsonb,\n`;
  sql += `  farmer_history TEXT,\n`;
  sql += `  follow_up_date DATE,\n`;
  sql += `  notes TEXT,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT NOW()\n`;
  sql += `);\n`;
  sql += `ALTER TABLE field_visits ENABLE ROW LEVEL SECURITY;\n`;
  sql += `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'field_visits' AND policyname = 'Allow all access to field_visits') THEN\n`;
  sql += `  CREATE POLICY "Allow all access to field_visits" ON field_visits FOR ALL USING (true) WITH CHECK (true);\n`;
  sql += `END IF; END $$;\n\n`;

  // 2. Data Inserts: Customers
  if (backupData.customers.length > 0) {
    sql += `-- ==========================================================================\n`;
    sql += `-- 4. បញ្ចូលទិន្នន័យអតិថិជន (${backupData.customers.length} នាក់)\n`;
    sql += `-- ==========================================================================\n`;
    for (const c of backupData.customers) {
      sql += `INSERT INTO customers (id, name, phone, gender, customer_type, village, commune, district, province, branch, crops, latitude, longitude, notes, created_at)\n`;
      sql += `VALUES (${sqlEscape(c.id)}, ${sqlEscape(c.name)}, ${sqlEscape(c.phone)}, ${sqlEscape(c.gender)}, ${sqlEscape(c.customer_type)}, ${sqlEscape(c.village)}, ${sqlEscape(c.commune)}, ${sqlEscape(c.district)}, ${sqlEscape(c.province)}, ${sqlEscape(c.branch)}, ${sqlEscape(c.crops || [])}, ${sqlEscape(c.latitude)}, ${sqlEscape(c.longitude)}, ${sqlEscape(c.notes)}, ${sqlEscape(c.created_at || new Date().toISOString())})\n`;
      sql += `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, province = EXCLUDED.province, branch = EXCLUDED.branch, crops = EXCLUDED.crops;\n`;
    }
    sql += `\n`;
  }

  // 3. Data Inserts: Staff
  if (backupData.staff.length > 0) {
    sql += `-- ==========================================================================\n`;
    sql += `-- 5. បញ្ចូលទិន្នន័យបុគ្គលិក (${backupData.staff.length} នាក់)\n`;
    sql += `-- ==========================================================================\n`;
    for (const s of backupData.staff) {
      sql += `INSERT INTO staff (id, name, gender, phone, dob, email, role, branch, username, password, status, permissions, created_at)\n`;
      sql += `VALUES (${sqlEscape(s.id)}, ${sqlEscape(s.name)}, ${sqlEscape(s.gender)}, ${sqlEscape(s.phone)}, ${sqlEscape(s.dob)}, ${sqlEscape(s.email)}, ${sqlEscape(s.role)}, ${sqlEscape(s.branch)}, ${sqlEscape(s.username)}, ${sqlEscape(s.password)}, ${sqlEscape(s.status)}, ${sqlEscape(s.permissions || {})}, ${sqlEscape(s.created_at || new Date().toISOString())})\n`;
      sql += `ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, branch = EXCLUDED.branch, permissions = EXCLUDED.permissions;\n`;
    }
    sql += `\n`;
  }

  // 4. Data Inserts: Field Visits
  if (backupData.fieldVisits.length > 0) {
    sql += `-- ==========================================================================\n`;
    sql += `-- 6. បញ្ចូលទិន្នន័យកំណត់ត្រាចុះចំការ (${backupData.fieldVisits.length} ករណី)\n`;
    sql += `-- ==========================================================================\n`;
    for (const v of backupData.fieldVisits) {
      const clean = sanitizeVisitForDatabase(v);
      sql += `INSERT INTO field_visits (id, customer_id, visit_date, crop_type, farm_size_ha, crop_status, issues_identified, products_recommended, photos, location_address, latitude, longitude, staff_name, branch, crops, team_members, farmer_history, follow_up_date, notes, created_at)\n`;
      sql += `VALUES (${sqlEscape(clean.id)}, ${sqlEscape(clean.customer_id)}, ${sqlEscape(clean.visit_date)}, ${sqlEscape(clean.crop_type)}, ${sqlEscape(clean.farm_size_ha)}, ${sqlEscape(clean.crop_status)}, ${sqlEscape(clean.issues_identified)}, ${sqlEscape(clean.products_recommended)}, ${sqlEscape(clean.photos || [])}, ${sqlEscape(clean.location_address)}, ${sqlEscape(clean.latitude)}, ${sqlEscape(clean.longitude)}, ${sqlEscape(clean.staff_name)}, ${sqlEscape(clean.branch)}, ${sqlEscape(clean.crops || [])}, ${sqlEscape(clean.team_members || [])}, ${sqlEscape(clean.farmer_history)}, ${sqlEscape(clean.follow_up_date)}, ${sqlEscape(clean.notes)}, ${sqlEscape(clean.created_at || new Date().toISOString())})\n`;
      sql += `ON CONFLICT (id) DO UPDATE SET visit_date = EXCLUDED.visit_date, crop_status = EXCLUDED.crop_status, issues_identified = EXCLUDED.issues_identified, products_recommended = EXCLUDED.products_recommended;\n`;
    }
    sql += `\n`;
  }

  const fileName = `sremeas_database_dump_${timeStr}.sql`;
  downloadFile(sql, fileName, 'text/sql');

  return {
    success: true,
    fileName,
    stats: backupData.stats,
    sqlScript: sql
  };
}

/**
 * Export Customers and Visits as CSV for Microsoft Excel
 */
export async function exportCsvBackup(supabase, fallbackStaff = []) {
  const backupData = await fetchCompleteBackupData(supabase, fallbackStaff);
  const timeStr = getBackupTimestampString();

  // 1. Customers CSV
  const custHeaders = ['ID', 'ឈ្មោះអតិថិជន', 'លេខទូរស័ព្ទ', 'ភេទ', 'ប្រភេទ', 'ភូមិ', 'ឃុំ/សង្កាត់', 'ស្រុក/ខណ្ឌ', 'ខេត្ត/រាជធានី', 'សាខា', 'ដំណាំ', 'កត់សម្គាល់'];
  const custRows = backupData.customers.map(c => [
    `"${c.id || ''}"`,
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"${(c.phone || '').replace(/"/g, '""')}"`,
    `"${(c.gender || '').replace(/"/g, '""')}"`,
    `"${(c.customer_type || 'កសិករ').replace(/"/g, '""')}"`,
    `"${(c.village || '').replace(/"/g, '""')}"`,
    `"${(c.commune || '').replace(/"/g, '""')}"`,
    `"${(c.district || '').replace(/"/g, '""')}"`,
    `"${(c.province || '').replace(/"/g, '""')}"`,
    `"${(c.branch || '').replace(/"/g, '""')}"`,
    `"${(Array.isArray(c.crops) ? c.crops.map(cr => cr.crop_type || cr).join(', ') : '').replace(/"/g, '""')}"`,
    `"${(c.notes || '').replace(/"/g, '""')}"`
  ]);
  const custCsv = "\uFEFF" + [custHeaders.join(','), ...custRows.map(r => r.join(','))].join('\r\n');
  downloadFile(custCsv, `sremeas_customers_${timeStr}.csv`, 'text/csv;charset=utf-8;');

  // 2. Visits CSV
  const visitHeaders = ['ID', 'កាលបរិច្ឆេទ', 'អតិថិជន', 'ទូរស័ព្ទ', 'ដំណាំ', 'ទំហំដី (ហ.ត)', 'ស្ថានភាពទូទៅ', 'បញ្ហាប្រឈម', 'ដំណោះស្រាយ/ផលិតផល', 'ទីតាំង', 'បុគ្គលិកចុះ', 'ក្រុមការងារ', 'សាខា', 'រយៈទទឹង (Lat)', 'រយៈបណ្តោយ (Lng)'];
  const visitRows = backupData.fieldVisits.map(v => [
    `"${v.id || ''}"`,
    `"${v.visit_date || ''}"`,
    `"${(v.customers?.name || '').replace(/"/g, '""')}"`,
    `"${(v.customers?.phone || '').replace(/"/g, '""')}"`,
    `"${(v.crop_type || '').replace(/"/g, '""')}"`,
    v.farm_size_ha || '',
    `"${(v.crop_status || '').replace(/"/g, '""')}"`,
    `"${(v.issues_identified || '').replace(/"/g, '""')}"`,
    `"${(v.products_recommended || '').replace(/"/g, '""')}"`,
    `"${(v.location_address || '').replace(/"/g, '""')}"`,
    `"${(v.staff_name || '').replace(/"/g, '""')}"`,
    `"${(Array.isArray(v.team_members) ? v.team_members.join(', ') : '').replace(/"/g, '""')}"`,
    `"${(v.branch || '').replace(/"/g, '""')}"`,
    v.latitude || '',
    v.longitude || ''
  ]);
  const visitCsv = "\uFEFF" + [visitHeaders.join(','), ...visitRows.map(r => r.join(','))].join('\r\n');
  downloadFile(visitCsv, `sremeas_visits_${timeStr}.csv`, 'text/csv;charset=utf-8;');

  return {
    success: true,
    stats: backupData.stats
  };
}

/**
 * Validate an uploaded backup JSON file
 */
export function validateBackupJson(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);

    let customers = [];
    let fieldVisits = [];
    let staff = [];

    // Support both wrapped format { data: { customers, field_visits, staff } } and direct arrays
    if (parsed.data) {
      customers = Array.isArray(parsed.data.customers) ? parsed.data.customers : [];
      fieldVisits = Array.isArray(parsed.data.field_visits) ? parsed.data.field_visits : [];
      staff = Array.isArray(parsed.data.staff) ? parsed.data.staff : [];
    } else {
      customers = Array.isArray(parsed.customers) ? parsed.customers : [];
      fieldVisits = Array.isArray(parsed.field_visits) ? parsed.field_visits : [];
      staff = Array.isArray(parsed.staff) ? parsed.staff : [];
    }

    if (customers.length === 0 && fieldVisits.length === 0 && staff.length === 0) {
      return {
        isValid: false,
        error: 'ឯកសារនេះមិនមានទិន្នន័យអតិថិជន ឬកំណត់ត្រាចុះចំការឡើយ។ សូមពិនិត្យឯកសារម្តងទៀត។'
      };
    }

    return {
      isValid: true,
      appName: parsed.appNameKh || parsed.app || 'ស្រែមាស - ចុះចំការ',
      version: parsed.version || '1.0',
      exportedAt: parsed.exportedAt || null,
      exportedBy: parsed.exportedBy || null,
      stats: {
        totalCustomers: customers.length,
        totalVisits: fieldVisits.length,
        totalStaff: staff.length
      },
      data: {
        customers,
        fieldVisits: fieldVisits.map(sanitizeVisitForDatabase),
        staff
      }
    };
  } catch (err) {
    return {
      isValid: false,
      error: 'ឯកសារមិនមែនជាទម្រង់ JSON ត្រឹមត្រូវទេ (' + err.message + ')'
    };
  }
}

/**
 * Execute restore/import of backup data into Supabase
 */
export async function executeRestore(supabase, backupData, onProgress = () => {}) {
  const { customers, fieldVisits, staff } = backupData;
  const totalItems = customers.length + staff.length + fieldVisits.length;
  let processed = 0;
  const errors = [];

  const updateProgress = (phase, current, total) => {
    const percent = Math.min(100, Math.round((processed / (totalItems || 1)) * 100));
    onProgress({
      phase,
      current,
      total,
      overallPercent: percent
    });
  };

  // 1. Restore Customers first (Parent records for foreign key)
  let restoredCustomers = 0;
  if (customers && customers.length > 0) {
    updateProgress('កំពុងស្តារទិន្នន័យអតិថិជន (Customers)...', 0, customers.length);
    const chunkSize = 50;
    for (let i = 0; i < customers.length; i += chunkSize) {
      const chunk = customers.slice(i, i + chunkSize);
      const { error } = await supabase.from('customers').upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.error('Error restoring customers batch:', error);
        errors.push(`អតិថិជន (កញ្ចប់ ${i}-${i + chunk.length}): ${error.message}`);
      } else {
        restoredCustomers += chunk.length;
      }
      processed += chunk.length;
      updateProgress('កំពុងស្តារទិន្នន័យអតិថិជន...', restoredCustomers, customers.length);
    }
  }

  // 2. Restore Staff
  let restoredStaff = 0;
  if (staff && staff.length > 0) {
    updateProgress('កំពុងស្តារទិន្នន័យបុគ្គលិក (Staff)...', 0, staff.length);
    const chunkSize = 50;
    for (let i = 0; i < staff.length; i += chunkSize) {
      const chunk = staff.slice(i, i + chunkSize);
      try {
        const { error } = await supabase.from('staff').upsert(chunk, { onConflict: 'username' });
        if (error) {
          console.warn('Error restoring staff batch to Supabase:', error);
          errors.push(`បុគ្គលិក: ${error.message}`);
        } else {
          restoredStaff += chunk.length;
        }
      } catch (err) {
        errors.push(`បុគ្គលិក: ${err.message}`);
      }
      processed += chunk.length;
      updateProgress('កំពុងស្តារទិន្នន័យបុគ្គលិក...', restoredStaff, staff.length);
    }
  }

  // 3. Restore Field Visits
  let restoredVisits = 0;
  if (fieldVisits && fieldVisits.length > 0) {
    updateProgress('កំពុងស្តារកំណត់ត្រាចុះចំការ (Visits)...', 0, fieldVisits.length);
    const chunkSize = 50;
    for (let i = 0; i < fieldVisits.length; i += chunkSize) {
      const rawChunk = fieldVisits.slice(i, i + chunkSize);
      const sanitizedChunk = rawChunk.map(sanitizeVisitForDatabase);
      const { error } = await supabase.from('field_visits').upsert(sanitizedChunk, { onConflict: 'id' });
      if (error) {
        console.error('Error restoring visits batch:', error);
        errors.push(`កំណត់ត្រាចុះចំការ (កញ្ចប់ ${i}-${i + rawChunk.length}): ${error.message}`);
      } else {
        restoredVisits += rawChunk.length;
      }
      processed += rawChunk.length;
      updateProgress('កំពុងស្តារកំណត់ត្រាចុះចំការ...', restoredVisits, fieldVisits.length);
    }
  }

  return {
    success: errors.length === 0,
    hasPartialSuccess: restoredCustomers > 0 || restoredVisits > 0 || restoredStaff > 0,
    restoredCustomers,
    restoredVisits,
    restoredStaff,
    errors
  };
}

/**
 * Get cached auto-backup info from localStorage
 */
export function getAutoBackupInfo() {
  try {
    const raw = localStorage.getItem('sremeas_auto_backup_latest');
    const timestamp = localStorage.getItem('sremeas_auto_backup_timestamp');
    if (!raw) return { exists: false };

    const parsed = JSON.parse(raw);
    return {
      exists: true,
      timestamp: timestamp || parsed.exportedAt,
      stats: parsed.stats || {
        totalCustomers: parsed.data?.customers?.length || 0,
        totalVisits: parsed.data?.field_visits?.length || 0,
        totalStaff: parsed.data?.staff?.length || 0
      }
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Download cached auto-backup from localStorage
 */
export function downloadCachedAutoBackup() {
  const raw = localStorage.getItem('sremeas_auto_backup_latest');
  if (!raw) return false;
  const timeStr = getBackupTimestampString();
  downloadFile(raw, `sremeas_auto_cached_backup_${timeStr}.json`, 'application/json');
  return true;
}

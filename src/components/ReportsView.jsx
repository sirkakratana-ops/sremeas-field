import React, { useState, useMemo } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, Printer, Download, FileSpreadsheet, 
  Calendar, Filter, Users, ClipboardList, Layers, Activity, AlertTriangle, 
  CheckCircle2, UserCheck, Eye, Search, X, RotateCcw, Building, Sprout,
  Send, ExternalLink, ChevronDown, Award
} from 'lucide-react';
import { parseCrops, formatProvince, formatDateDMY, hasPermission, formatPhoneNumber } from '../staffUtils';
import { getTelegramSettings } from '../telegramUtils';

export default function ReportsView({ 
  visits = [], 
  customers = [], 
  staffList = [], 
  currentUser = null, 
  onSelectVisit 
}) {
  // Preset filter: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom'
  const [datePreset, setDatePreset] = useState('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  
  const [filterStaff, setFilterStaff] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterCrop, setFilterCrop] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterProvince, setFilterProvince] = useState('All');
  const [chartType, setChartType] = useState('area'); // 'area' | 'bar'
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  
  const [searchTable, setSearchTable] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 15;

  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);

  const canExport = hasPermission(currentUser, 'can_export_reports', true);

  // Helper: Format Date to YYYY-MM-DD in local time
  const formatYMD = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Compute Active Date Range
  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (datePreset === 'today') {
      const s = formatYMD(today);
      return { from: s, to: s, label: 'ថ្ងៃនេះ' };
    }
    if (datePreset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const s = formatYMD(y);
      return { from: s, to: s, label: 'ម្សិលមិញ' };
    }
    if (datePreset === 'last7') {
      const f = new Date(today);
      f.setDate(f.getDate() - 6);
      return { from: formatYMD(f), to: formatYMD(today), label: '៧ ថ្ងៃចុងក្រោយ' };
    }
    if (datePreset === 'thisMonth') {
      const f = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: formatYMD(f), to: formatYMD(today), label: `ខែនេះ (${padZero(today.getMonth() + 1)}/${today.getFullYear()})` };
    }
    if (datePreset === 'lastMonth') {
      const f = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const t = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: formatYMD(f), to: formatYMD(t), label: `ខែមុន (${padZero(f.getMonth() + 1)}/${f.getFullYear()})` };
    }
    if (datePreset === 'thisYear') {
      const f = new Date(today.getFullYear(), 0, 1);
      return { from: formatYMD(f), to: formatYMD(today), label: `ឆ្នាំ ${today.getFullYear()}` };
    }
    if (datePreset === 'custom') {
      return { 
        from: customFrom || '', 
        to: customTo || '', 
        label: customFrom || customTo ? `${customFrom || '—'} ដល់ ${customTo || '—'}` : 'កំណត់កាលបរិច្ឆេទ' 
      };
    }
    return { from: '', to: '', label: 'គ្រប់កាលបរិច្ឆេទ' };
  }, [datePreset, customFrom, customTo]);

  function padZero(n) {
    return String(n).padStart(2, '0');
  }

  // Filter options lists
  const availableBranches = useMemo(() => {
    const set = new Set();
    staffList.forEach(s => { if (s.branch) set.add(s.branch.trim()); });
    visits.forEach(v => { if (v.branch) set.add(v.branch.trim()); });
    return ['All', ...Array.from(set).sort((a,b) => a.localeCompare(b))];
  }, [staffList, visits]);

  const availableStaff = useMemo(() => {
    const set = new Set();
    if (currentUser?.name) set.add(currentUser.name.trim());
    staffList.forEach(s => { if (s.name) set.add(s.name.trim()); });
    visits.forEach(v => { if (v.staff_name) set.add(v.staff_name.trim()); });
    return ['All', ...Array.from(set).sort((a,b) => a.localeCompare(b))];
  }, [currentUser, staffList, visits]);

  const availableCrops = useMemo(() => {
    const set = new Set();
    visits.forEach(v => {
      const crops = parseCrops(v.crops, v.crop_type, v.farm_size_ha);
      crops.forEach(c => { if (c.crop_type) set.add(c.crop_type.trim()); });
    });
    return ['All', ...Array.from(set).sort((a,b) => a.localeCompare(b))];
  }, [visits]);

  const availableProvinces = useMemo(() => {
    const set = new Set();
    visits.forEach(v => {
      const p = formatProvince(v.customers?.province);
      if (p) set.add(p);
    });
    return ['All', ...Array.from(set).sort((a,b) => a.localeCompare(b))];
  }, [visits]);

  // Filter Visits
  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      // Date filter
      if (dateRange.from || dateRange.to) {
        let vDateStr = '';
        if (v.visit_date) {
          try {
            const d = new Date(v.visit_date);
            if (!isNaN(d.getTime())) vDateStr = formatYMD(d);
          } catch {}
          if (!vDateStr && typeof v.visit_date === 'string') {
            vDateStr = v.visit_date.slice(0, 10);
          }
        }
        if (dateRange.from && vDateStr && vDateStr < dateRange.from) return false;
        if (dateRange.to && vDateStr && vDateStr > dateRange.to) return false;
        if (!vDateStr && (dateRange.from || dateRange.to)) return false;
      }

      // Staff filter
      if (filterStaff !== 'All') {
        const staffMatch = (v.staff_name || '').trim().toLowerCase() === filterStaff.trim().toLowerCase();
        const teamMatch = Array.isArray(v.team_members) && v.team_members.some(m => (m || '').trim().toLowerCase() === filterStaff.trim().toLowerCase());
        if (!staffMatch && !teamMatch) return false;
      }

      // Branch filter
      if (filterBranch !== 'All') {
        const b = (v.branch || '').trim().toLowerCase();
        if (b !== filterBranch.trim().toLowerCase()) return false;
      }

      // Status filter
      if (filterStatus !== 'All') {
        if (v.crop_status !== filterStatus) return false;
      }

      // Crop filter
      if (filterCrop !== 'All') {
        const crops = parseCrops(v.crops, v.crop_type, v.farm_size_ha);
        const match = crops.some(c => c.crop_type === filterCrop) || v.crop_type === filterCrop;
        if (!match) return false;
      }

      // Province filter
      if (filterProvince !== 'All') {
        const p = formatProvince(v.customers?.province);
        if (p !== filterProvince) return false;
      }

      return true;
    });
  }, [visits, dateRange, filterStaff, filterBranch, filterCrop, filterStatus, filterProvince]);

  // Aggregate Key Metrics (KPIs)
  const stats = useMemo(() => {
    const totalVisits = filteredVisits.length;
    const uniqueCustomerIds = new Set();
    let totalHectares = 0;
    let issuesCount = 0;
    const staffSet = new Set();

    filteredVisits.forEach(v => {
      if (v.customer_id) uniqueCustomerIds.add(v.customer_id);
      else if (v.customers?.name) uniqueCustomerIds.add(v.customers.name);

      if (v.staff_name) staffSet.add(v.staff_name.trim());
      if (Array.isArray(v.team_members)) {
        v.team_members.forEach(m => { if (m) staffSet.add(m.trim()); });
      }

      if (v.crop_status === 'មានបញ្ហា/ជំងឺ') {
        issuesCount++;
      }

      const crops = parseCrops(v.crops, v.crop_type, v.farm_size_ha);
      crops.forEach(c => {
        const ha = parseFloat(c.farm_size_ha);
        if (!isNaN(ha) && ha > 0) totalHectares += ha;
      });
    });

    // Approximate days in range
    let dayCount = 1;
    if (dateRange.from && dateRange.to) {
      const d1 = new Date(dateRange.from);
      const d2 = new Date(dateRange.to);
      const diffDays = Math.round(Math.abs((d2 - d1) / (24 * 60 * 60 * 1000))) + 1;
      dayCount = Math.max(1, diffDays);
    } else {
      dayCount = Math.max(1, new Set(filteredVisits.map(v => (v.visit_date || '').slice(0, 10)).filter(Boolean)).size);
    }

    const avgVisitsPerDay = totalVisits > 0 ? (totalVisits / dayCount).toFixed(1) : '0';
    const issuesRate = totalVisits > 0 ? Math.round((issuesCount / totalVisits) * 100) : 0;

    return {
      totalVisits,
      uniqueFarmers: uniqueCustomerIds.size,
      totalHectares: Math.round(totalHectares * 10) / 10,
      issuesCount,
      issuesRate,
      activeStaffCount: staffSet.size,
      avgVisitsPerDay
    };
  }, [filteredVisits, dateRange]);

  // Chart 1: Time Trend Data (Grouped by Date or Month)
  const timeTrendData = useMemo(() => {
    const countsMap = new Map();

    filteredVisits.forEach(v => {
      let key = '';
      if (v.visit_date) {
        try {
          const d = new Date(v.visit_date);
          if (!isNaN(d.getTime())) {
            const pad = n => String(n).padStart(2, '0');
            key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          }
        } catch {}
        if (!key && typeof v.visit_date === 'string') {
          key = v.visit_date.slice(0, 10);
        }
      }
      if (key) {
        countsMap.set(key, (countsMap.get(key) || 0) + 1);
      }
    });

    const sortedKeys = Array.from(countsMap.keys()).sort();
    
    // Format for display
    return sortedKeys.map(k => {
      const parts = k.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : k;
      return {
        key: k,
        label,
        count: countsMap.get(k)
      };
    });
  }, [filteredVisits]);

  // Chart 2: Crops Distribution
  const cropDistributionData = useMemo(() => {
    const counts = {};
    filteredVisits.forEach(v => {
      const crops = parseCrops(v.crops, v.crop_type, v.farm_size_ha);
      if (crops.length > 0) {
        crops.forEach(c => {
          const name = c.crop_type || 'ផ្សេងៗ';
          counts[name] = (counts[name] || 0) + 1;
        });
      } else {
        const name = v.crop_type || 'មិនបញ្ជាក់';
        counts[name] = (counts[name] || 0) + 1;
      }
    });

    const colors = [
      '#059669', // Emerald
      '#d97706', // Amber
      '#0284c7', // Sky
      '#4f46e5', // Indigo
      '#e11d48', // Rose
      '#7c3aed', // Purple
      '#0d9488', // Teal
      '#ea580c', // Orange
      '#64748b'  // Slate
    ];

    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const totalCrops = sorted.reduce((sum, item) => sum + item.count, 0) || 1;

    return sorted.map((item, idx) => ({
      ...item,
      color: colors[idx % colors.length],
      percentage: Math.round((item.count / totalCrops) * 100)
    }));
  }, [filteredVisits]);

  // Chart 3: Crop Health Status Distribution
  const statusDistribution = useMemo(() => {
    let good = 0;
    let moderate = 0;
    let issues = 0;

    filteredVisits.forEach(v => {
      if (v.crop_status === 'ល្អ') good++;
      else if (v.crop_status === 'មធ្យម') moderate++;
      else if (v.crop_status === 'មានបញ្ហា/ជំងឺ') issues++;
      else good++;
    });

    const total = filteredVisits.length || 1;
    return [
      { label: 'ល្អ', count: good, color: '#10b981', percentage: Math.round((good / total) * 100) },
      { label: 'មធ្យម', count: moderate, color: '#f59e0b', percentage: Math.round((moderate / total) * 100) },
      { label: 'មានបញ្ហា/ជំងឺ', count: issues, color: '#f43f5e', percentage: Math.round((issues / total) * 100) }
    ];
  }, [filteredVisits]);

  // Chart 4: Top Performing Staff
  const topStaffData = useMemo(() => {
    const counts = {};
    const farmerSets = {};

    filteredVisits.forEach(v => {
      const st = (v.staff_name || 'Admin').trim();
      counts[st] = (counts[st] || 0) + 1;
      if (!farmerSets[st]) farmerSets[st] = new Set();
      if (v.customer_id) farmerSets[st].add(v.customer_id);
      else if (v.customers?.name) farmerSets[st].add(v.customers.name);
    });

    const maxVisits = Math.max(...Object.values(counts), 1);
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        uniqueFarms: farmerSets[name]?.size || count,
        percentage: Math.round((count / maxVisits) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return sorted;
  }, [filteredVisits]);

  // Chart 5: Province Distribution
  const provinceData = useMemo(() => {
    const counts = {};
    filteredVisits.forEach(v => {
      const p = formatProvince(v.customers?.province) || 'មិនបញ្ជាក់';
      counts[p] = (counts[p] || 0) + 1;
    });

    const maxVisits = Math.max(...Object.values(counts), 1);
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / maxVisits) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return sorted;
  }, [filteredVisits]);

  // Top Issues Encountered
  const topIssuesList = useMemo(() => {
    const counts = {};
    filteredVisits.forEach(v => {
      if (v.issues_identified && v.issues_identified.trim()) {
        const text = v.issues_identified.trim();
        const parts = text.split(/[,;\n•]+/).map(s => s.trim()).filter(Boolean);
        parts.forEach(p => {
          if (p.length > 2 && p.length < 40) {
            counts[p] = (counts[p] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(counts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredVisits]);

  // Paginated Visits Table Data
  const tableData = useMemo(() => {
    let list = filteredVisits;
    if (searchTable.trim()) {
      const q = searchTable.toLowerCase().trim();
      list = list.filter(v => 
        (v.customers?.name || '').toLowerCase().includes(q) ||
        (v.customers?.phone || '').toLowerCase().includes(q) ||
        (v.staff_name || '').toLowerCase().includes(q) ||
        (v.location_address || '').toLowerCase().includes(q) ||
        (v.issues_identified || '').toLowerCase().includes(q)
      );
    }
    const totalPages = Math.ceil(list.length / pageSize) || 1;
    const start = (tablePage - 1) * pageSize;
    return {
      rows: list.slice(start, start + pageSize),
      totalCount: list.length,
      totalPages
    };
  }, [filteredVisits, searchTable, tablePage, pageSize]);

  // Action: Export CSV with UTF-8 BOM for Khmer Excel
  const handleExportCSV = () => {
    if (filteredVisits.length === 0) {
      alert("មិនមានទិន្នន័យសម្រាប់ទាញយកទេ!");
      return;
    }

    const headers = [
      "កាលបរិច្ឆេទ",
      "ឈ្មោះម្ចាស់ចំការ",
      "លេខទូរស័ព្ទ",
      "ប្រភេទអតិថិជន",
      "ដំណាំពិនិត្យ",
      "ពូជ",
      "ទំហំដី(ហិកតា)",
      "ស្ថានភាពដំណាំ",
      "បញ្ហាប្រឈម",
      "ផលិតផលណែនាំ",
      "ប្រវត្តិប្រើប្រាស់",
      "អាសយដ្ឋាន/ទីតាំង",
      "ខេត្ត",
      "បុគ្គលិកចុះផ្ទាល់",
      "ក្រុមការងាររួមដំណើរ",
      "សាខា",
      "Latitude",
      "Longitude",
      "Google Maps Link"
    ];

    const rows = filteredVisits.map(v => {
      const crops = parseCrops(v.crops, v.crop_type, v.farm_size_ha);
      const cropTypesStr = crops.map(c => c.crop_type).filter(Boolean).join(', ') || v.crop_type || '';
      const varietiesStr = crops.map(c => c.variety).filter(Boolean).join(', ') || '';
      const farmSizeStr = crops.map(c => c.farm_size_ha).filter(Boolean).join(', ') || v.farm_size_ha || '';
      const teamStr = Array.isArray(v.team_members) ? v.team_members.join(', ') : (v.team_members || '');
      const mapsUrl = (v.latitude && v.longitude) ? `https://www.google.com/maps?q=${v.latitude},${v.longitude}` : '';

      return [
        formatDateDMY(v.visit_date) || '',
        `"${(v.customers?.name || '').replace(/"/g, '""')}"`,
        `"${(formatPhoneNumber(v.customers?.phone) || '').replace(/"/g, '""')}"`,
        `"${(v.customers?.customer_type || 'កសិករ').replace(/"/g, '""')}"`,
        `"${cropTypesStr.replace(/"/g, '""')}"`,
        `"${varietiesStr.replace(/"/g, '""')}"`,
        `"${farmSizeStr.replace(/"/g, '""')}"`,
        `"${(v.crop_status || '').replace(/"/g, '""')}"`,
        `"${(v.issues_identified || '').replace(/"/g, '""')}"`,
        `"${(v.products_recommended || '').replace(/"/g, '""')}"`,
        `"${(v.farmer_history || '').replace(/"/g, '""')}"`,
        `"${(v.location_address || '').replace(/"/g, '""')}"`,
        `"${formatProvince(v.customers?.province).replace(/"/g, '""')}"`,
        `"${(v.staff_name || '').replace(/"/g, '""')}"`,
        `"${teamStr.replace(/"/g, '""')}"`,
        `"${(v.branch || '').replace(/"/g, '""')}"`,
        v.latitude || '',
        v.longitude || '',
        `"${mapsUrl}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `របាយការណ៍ចុះចំការ_ស្រែមាស_${dateRange.label.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Action: Print Report
  const handlePrint = () => {
    window.print();
  };

  // Action: Send Summary Report to Telegram Group
  const handleSendTelegramSummary = async () => {
    const config = getTelegramSettings();
    if (!config?.botToken || !config?.chatId) {
      alert("សូមកំណត់ Telegram Bot Token និង Chat ID ជាមុនសិន!");
      return;
    }

    setIsSendingTelegram(true);
    setTelegramStatus(null);

    const cropsSummary = cropDistributionData.slice(0, 4).map(c => `• ${c.name}: ${c.count} លើក (${c.percentage}%)`).join('\n');
    const topStaffSummary = topStaffData.slice(0, 4).map((s, idx) => `${idx + 1}. ${s.name}: ${s.count} លើក`).join('\n');
    const issuesSummary = topIssuesList.length > 0 ? topIssuesList.map(i => `• ${i.issue}: ${i.count} ករណី`).join('\n') : 'មិនមានបញ្ហាធ្ងន់ធ្ងរ';

    const text = `របាយការណ៍សង្ខេបការចុះចំការ
=============================
កាលបរិច្ឆេទ: ${dateRange.label}
អ្នកទាញរបាយការណ៍: ${currentUser?.name || 'Admin ប្រព័ន្ធ'}
សាខា/តំបន់: ${filterBranch === 'All' ? 'គ្រប់សាខា' : filterBranch}
----------------------------------------
ស្ថិតិគន្លឹះ (KPIs):
- សរុបការចុះចំការ: ${stats.totalVisits} លើក
- កសិករបានជួប: ${stats.uniqueFarmers} នាក់
- ផ្ទៃដីសរុប: ${stats.totalHectares} ហិកតា
- ចំការមានបញ្ហា: ${stats.issuesCount} ករណី (${stats.issuesRate}%)
- បុគ្គលិកសកម្ម: ${stats.activeStaffCount} នាក់
----------------------------------------
ប្រភេទដំណាំសំខាន់ៗ:
${cropsSummary || '—'}
----------------------------------------
បញ្ហាប្រឈមជួបប្រទះច្រើន:
${issuesSummary}
----------------------------------------
បុគ្គលិកចុះច្រើនជាងគេ:
${topStaffSummary || '—'}
=============================
សូមថ្នាក់ដឹកនាំពិនិត្យ និងផ្តល់យោបល់`;

    try {
      const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: text
        })
      });
      const data = await res.json();
      if (data.ok) {
        setTelegramStatus('success');
      } else {
        setTelegramStatus('error');
      }
    } catch {
      setTelegramStatus('error');
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const handleResetFilters = () => {
    setDatePreset('thisMonth');
    setCustomFrom('');
    setCustomTo('');
    setFilterStaff('All');
    setFilterBranch('All');
    setFilterCrop('All');
    setFilterStatus('All');
    setFilterProvince('All');
    setSearchTable('');
    setTablePage(1);
  };

  const hasActiveFilters = Boolean(
    datePreset !== 'thisMonth' || 
    filterStaff !== 'All' || 
    filterBranch !== 'All' || 
    filterCrop !== 'All' || 
    filterStatus !== 'All' || 
    filterProvince !== 'All' ||
    searchTable
  );

  return (
    <div className="space-y-4 print:space-y-3">

      {/* ======================= TOP ACTION TOOLBAR ======================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-emerald-600" />
            <span>Generate របាយការណ៍ & ក្រាហ្វិកស្ថិតិ</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            វិភាគទិន្នន័យចុះចំការ ក្រាហ្វិកសូចនាករ និងទាញយករបាយការណ៍ជា PDF / Excel
          </p>
        </div>

        {/* Action Buttons: Print, Excel, Telegram */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {canExport && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="បោះពុម្ព ឬរក្សាទុកជា PDF"
              >
                <Printer size={14} />
                <span>បោះពុម្ព / PDF</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="ទាញយកទិន្នន័យជាឯកសារ Excel / CSV"
              >
                <FileSpreadsheet size={14} />
                <span>ទាញយក Excel</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleSendTelegramSummary}
            disabled={isSendingTelegram}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="ផ្ញើរបាយការណ៍សង្ខេបទៅកាន់ Telegram Group"
          >
            <Send size={14} />
            <span>{isSendingTelegram ? 'កំពុងផ្ញើ...' : 'ផ្ញើទៅ Telegram'}</span>
          </button>
        </div>
      </div>

      {/* Telegram Feedback Banner */}
      {telegramStatus && (
        <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between animate-fadeIn print:hidden ${
          telegramStatus === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-1.5">
            {telegramStatus === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            <span>
              {telegramStatus === 'success' ? 'បានផ្ញើរបាយការណ៍សង្ខេបចូល Telegram Group ជោគជ័យ!' : 'ការផ្ញើទៅកាន់ Telegram បានបរាជ័យ សូមពិនិត្យ Bot Token / Chat ID!'}
            </span>
          </div>
          <button type="button" onClick={() => setTelegramStatus(null)} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ======================= FILTER SECTION ======================= */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5 print:hidden">
        
        {/* Preset Date Range Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 shrink-0">
              <Calendar size={13} className="text-emerald-600" />
              <span>កាលបរិច្ឆេទ:</span>
            </span>

            {[
              { id: 'today', label: 'ថ្ងៃនេះ' },
              { id: 'yesterday', label: 'ម្សិលមិញ' },
              { id: 'last7', label: '៧ ថ្ងៃចុងក្រោយ' },
              { id: 'thisMonth', label: 'ខែនេះ' },
              { id: 'lastMonth', label: 'ខែមុន' },
              { id: 'thisYear', label: 'ឆ្នាំនេះ' },
              { id: 'all', label: 'ទាំងអស់' },
              { id: 'custom', label: 'កំណត់ថ្ងៃ' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  datePreset === p.id 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Current Active Period Badge */}
          <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
            {dateRange.label} ({filteredVisits.length} កំណត់ត្រា)
          </div>
        </div>

        {/* Custom Date Pickers (if 'custom' selected) */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-600">ចន្លោះកាលបរិច្ឆេទ:</span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500">ចាប់ពី:</span>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500">ដល់ថ្ងៃ:</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium"
              />
            </div>
          </div>
        )}

        {/* Secondary Filter Dropdowns: Staff, Branch, Crop, Status, Province */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Staff Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <UserCheck size={12} className="text-slate-400 shrink-0" />
              <select
                value={filterStaff}
                onChange={e => setFilterStaff(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none"
              >
                <option value="All">គ្រប់បុគ្គលិក</option>
                {availableStaff.filter(s => s !== 'All').map((st, i) => (
                  <option key={i} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <Building size={12} className="text-slate-400 shrink-0" />
              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none"
              >
                <option value="All">គ្រប់សាខា</option>
                {availableBranches.filter(b => b !== 'All').map((br, i) => (
                  <option key={i} value={br}>{br}</option>
                ))}
              </select>
            </div>

            {/* Crop Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <Sprout size={12} className="text-slate-400 shrink-0" />
              <select
                value={filterCrop}
                onChange={e => setFilterCrop(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none"
              >
                <option value="All">គ្រប់ដំណាំ</option>
                {availableCrops.filter(c => c !== 'All').map((cr, i) => (
                  <option key={i} value={cr}>{cr}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់ស្ថានភាពដំណាំ</option>
              <option value="ល្អ">ល្អ</option>
              <option value="មធ្យម">មធ្យម</option>
              <option value="មានបញ្ហា/ជំងឺ">មានបញ្ហា/ជំងឺ</option>
            </select>

            {/* Province Filter */}
            <select
              value={filterProvince}
              onChange={e => setFilterProvince(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold"
            >
              <option value="All">គ្រប់ខេត្ត ({availableProvinces.length - 1})</option>
              {availableProvinces.filter(p => p !== 'All').map((pr, i) => (
                <option key={i} value={pr}>{pr}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors font-medium border border-rose-200"
            >
              <RotateCcw size={12} />
              <span>សម្អាតតម្រង</span>
            </button>
          )}

        </div>
      </div>

      {/* ======================= PRINT HEADER (Visible only when Printing) ======================= */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
              <Sprout size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">ក្រុមហ៊ុន ស្រែមាស - របាយការណ៍ចុះចំការ និងស្ថិតិទីផ្សារ</h1>
              <p className="text-xs text-slate-600">Sremeas Field Marketing & Crop Health Intelligence Report</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-slate-800">កាលបរិច្ឆេទរបាយការណ៍: {dateRange.label}</p>
            <p className="text-slate-500">កាលបរិច្ឆេទទាញទិន្នន័យ: {formatDateDMY(new Date())}</p>
            <p className="text-slate-500">អ្នករៀបចំ: {currentUser?.name || 'Admin'}</p>
          </div>
        </div>
      </div>

      {/* ======================= EXECUTIVE KPI STAT CARDS ======================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        
        {/* Metric 1: Total Visits */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-600">សរុបការចុះចំការ</span>
            <ClipboardList size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900">{stats.totalVisits.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">លើក ក្នុងកំឡុងពេលនេះ</div>
          </div>
        </div>

        {/* Metric 2: Unique Farmers Reached */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-600">កសិករបានជួប</span>
            <Users size={16} className="text-sky-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900">{stats.uniqueFarmers.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">នាក់ (អតិថិជនជាក់ស្តែង)</div>
          </div>
        </div>

        {/* Metric 3: Total Farm Area (Hectares) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-600">ផ្ទៃដីបានពិនិត្យ</span>
            <Layers size={16} className="text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900">{stats.totalHectares.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">ហិកតា (Farm Area)</div>
          </div>
        </div>

        {/* Metric 4: Farms with Issues */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-600">ចំការមានបញ្ហា</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-rose-700">{stats.issuesCount.toLocaleString()}</div>
            <div className="text-[10px] text-rose-600 font-bold mt-0.5">{stats.issuesRate}% នៃចំការសរុប</div>
          </div>
        </div>

        {/* Metric 5: Active Staff Members */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-600">បុគ្គលិកចុះផ្ទាល់</span>
            <UserCheck size={16} className="text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900">{stats.activeStaffCount}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">នាក់ បានចុះបំពេញការងារ</div>
          </div>
        </div>

        {/* Metric 6: Average Visits per Day */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-600">មធ្យមភាគប្រចាំថ្ងៃ</span>
            <Activity size={16} className="text-teal-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900">{stats.avgVisitsPerDay}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">លើក / ថ្ងៃ (Average)</div>
          </div>
        </div>

      </div>

      {/* ======================= GRAPHIC CHARTS ROW 1: TIME TREND & CROP DONUT ======================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* CHART 1: VISITS OVER TIME (Area / Bar Chart) */}
        <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-xs md:text-sm text-slate-900 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-emerald-600" />
                <span>ក្រាហ្វិកនិន្នាការចុះចំការតាមពេលវេលា (Visits Trend)</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">ចំនួនការចុះចំការសរុបតាមថ្ងៃក្នុងកំឡុងពេលនេះ</p>
            </div>

            {/* Toggle Area vs Bar view */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 print:hidden text-xs">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  chartType === 'area' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Area/Line
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  chartType === 'bar' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bar Chart
              </button>
            </div>
          </div>

          {/* SVG Chart Canvas */}
          <div className="pt-4 pb-2">
            {timeTrendData.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                មិនមានទិន្នន័យចុះចំការក្នុងកំឡុងពេលនេះទេ
              </div>
            ) : (
              <TimeTrendSvgChart 
                data={timeTrendData} 
                chartType={chartType} 
                hoveredBar={hoveredBar} 
                setHoveredBar={setHoveredBar} 
              />
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            <span>សរុប {timeTrendData.length} ថ្ងៃមានការចុះចំការ</span>
            <span>ចំណុចខ្ពស់បំផុត៖ {Math.max(...timeTrendData.map(d => d.count), 0)} លើក/ថ្ងៃ</span>
          </div>
        </div>

        {/* CHART 2: CROPS DISTRIBUTION (Donut Chart) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-xs md:text-sm text-slate-900 flex items-center gap-1.5">
              <PieChart size={16} className="text-amber-600" />
              <span>បែងចែកតាមប្រភេទដំណាំ (Crop Share)</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">សមាមាត្រដំណាំដែលបានចុះពិនិត្យ</p>
          </div>

          {/* Donut SVG & Legend */}
          <div className="py-2 flex flex-col sm:flex-row lg:flex-col items-center justify-around gap-4">
            
            {/* SVG Donut Circle */}
            <div className="relative w-40 h-40 shrink-0">
              <CropDonutSvgChart 
                data={cropDistributionData} 
                total={stats.totalVisits} 
                hoveredSlice={hoveredSlice} 
                setHoveredSlice={setHoveredSlice} 
              />
            </div>

            {/* Legend List */}
            <div className="w-full space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {cropDistributionData.slice(0, 6).map((item, idx) => (
                <div 
                  key={idx}
                  onMouseEnter={() => setHoveredSlice(item)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors cursor-pointer ${
                    hoveredSlice?.name === item.name ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-slate-800">{item.name}</span>
                  </div>
                  <div className="text-right shrink-0 font-bold text-slate-700">
                    <span>{item.count} លើក</span>
                    <span className="text-[10px] text-slate-400 ml-1">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>

          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex justify-between">
            <span>សរុប {cropDistributionData.length} ប្រភេទដំណាំ</span>
            <span>ដំណាំនាំមុខ៖ {cropDistributionData[0]?.name || '—'}</span>
          </div>
        </div>

      </div>

      {/* ======================= GRAPHIC CHARTS ROW 2: HEALTH, LEADERBOARD, PROVINCE ======================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* CHART 3: CROP HEALTH & KEY ISSUES */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-xs md:text-sm text-slate-900 flex items-center gap-1.5">
              <Activity size={16} className="text-teal-600" />
              <span>ស្ថានភាពសុខភាពដំណាំ (Crop Health)</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">អត្រាចំការល្អ មធ្យម និងមានបញ្ហា</p>
          </div>

          {/* Health Gauge Bars */}
          <div className="space-y-3 py-3">
            {statusDistribution.map((st, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">{st.label}</span>
                  <span style={{ color: st.color }}>{st.count} លើក ({st.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700" 
                    style={{ width: `${st.percentage}%`, backgroundColor: st.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Top Identified Issues */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              បញ្ហាប្រឈមជួបញឹកញាប់
            </span>
            {topIssuesList.length > 0 ? (
              topIssuesList.map((issue, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-slate-700">
                  <span className="truncate">• {issue.issue}</span>
                  <span className="font-bold text-rose-600 shrink-0 text-[11px]">{issue.count} ករណី</span>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-slate-400">មិនទាន់មានទិន្នន័យបញ្ហាជាក់លាក់</div>
            )}
          </div>
        </div>

        {/* CHART 4: TOP PERFORMING STAFF LEADERBOARD */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-xs md:text-sm text-slate-900 flex items-center gap-1.5">
              <Award size={16} className="text-amber-500" />
              <span>ចំណាត់ថ្នាក់បុគ្គលិកចុះចំការ (Staff Ranking)</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">បុគ្គលិកចុះចំការសកម្មជាងគេ</p>
          </div>

          {/* Staff Progress Bars */}
          <div className="space-y-2.5 py-2">
            {topStaffData.length > 0 ? (
              topStaffData.map((staff, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
                      <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-800' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate">{staff.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-emerald-800">{staff.count} លើក</span>
                      <span className="text-[10px] text-slate-400 ml-1">({staff.uniqueFarms} ចំការ)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-emerald-600' : 'bg-sky-600'
                      }`}
                      style={{ width: `${staff.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                មិនទាន់មានទិន្នន័យបុគ្គលិក
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex justify-between">
            <span>សរុប {stats.activeStaffCount} នាក់បានចុះ</span>
            <span>នាំមុខ៖ {topStaffData[0]?.name || '—'}</span>
          </div>
        </div>

        {/* CHART 5: GEOGRAPHICAL PROVINCE DISTRIBUTION */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-xs md:text-sm text-slate-900 flex items-center gap-1.5">
              <Building size={16} className="text-indigo-600" />
              <span>ការបែងចែកតាមបណ្តាខេត្ត (Provinces)</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">សកម្មភាពចុះចំការតាមតំបន់ភូមិសាស្ត្រ</p>
          </div>

          {/* Province Progress Bars */}
          <div className="space-y-2 py-2">
            {provinceData.length > 0 ? (
              provinceData.map((prov, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-800 truncate">{prov.name}</span>
                    <span className="text-indigo-800 shrink-0">{prov.count} លើក</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                      style={{ width: `${prov.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                មិនទាន់មានទិន្នន័យខេត្ត
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex justify-between">
            <span>សរុប {provinceData.length} ខេត្ត</span>
            <span>សកម្មបំផុត៖ {provinceData[0]?.name || '—'}</span>
          </div>
        </div>

      </div>

      {/* ======================= DETAILED VISITS TABLE ======================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        
        {/* Table Header & Search */}
        <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 print:hidden">
          <div>
            <h3 className="font-bold text-xs md:text-sm text-slate-900">
              តារាងកំណត់ត្រាចុះចំការលម្អិត ({tableData.totalCount} ករណី)
            </h3>
            <p className="text-[11px] text-slate-500">ទិន្នន័យជាក់ស្តែងត្រូវនឹងលក្ខខណ្ឌតម្រងដែលបានកំណត់</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកក្នុងតារាង..."
              value={searchTable}
              onChange={e => {
                setSearchTable(e.target.value);
                setTablePage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">កាលបរិច្ឆេទ</th>
                <th className="py-2.5 px-3 whitespace-nowrap">ម្ចាស់ចំការ</th>
                <th className="py-2.5 px-3 whitespace-nowrap">ដំណាំ / ទំហំដី</th>
                <th className="py-2.5 px-3 whitespace-nowrap">ស្ថានភាព</th>
                <th className="py-2.5 px-3 whitespace-nowrap">បញ្ហាប្រឈម</th>
                <th className="py-2.5 px-3 whitespace-nowrap">បុគ្គលិក</th>
                <th className="py-2.5 px-3 whitespace-nowrap">ទីតាំង</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center print:hidden">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    មិនមានទិន្នន័យត្រូវនឹងការស្វែងរកឡើយ
                  </td>
                </tr>
              ) : (
                tableData.rows.map(v => {
                  const crops = parseCrops(v.crops, v.crop_type, v.farm_size_ha);
                  const cropTitle = crops.map(c => `${c.crop_type}${c.variety ? ` (${c.variety})` : ''}`).filter(Boolean).join(', ') || v.crop_type || '—';
                  const totalHa = crops.reduce((sum, c) => sum + (parseFloat(c.farm_size_ha) || 0), 0);
                  const prov = formatProvince(v.customers?.province);
                  const addr = [v.location_address, prov].filter(Boolean).join(', ') || '—';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-600">
                        {formatDateDMY(v.visit_date)}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{v.customers?.name || '—'}</div>
                        {v.customers?.phone && <div className="text-[10px] text-slate-500 font-mono">{formatPhoneNumber(v.customers.phone)}</div>}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-800">{cropTitle}</div>
                        {totalHa > 0 && <div className="text-[10px] text-emerald-700 font-bold">{totalHa} ហិកតា</div>}
                      </td>
                      <td className="py-2 px-3 min-w-[150px] max-w-[220px]">
                        {v.crop_status ? (
                          <div className="text-xs text-slate-700 line-clamp-2 leading-relaxed" title={v.crop_status}>
                            {v.crop_status}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 max-w-[180px] truncate text-slate-600" title={v.issues_identified || 'គ្មាន'}>
                        {v.issues_identified || '—'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{v.staff_name || 'Admin'}</div>
                        {v.branch && <div className="text-[10px] text-slate-400">{v.branch}</div>}
                      </td>
                      <td className="py-2 px-3 max-w-[160px] truncate text-slate-500" title={addr}>
                        {addr}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap print:hidden">
                        <button
                          type="button"
                          onClick={() => onSelectVisit && onSelectVisit(v)}
                          className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="មើលព័ត៌មានលម្អិត"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {tableData.totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 print:hidden">
            <div>
              បង្ហាញទំព័រទី <span className="font-bold text-slate-800">{tablePage}</span> នៃ <span className="font-bold text-slate-800">{tableData.totalPages}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={tablePage === 1}
                onClick={() => setTablePage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50 font-bold"
              >
                ថយក្រោយ
              </button>
              <div className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200">
                {tablePage} / {tableData.totalPages}
              </div>
              <button
                type="button"
                disabled={tablePage === tableData.totalPages}
                onClick={() => setTablePage(p => Math.min(tableData.totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50 font-bold"
              >
                បន្ទាប់
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ======================= PRINT SIGNATURE FOOTER ======================= */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-300 text-center text-xs">
        <div>
          <p className="font-bold text-slate-800 mb-12">អ្នករៀបចំរបាយការណ៍</p>
          <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-bold">
            {currentUser?.name || '................................'}
          </div>
        </div>
        <div>
          <p className="font-bold text-slate-800 mb-12">ប្រធានផ្នែក / ថ្នាក់ដឹកនាំពិនិត្យ</p>
          <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-bold">
            ................................
          </div>
        </div>
      </div>

    </div>
  );
}

// =========================================================================
// SVG Subcomponent 1: Time Trend Chart (Area / Bar)
// =========================================================================
function TimeTrendSvgChart({ data = [], chartType = 'area', hoveredBar, setHoveredBar }) {
  const W = 620;
  const H = 200;
  const padL = 36;
  const padR = 20;
  const padT = 24;
  const padB = 30;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const yBottom = H - padB;

  const maxVal = Math.max(...data.map(d => d.count), 1);
  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];

  // Calculate points
  const points = data.map((d, i) => {
    const x = data.length === 1 
      ? padL + innerW / 2 
      : padL + (i / (data.length - 1)) * innerW;
    const y = padT + (1 - d.count / maxVal) * innerH;
    return { x, y, ...d, i };
  });

  const linePath = points.length > 1 
    ? 'M ' + points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ') 
    : '';

  const areaPath = points.length > 1
    ? `M ${points[0].x.toFixed(1)},${yBottom} ` +
      points.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L ${points[points.length - 1].x.toFixed(1)},${yBottom} Z`
    : '';

  const barWidth = Math.max(8, Math.min(26, innerW / Math.max(data.length, 1) - 4));

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48 select-none">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines */}
        {yTicks.map((val, idx) => {
          const y = padT + (1 - val / maxVal) * innerH;
          return (
            <g key={idx}>
              <line 
                x1={padL} 
                y1={y} 
                x2={W - padR} 
                y2={y} 
                stroke="#e2e8f0" 
                strokeDasharray="3 3" 
                strokeWidth="1" 
              />
              <text 
                x={padL - 6} 
                y={y + 3} 
                textAnchor="end" 
                fontSize="9" 
                fill="#94a3b8" 
                fontWeight="bold"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Bottom Baseline */}
        <line x1={padL} y1={yBottom} x2={W - padR} y2={yBottom} stroke="#cbd5e1" strokeWidth="1.5" />

        {/* Chart Drawing */}
        {chartType === 'area' ? (
          <>
            {/* Area Fill */}
            {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}
            
            {/* Smooth Line */}
            {linePath && <path d={linePath} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />}
            
            {/* Data Dots */}
            {points.map((p, idx) => (
              <g 
                key={idx}
                onMouseEnter={() => setHoveredBar(p)}
                onMouseLeave={() => setHoveredBar(null)}
                className="cursor-pointer"
              >
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={hoveredBar?.i === p.i ? 5.5 : 3.5} 
                  fill={hoveredBar?.i === p.i ? '#059669' : '#ffffff'} 
                  stroke="#059669" 
                  strokeWidth="2.5" 
                  className="transition-all"
                />
              </g>
            ))}
          </>
        ) : (
          /* Bar Chart View */
          points.map((p, idx) => {
            const barHeight = (p.count / maxVal) * innerH;
            const barX = p.x - barWidth / 2;
            const barY = yBottom - barHeight;
            const isHovered = hoveredBar?.i === p.i;

            return (
              <g 
                key={idx}
                onMouseEnter={() => setHoveredBar(p)}
                onMouseLeave={() => setHoveredBar(null)}
                className="cursor-pointer"
              >
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  rx="3.5"
                  fill={isHovered ? '#047857' : 'url(#barGradient)'}
                  className="transition-all"
                />
              </g>
            );
          })
        )}

        {/* X Axis Date Labels (Sampled to avoid overlap) */}
        {points.map((p, idx) => {
          const step = Math.ceil(points.length / 8);
          if (idx % step === 0 || idx === points.length - 1) {
            return (
              <text
                key={idx}
                x={p.x}
                y={yBottom + 16}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
                fontWeight="bold"
              >
                {p.label}
              </text>
            );
          }
          return null;
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredBar && (
        <div 
          className="absolute z-20 pointer-events-none bg-slate-900 text-white text-[11px] font-bold px-2 py-1 rounded-lg shadow-lg -translate-x-1/2 -translate-y-8 animate-fadeIn"
          style={{
            left: `${(hoveredBar.x / W) * 100}%`,
            top: `${(hoveredBar.y / H) * 100}%`
          }}
        >
          {hoveredBar.label}: {hoveredBar.count} លើក
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SVG Subcomponent 2: Donut Chart
// =========================================================================
function CropDonutSvgChart({ data = [], total = 0, hoveredSlice, setHoveredSlice }) {
  const R = 58;
  const C = 2 * Math.PI * R; // ~364.42
  const totalCount = data.reduce((sum, d) => sum + d.count, 0) || 1;

  let cumulativeAngle = 0;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        {/* Background Track */}
        <circle
          cx="80"
          cy="80"
          r={R}
          fill="transparent"
          stroke="#f1f5f9"
          strokeWidth="20"
        />

        {/* Slices */}
        {data.map((item, idx) => {
          const sliceFraction = item.count / totalCount;
          const strokeDash = sliceFraction * C;
          const strokeOffset = -cumulativeAngle;
          cumulativeAngle += strokeDash;

          const isHovered = hoveredSlice?.name === item.name;

          return (
            <circle
              key={idx}
              cx="80"
              cy="80"
              r={R}
              fill="transparent"
              stroke={item.color}
              strokeWidth={isHovered ? 23 : 20}
              strokeDasharray={`${strokeDash} ${C - strokeDash}`}
              strokeDashoffset={strokeOffset}
              onMouseEnter={() => setHoveredSlice(item)}
              onMouseLeave={() => setHoveredSlice(null)}
              className="transition-all duration-300 cursor-pointer"
            />
          );
        })}
      </svg>

      {/* Center Label (Non-rotated) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
        {hoveredSlice ? (
          <>
            <span className="text-[10px] text-slate-500 font-bold truncate max-w-[90px]">{hoveredSlice.name}</span>
            <span className="text-sm font-black text-slate-900 leading-tight">{hoveredSlice.count} លើក</span>
            <span className="text-[9px] font-bold text-emerald-700">{hoveredSlice.percentage}%</span>
          </>
        ) : (
          <>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">សរុប</span>
            <span className="text-base font-black text-slate-900 leading-tight">{total.toLocaleString()}</span>
            <span className="text-[9px] text-slate-500 font-medium">ចុះចំការ</span>
          </>
        )}
      </div>
    </div>
  );
}

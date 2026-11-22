// Telegram Share & Bot Utilities for Sremeas Field Reports
import { parseCrops } from './staffUtils';

/**
 * Format field visit data into a clean, comprehensive Khmer report text for Telegram
 */
export function formatVisitTelegramText(visit) {
  if (!visit) return '';

  const dateStr = visit.visit_date 
    ? new Date(visit.visit_date).toLocaleDateString('km-KH', { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      })
    : new Date().toLocaleDateString('km-KH');

  const crops = parseCrops(visit.crops, visit.crop_type, visit.farm_size_ha);

  // Format crops list
  let cropsText = '';
  if (crops.length > 0) {
    cropsText = crops.map((c, i) => {
      let parts = [`  ${i + 1}. ${c.crop_type || 'ដំណាំ'}`];
      if (c.variety) parts.push(`ពូជ: ${c.variety}`);
      if (c.farm_size_ha) parts.push(`ផ្ទៃដី: ${c.farm_size_ha} ហ.ត`);
      if (c.plant_count) parts.push(`ចំនួន: ${parseInt(c.plant_count, 10).toLocaleString()} ដើម`);
      if (c.crop_age) parts.push(`អាយុ: ${c.crop_age}`);
      return parts.join(' | ');
    }).join('\n');
  } else if (visit.crop_type) {
    cropsText = `  • ${visit.crop_type} ${visit.farm_size_ha ? `(${visit.farm_size_ha} ហ.ត)` : ''}`;
  } else {
    cropsText = '  • មិនបានបញ្ជាក់';
  }

  // Location string
  const locStr = visit.location_address || 
    [visit.customers?.village, visit.customers?.commune, visit.customers?.district, visit.customers?.province]
      .filter(Boolean)
      .join(', ') || 
    visit.customers?.village || 
    'មិនបានបញ្ជាក់';

  // Google Maps URL
  const mapsUrl = (visit.latitude && visit.longitude) 
    ? `https://www.google.com/maps?q=${visit.latitude},${visit.longitude}` 
    : '';

  // Team members
  let teamStr = '';
  if (Array.isArray(visit.team_members) && visit.team_members.length > 0) {
    teamStr = visit.team_members.join(', ');
  } else if (typeof visit.team_members === 'string' && visit.team_members.trim()) {
    teamStr = visit.team_members;
  }

  // Follow up date
  const followUpStr = visit.follow_up_date 
    ? new Date(visit.follow_up_date).toLocaleDateString('km-KH') 
    : '';

  // Photos
  const photos = Array.isArray(visit.photos) ? visit.photos.filter(Boolean) : [];

  const lines = [
    `របាយការណ៍ចុះពិនិត្យចំការ (Field Visit Report)`,
    `========================================`,
    `ម្ចាស់ចំការ: ${visit.customers?.name || 'មិនស្គាល់'}`,
    visit.customers?.phone ? `លេខទូរស័ព្ទ: ${visit.customers.phone}` : null,
    `ទីតាំងចំការ: ${locStr}`,
    mapsUrl ? `ផែនទី GPS: ${mapsUrl}` : null,
    `----------------------------------------`,
    `ព័ត៌មានដំណាំ:`,
    cropsText,
    `ស្ថានភាពដំណាំ: ${visit.crop_status || 'ល្អ'}`,
    visit.issues_identified ? `បញ្ហាជួបប្រទះ: ${visit.issues_identified}` : null,
    visit.products_recommended ? `ផលិតផលណែនាំ: ${visit.products_recommended}` : null,
    followUpStr ? `កាលបរិច្ឆេទតាមដានបន្ត: ${followUpStr}` : null,
    visit.notes ? `ចំណាំបន្ថែម: ${visit.notes}` : null,
    photos.length > 0 ? `រូបភាពជាក់ស្តែង (${photos.length} សន្លឹក):\n${photos.map((p, i) => `  [រូប ${i + 1}] ${p}`).join('\n')}` : null,
    `----------------------------------------`,
    `បុគ្គលិកចុះផ្ទាល់: ${visit.staff_name || '—'}`,
    visit.branch ? `សាខា: ${visit.branch}` : null,
    teamStr ? `ក្រុមការងាររួមដំណើរ: ${teamStr}` : null,
    `កាលបរិច្ឆេទចុះ: ${dateStr}`,
    `========================================`,
    `ប្រព័ន្ធគ្រប់គ្រងការចុះចំការ ស្រែទាស`
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Generate standard Telegram web/app share URL
 */
export function getTelegramShareUrl(visit) {
  const text = formatVisitTelegramText(visit);
  return `https://t.me/share/url?text=${encodeURIComponent(text)}`;
}

/**
 * Open Telegram Share directly in new tab or Telegram app
 */
export function openTelegramShare(visit) {
  const url = getTelegramShareUrl(visit);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Copy formatted visit report to clipboard
 */
export async function copyVisitReportToClipboard(visit) {
  const text = formatVisitTelegramText(visit);
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  }
}

/**
 * Get saved Telegram Bot settings from localStorage
 */
export function getTelegramSettings() {
  try {
    const raw = localStorage.getItem('sremeas_telegram_settings');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to parse telegram settings:', err);
  }
  return {
    botToken: '',
    chatId: '',
    groupName: ''
  };
}

/**
 * Save Telegram Bot settings to localStorage
 */
export function saveTelegramSettings(settings) {
  try {
    localStorage.setItem('sremeas_telegram_settings', JSON.stringify({
      botToken: (settings?.botToken || '').trim(),
      chatId: (settings?.chatId || '').trim(),
      groupName: (settings?.groupName || '').trim()
    }));
  } catch (err) {
    console.warn('Failed to save telegram settings:', err);
  }
}

/**
 * Send report directly to a Telegram Group via Bot API
 */
export async function sendVisitViaTelegramBot(visit, customSettings = null) {
  const settings = customSettings || getTelegramSettings();
  const botToken = settings?.botToken?.trim();
  const chatId = settings?.chatId?.trim();

  if (!botToken || !chatId) {
    throw new Error('សូមបញ្ចូល Telegram Bot Token និង Chat ID ជាមុនសិន!');
  }

  const text = formatVisitTelegramText(visit);

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      disable_web_page_preview: false
    })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.description || 'មិនអាចផ្ញើចូល Telegram Group បានទេ!');
  }

  return data;
}

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
 * Format concise summary text for Telegram Share URL (to fit strictly within HTTP GET query limits)
 */
export function formatVisitTelegramSummary(visit) {
  if (!visit) return '';

  const crops = parseCrops(visit.crops, visit.crop_type, visit.farm_size_ha);
  const cropsSummary = crops.map(c => `${c.crop_type}${c.variety ? ` (${c.variety})` : ''}`).filter(Boolean).join(', ') || visit.crop_type || '—';

  const locStr = visit.location_address || 
    [visit.customers?.village, visit.customers?.commune, visit.customers?.district, visit.customers?.province]
      .filter(Boolean)
      .join(', ') || 
    visit.customers?.village || 
    '—';

  const lines = [
    `របាយការណ៍ចុះចំការ: ${visit.customers?.name || 'មិនស្គាល់'}`,
    visit.customers?.phone ? `ទូរស័ព្ទ: ${visit.customers.phone}` : null,
    `ទីតាំង: ${locStr}`,
    `ដំណាំ: ${cropsSummary}`,
    `ស្ថានភាព: ${visit.crop_status || 'ល្អ'}`,
    visit.issues_identified ? `បញ្ហា: ${visit.issues_identified}` : null,
    visit.products_recommended ? `ណែនាំ: ${visit.products_recommended}` : null,
    `បុគ្គលិក: ${visit.staff_name || '—'}${visit.branch ? ` (${visit.branch})` : ''}`,
    `កាលបរិច្ឆេទ: ${visit.visit_date ? new Date(visit.visit_date).toLocaleDateString('km-KH') : ''}`
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Generate standard Telegram share URL with guaranteed `url` and `text` parameters
 * to prevent Telegram "400 Bad Request" errors.
 */
export function getTelegramShareUrl(visit) {
  const summaryText = formatVisitTelegramSummary(visit);
  const mapsUrl = (visit.latitude && visit.longitude) 
    ? `https://www.google.com/maps?q=${visit.latitude},${visit.longitude}` 
    : 'https://sirkakratana-ops.github.io/sremeas-field/';
  
  // Telegram's `t.me/share/url` REQUIRES the `url` query parameter. Without it, it returns "Bad Request"!
  return `https://t.me/share/url?url=${encodeURIComponent(mapsUrl)}&text=${encodeURIComponent(summaryText)}`;
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
 * Send report directly to a Telegram Group via Bot API,
 * natively displaying actual photos (single photo or photo album) inside the group!
 */
export async function sendVisitViaTelegramBot(visit, customSettings = null) {
  const settings = customSettings || getTelegramSettings();
  const botToken = settings?.botToken?.trim();
  const chatId = settings?.chatId?.trim();

  if (!botToken || !chatId) {
    throw new Error('សូមបញ្ចូល Telegram Bot Token និង Chat ID ជាមុនសិន!');
  }

  const fullText = formatVisitTelegramText(visit);
  const photos = Array.isArray(visit.photos) 
    ? visit.photos.filter(p => typeof p === 'string' && p.startsWith('http')) 
    : [];

  // ==========================================================
  // CASE 1: Has exactly 1 Photo -> Send via `sendPhoto`
  // ==========================================================
  if (photos.length === 1) {
    try {
      // Telegram photo caption maximum length is 1024 characters
      const caption = fullText.length <= 1024 ? fullText : fullText.slice(0, 1020) + '...';
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photos[0],
          caption: caption
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.description || 'បរាជ័យក្នុងការផ្ញើរូបភាព');
      }

      // If fullText was truncated, send the full text message right after
      if (fullText.length > 1024) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: fullText
          })
        });
      }
      return data;
    } catch (photoErr) {
      console.warn('sendPhoto failed, attempting fallback to sendMessage:', photoErr);
      // Fallback continues below
    }
  }

  // ==========================================================
  // CASE 2: Has Multiple Photos (2-10) -> Send as Photo Album via `sendMediaGroup`
  // ==========================================================
  if (photos.length > 1) {
    try {
      const mediaList = photos.slice(0, 10).map((p, idx) => ({
        type: 'photo',
        media: p,
        caption: idx === 0 ? (fullText.length <= 1024 ? fullText : fullText.slice(0, 1020) + '...') : undefined
      }));

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          media: mediaList
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.description || 'បរាជ័យក្នុងការផ្ញើក្រុមរូបភាព');
      }

      // If fullText was truncated, send the full text message right after
      if (fullText.length > 1024) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: fullText
          })
        });
      }
      return data;
    } catch (mediaErr) {
      console.warn('sendMediaGroup failed, attempting fallback to sendMessage:', mediaErr);
      // Fallback continues below
    }
  }

  // ==========================================================
  // CASE 3: No photos or photo upload failed -> Send via `sendMessage`
  // ==========================================================
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: fullText,
      disable_web_page_preview: false
    })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.description || 'មិនអាចផ្ញើសារចូល Telegram Group បានទេ!');
  }
  return data;
}

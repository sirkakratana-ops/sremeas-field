// Telegram Share & Bot Utilities for Sremeas Field Reports
import { 
  parseCrops, 
  formatProvince, 
  formatPhoneNumber, 
  extractVisitPurpose, 
  extractFarmerHistory
} from './staffUtils.js';
import { isHeicFile, convertHeicToJpeg } from './imageUtils.js';
import { supabase } from './supabase.js';

/**
 * Format date in DD/MM/YYYY format
 */
export function formatTelegramDate(dateVal) {
  if (!dateVal) return '';
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
 * Format field visit data into the exact executive report format for Telegram
 */
export function formatVisitTelegramText(visit) {
  if (!visit) return '';

  const dateStr = formatTelegramDate(visit.visit_date) || formatTelegramDate(new Date());

  const crops = parseCrops(visit.crops, visit.crop_type, visit.farm_size_ha);
  const cropsSummary = crops.length > 0 
    ? crops.map(c => {
        let label = c.crop_type || '';
        const details = [];
        if (c.variety) details.push(`ពូជ: ${c.variety}`);
        if (c.farm_size_ha) details.push(`${c.farm_size_ha} ហ.ត`);
        if (details.length > 0) label += ` (${details.join(', ')})`;
        return label;
      }).filter(Boolean).join(', ')
    : (visit.crop_type || '—');

  // Location string
  const locParts = [
    visit.customers?.village,
    visit.customers?.commune,
    visit.customers?.district,
    formatProvince(visit.customers?.province)
  ].filter(Boolean);
  const locStr = visit.location_address || 
    (locParts.length > 0 ? locParts.join(', ') : null) || 
    visit.customers?.village || 
    'មិនបានបញ្ជាក់';

  // Google Maps URL: strictly https://www.google.com/maps?q=latitude,longitude
  const mapsUrl = (visit.latitude && visit.longitude) 
    ? `https://www.google.com/maps?q=${visit.latitude},${visit.longitude}` 
    : 'គ្មាន';

  // Team members
  let teamStr = '';
  if (Array.isArray(visit.team_members) && visit.team_members.length > 0) {
    teamStr = visit.team_members.join(', ');
  } else if (typeof visit.team_members === 'string' && visit.team_members.trim()) {
    teamStr = visit.team_members;
  }

  // Visit purpose
  const purposeText = extractVisitPurpose(visit) || '—';

  // Farmer usage history
  const farmerHistoryText = extractFarmerHistory(visit) || 'គ្មាន';

  const lines = [
    `📋 របាយការណ៍ជូនថ្នាក់ដឹកនាំពិនិត្យ`,
    ``,
    `📅 កាលបរិច្ឆេទ: ${dateStr}`,
    `👤 អ្នករាយការណ៍: ${visit.staff_name || '—'}`,
    `👥 អ្នកចូលរួម: ${teamStr || 'គ្មាន'}`,
    `🏢 សាខា: ${visit.branch || '—'}`,
    `🎯 គោលបំណង: ${purposeText}`,
    `━━━━━━━━━━━━━━`,
    `🧑‍🌾 ព័ត៌មានអតិថិជន`,
    `• ឈ្មោះអតិថិជន: ${visit.customers?.name || 'មិនស្គាល់'}`,
    `• អាសយដ្ឋាន: ${locStr}`,
    `• លេខទូរស័ព្ទ: ${formatPhoneNumber(visit.customers?.phone) || '—'}`,
    `• ប្រភេទដំណាំ: ${cropsSummary || '—'}`,
    `• ផែនទី GPS: ${mapsUrl}`,
    ``,
    `🌱 ស្ថានភាពទូទៅនៃចម្ការ:`,
    `${visit.crop_status || 'ល្អ'}`,
    ``,
    `⚠️ បញ្ហាប្រឈម:`,
    `${visit.issues_identified || 'គ្មាន'}`,
    ``,
    `✅ ដំណោះស្រាយ:`,
    `${visit.products_recommended || 'គ្មាន'}`,
    ``,
    `🧾 ប្រវត្តិប្រើប្រាស់របស់កសិករ:`,
    `${farmerHistoryText}`,
    `━━━━━━━━━━━━━━`,
    `🙏 សូមថ្នាក់ដឹកនាំពិនិត្យ និងផ្តល់យោបល់`
  ];

  return lines.join('\n');
}

/**
 * Format concise summary text for Telegram Share URL
 */
export function formatVisitTelegramSummary(visit) {
  return formatVisitTelegramText(visit);
}

/**
 * Generate standard Telegram share URL with guaranteed `url` and `text` parameters
 * to prevent Telegram "400 Bad Request" errors.
 */
export function getTelegramShareUrl(visit) {
  const summaryText = formatVisitTelegramText(visit);
  const mapsUrl = (visit.latitude && visit.longitude) 
    ? `https://www.google.com/maps?q=${visit.latitude},${visit.longitude}` 
    : 'https://www.mkt.sremeas.com';
  
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

export const DEFAULT_TELEGRAM_SETTINGS = {
  botToken: '9082773267:AAFBiXW0q5uQ7R7Kl1h-hJUjihTDJbW-Buk',
  chatId: '-1003237411022',
  groupName: 'SALE TEAM 2026'
};

/**
 * Get saved Telegram Bot settings from localStorage with built-in default values
 */
export function getTelegramSettings() {
  try {
    const raw = localStorage.getItem('sremeas_telegram_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        botToken: parsed.botToken || DEFAULT_TELEGRAM_SETTINGS.botToken,
        chatId: parsed.chatId || DEFAULT_TELEGRAM_SETTINGS.chatId,
        groupName: parsed.groupName || DEFAULT_TELEGRAM_SETTINGS.groupName
      };
    }
  } catch (err) {
    console.warn('Failed to parse telegram settings:', err);
  }
  return { ...DEFAULT_TELEGRAM_SETTINGS };
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
 * If an image URL is in HEIC/HEIF format, convert it to JPEG and upload to visit-photos/converted
 * so that Telegram servers and all browsers can view it cleanly.
 */
export async function convertHeicUrlToJpegUrl(url) {
  if (!url || typeof url !== 'string' || !isHeicFile(url)) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    const jpegFile = await convertHeicToJpeg(new File([blob], 'photo.jpg', { type: blob.type || 'image/heic' }));
    const fileName = `heic_conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const filePath = `converted/${fileName}`;
    const { error } = await supabase.storage.from('visit-photos').upload(filePath, jpegFile, {
      contentType: 'image/jpeg'
    });
    if (!error) {
      const { data } = supabase.storage.from('visit-photos').getPublicUrl(filePath);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (err) {
    console.warn('convertHeicUrlToJpegUrl error:', err);
  }
  return url;
}

/**
 * Resolve photos for Telegram report:
 * Field visit photos only (photos of the farm / crop).
 * Automatically converts any HEIC photos to standard JPEG.
 * (Staff profile photos are excluded from Telegram reports per user preference)
 */
export async function resolveReportPhotosForTelegram(visit) {
  if (!visit) {
    return { fieldPhotos: [], staffPhotos: [], allPhotos: [] };
  }

  // 1. Raw field photos
  const rawFieldPhotos = Array.isArray(visit.photos) 
    ? visit.photos.filter(p => typeof p === 'string' && p.startsWith('http')) 
    : [];

  // 2. Ensure HEIC conversion if any photo ends in .heic/.heif
  const fieldPhotos = [];
  for (const url of rawFieldPhotos) {
    if (isHeicFile(url)) {
      const converted = await convertHeicUrlToJpegUrl(url);
      fieldPhotos.push(converted);
    } else {
      fieldPhotos.push(url);
    }
  }

  return {
    fieldPhotos,
    staffPhotos: [],
    allPhotos: fieldPhotos
  };
}

/**
 * Send report directly to a Telegram Group via Bot API,
 * natively displaying actual photos (single photo or photo album) inside the group!
 * Attaches field photos and automatically handles HEIC images.
 */
export async function sendVisitViaTelegramBot(visit, customSettings = null) {
  const settings = customSettings || getTelegramSettings();
  const botToken = settings?.botToken?.trim();
  const chatId = settings?.chatId?.trim();

  if (!botToken || !chatId) {
    throw new Error('សូមបញ្ចូល Telegram Bot Token និង Chat ID ជាមុនសិន!');
  }

  const fullText = formatVisitTelegramText(visit);
  
  // Resolve field visit photos only
  const { allPhotos } = await resolveReportPhotosForTelegram(visit);

  // ==========================================================
  // CASE 1: Has exactly 1 Photo -> Send via `sendPhoto`
  // ==========================================================
  if (allPhotos.length === 1) {
    try {
      // Telegram photo caption maximum length is 1024 characters
      const caption = fullText.length <= 1024 ? fullText : fullText.slice(0, 1020) + '...';
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: allPhotos[0],
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
  // CASE 2: Has Multiple Photos (>= 2) -> Send in albums of up to 10 via `sendMediaGroup`
  // Slices into batches so all field photos are sent!
  // ==========================================================
  if (allPhotos.length > 1) {
    try {
      const batches = [];
      for (let i = 0; i < allPhotos.length; i += 10) {
        batches.push(allPhotos.slice(i, i + 10));
      }

      let firstBatchResult = null;
      for (let bIdx = 0; bIdx < batches.length; bIdx++) {
        const batch = batches[bIdx];
        if (batch.length === 1) {
          // Send single photo if batch only has 1
          const caption = bIdx === 0 ? (fullText.length <= 1024 ? fullText : fullText.slice(0, 1020) + '...') : undefined;
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              photo: batch[0],
              caption: caption
            })
          });
          const data = await res.json();
          if (bIdx === 0) firstBatchResult = data;
        } else {
          // Album with 2-10 photos
          const mediaList = batch.map((p, idx) => ({
            type: 'photo',
            media: p,
            caption: (bIdx === 0 && idx === 0) 
              ? (fullText.length <= 1024 ? fullText : fullText.slice(0, 1020) + '...') 
              : undefined
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
          if (bIdx === 0) firstBatchResult = data;
        }
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
      return firstBatchResult || { ok: true };
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

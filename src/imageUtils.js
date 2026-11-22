// Utility functions for client-side image compression and 7-day automatic storage cleanup

/**
 * Format bytes to readable human string (e.g. 150 KB, 2.4 MB)
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Compress an image file on the client using HTML5 Canvas.
 * Automatically resizes image to max dimensions (1280px) and converts to JPEG at quality 0.72.
 * Reduces 5MB-15MB camera photos down to ~150KB-250KB while retaining sharp crop details.
 * 
 * @param {File|Blob} file - Original image file
 * @param {Object} options
 * @param {number} [options.maxWidth=1280] - Maximum width in pixels
 * @param {number} [options.maxHeight=1280] - Maximum height in pixels
 * @param {number} [options.quality=0.72] - JPEG quality (0.0 to 1.0)
 * @returns {Promise<{ file: File, originalSize: number, compressedSize: number, savingsPercent: number, previewUrl: string }>}
 */
export async function compressImage(file, { maxWidth = 1280, maxHeight = 1280, quality = 0.72 } = {}) {
  const originalSize = file?.size || 0;

  // Safety check: if file is invalid or not an image, return as is
  if (!file || (file.type && !file.type.startsWith('image/'))) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savingsPercent: 0,
      previewUrl: file ? URL.createObjectURL(file) : ''
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve({
        file,
        originalSize,
        compressedSize: originalSize,
        savingsPercent: 0,
        previewUrl: URL.createObjectURL(file)
      });
    };

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => {
        resolve({
          file,
          originalSize,
          compressedSize: originalSize,
          savingsPercent: 0,
          previewUrl: URL.createObjectURL(file)
        });
      };

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            file,
            originalSize,
            compressedSize: originalSize,
            savingsPercent: 0,
            previewUrl: URL.createObjectURL(file)
          });
          return;
        }

        // Fill background with white for transparent images (e.g. PNGs)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Smooth image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({
                file,
                originalSize,
                compressedSize: originalSize,
                savingsPercent: 0,
                previewUrl: URL.createObjectURL(file)
              });
              return;
            }

            // Create clean .jpg file name
            const originalName = file.name || `photo_${Date.now()}.jpg`;
            const cleanName = originalName.replace(/\.[^/.]+$/, "") + ".jpg";

            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            const compressedSize = compressedFile.size;
            const savingsPercent = originalSize > 0 
              ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
              : 0;

            const previewUrl = URL.createObjectURL(compressedFile);

            resolve({
              file: compressedFile,
              originalSize,
              compressedSize,
              savingsPercent,
              previewUrl
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Batch compress an array of image files
 */
export async function compressMultipleImages(files, options = {}) {
  const results = [];
  for (const f of files) {
    const res = await compressImage(f, options);
    results.push(res);
  }
  return results;
}

/**
 * Parse bucket name and relative storage path from a Supabase Storage public URL
 * Handles formats:
 * - https://[ref].supabase.co/storage/v1/object/public/visit-photos/visits/abc.jpg
 * - visits/abc.jpg
 */
export function extractStorageInfo(url) {
  if (!url || typeof url !== 'string') return null;

  // Standard Supabase public storage URL
  const publicMarker = '/storage/v1/object/public/';
  const idx = url.indexOf(publicMarker);
  if (idx !== -1) {
    const rest = decodeURIComponent(url.substring(idx + publicMarker.length).split('?')[0]);
    const slashIdx = rest.indexOf('/');
    if (slashIdx !== -1) {
      return {
        bucket: rest.substring(0, slashIdx),
        path: rest.substring(slashIdx + 1)
      };
    }
  }

  // Fallback checks for common bucket paths
  if (url.includes('/visit-photos/')) {
    const path = url.substring(url.indexOf('/visit-photos/') + '/visit-photos/'.length).split('?')[0];
    return { bucket: 'visit-photos', path: decodeURIComponent(path) };
  }
  if (url.includes('/farm-photos/')) {
    const path = url.substring(url.indexOf('/farm-photos/') + '/farm-photos/'.length).split('?')[0];
    return { bucket: 'farm-photos', path: decodeURIComponent(path) };
  }

  // Already a relative path in visits/...
  if (url.startsWith('visits/')) {
    return { bucket: 'visit-photos', path: url };
  }

  return null;
}

/**
 * Delete a list of photo URLs directly from Supabase Storage
 */
export async function deleteVisitPhotosFromStorage(supabase, photoUrls) {
  if (!supabase || !Array.isArray(photoUrls) || photoUrls.length === 0) {
    return { deletedCount: 0, errors: [] };
  }

  const bucketMap = {}; // bucketName -> [paths]
  for (const url of photoUrls) {
    const info = extractStorageInfo(url);
    if (info && info.bucket && info.path) {
      if (!bucketMap[info.bucket]) bucketMap[info.bucket] = [];
      bucketMap[info.bucket].push(info.path);
    }
  }

  let deletedCount = 0;
  const errors = [];

  for (const [bucket, paths] of Object.entries(bucketMap)) {
    try {
      const { data, error } = await supabase.storage.from(bucket).remove(paths);
      if (error) {
        console.error(`Error deleting from storage bucket ${bucket}:`, error);
        errors.push(error.message);
      } else {
        deletedCount += (data ? data.length : paths.length);
      }
    } catch (err) {
      console.error(`Exception deleting from storage bucket ${bucket}:`, err);
      errors.push(err.message);
    }
  }

  return { deletedCount, errors };
}

/**
 * Check if a visit is older than specified days (default 7 days)
 */
export function isVisitPhotoExpired(visitDateOrCreatedAt, days = 7) {
  if (!visitDateOrCreatedAt) return false;
  const date = new Date(visitDateOrCreatedAt);
  if (isNaN(date.getTime())) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return date.getTime() < cutoff;
}

/**
 * Calculate statistics for active vs expired visit photos from loaded visits
 */
export function getPhotoRetentionStats(visits = [], days = 7) {
  let totalVisits = visits.length;
  let visitsWithActivePhotos = 0;
  let activePhotosCount = 0;
  let visitsWithExpiredPhotos = 0;
  let expiredPhotosCount = 0;

  for (const v of visits) {
    const pCount = Array.isArray(v.photos) ? v.photos.length : 0;
    if (pCount > 0) {
      const isExpired = isVisitPhotoExpired(v.visit_date || v.created_at, days);
      if (isExpired) {
        visitsWithExpiredPhotos++;
        expiredPhotosCount += pCount;
      } else {
        visitsWithActivePhotos++;
        activePhotosCount += pCount;
      }
    }
  }

  return {
    totalVisits,
    visitsWithActivePhotos,
    activePhotosCount,
    visitsWithExpiredPhotos,
    expiredPhotosCount,
    retentionDays: days
  };
}

/**
 * Automatically clean up photos for visits older than 7 days:
 * 1. Finds visits where visit_date or created_at < 7 days ago and photos is not empty
 * 2. Deletes physical files from Supabase Storage
 * 3. Updates field_visits records to clear photos array ([])
 */
export async function cleanupExpiredVisitPhotos(supabase, days = 7) {
  if (!supabase) {
    return { success: false, error: "Supabase client is not available", visitsCleaned: 0, photosDeleted: 0 };
  }

  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Query visits that may be expired
    const { data: visits, error } = await supabase
      .from('field_visits')
      .select('id, visit_date, created_at, photos')
      .or(`visit_date.lt.${cutoffDate},created_at.lt.${cutoffDate}`);

    if (error) {
      console.error("Error querying visits for photo cleanup:", error);
      return { success: false, error: error.message, visitsCleaned: 0, photosDeleted: 0 };
    }

    if (!visits || visits.length === 0) {
      return { 
        success: true, 
        visitsCleaned: 0, 
        photosDeleted: 0, 
        message: `គ្មានកំណត់ត្រាចុះចំការចាស់លើសពី ${days} ថ្ងៃទេ` 
      };
    }

    // Filter only those with non-empty photos
    const expiredWithPhotos = visits.filter(v => Array.isArray(v.photos) && v.photos.length > 0);

    if (expiredWithPhotos.length === 0) {
      return { 
        success: true, 
        visitsCleaned: 0, 
        photosDeleted: 0, 
        message: `គ្មានរូបភាពផុតកំណត់លើសពី ${days} ថ្ងៃត្រូវសម្អាតទេ` 
      };
    }

    // Collect all photo URLs and visit IDs
    let allPhotoUrls = [];
    const visitIdsToUpdate = [];

    for (const v of expiredWithPhotos) {
      allPhotoUrls = [...allPhotoUrls, ...v.photos];
      visitIdsToUpdate.push(v.id);
    }

    // 1. Physically delete files from Supabase Storage
    const { deletedCount, errors } = await deleteVisitPhotosFromStorage(supabase, allPhotoUrls);

    // 2. Clear photos column in field_visits
    const { error: updateErr } = await supabase
      .from('field_visits')
      .update({ photos: [] })
      .in('id', visitIdsToUpdate);

    if (updateErr) {
      console.error("Error clearing photos in database:", updateErr);
      return { 
        success: false, 
        error: updateErr.message, 
        visitsCleaned: 0, 
        photosDeleted: deletedCount 
      };
    }

    return {
      success: true,
      visitsCleaned: visitIdsToUpdate.length,
      photosDeleted: allPhotoUrls.length,
      errors,
      message: `បានសម្អាតរូបភាពចាស់លើសពី ${days} ថ្ងៃចំនួន ${allPhotoUrls.length} សន្លឹក ពីកំណត់ត្រាចំនួន ${visitIdsToUpdate.length} ដោយជោគជ័យ!`
    };
  } catch (err) {
    console.error("Exception during photo cleanup:", err);
    return { success: false, error: err.message, visitsCleaned: 0, photosDeleted: 0 };
  }
}

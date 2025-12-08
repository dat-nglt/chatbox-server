/**
 * Tạm thời lưu trữ media (hình ảnh & file) của khách hàng
 * Structure: { [UID]: { media: [], timestamp: Date } }
 */
const mediaCache = new Map();

const CACHE_EXPIRY_TIME = 3600000; // 1 giờ (ms)

export const storeCustomerImage = (UID, imageUrl) => {
    storeCustomerMedia(UID, { type: "image", url: imageUrl });
};

export const storeCustomerFile = (UID, fileUrl, fileName, fileSize) => {
    storeCustomerMedia(UID, { type: "file", url: fileUrl, name: fileName, size: fileSize });
};

const storeCustomerMedia = (UID, mediaItem) => {
    if (!mediaCache.has(UID)) {
        mediaCache.set(UID, {
            media: [],
            timestamp: Date.now(),
        });
    }

    const cacheEntry = mediaCache.get(UID);
    // Tránh duplicate media
    const isDuplicate = cacheEntry.media.some(m => m.url === mediaItem.url);
    if (!isDuplicate) {
        cacheEntry.media.push(mediaItem);
    }
};

export const getCustomerImages = (UID) => {
    return getCustomerMedia(UID, "image");
};

export const getCustomerFiles = (UID) => {
    return getCustomerMedia(UID, "file");
};

export const getAllCustomerMedia = (UID) => {
    return getCustomerMedia(UID, null); // null = all types
};

const getCustomerMedia = (UID, type = null) => {
    const cacheEntry = mediaCache.get(UID);

    if (!cacheEntry) {
        return [];
    }

    // Kiểm tra xem cache có hết hạn không
    if (Date.now() - cacheEntry.timestamp > CACHE_EXPIRY_TIME) {
        mediaCache.delete(UID);
        return [];
    }

    if (type === null) {
        return cacheEntry.media;
    }

    return cacheEntry.media.filter(m => m.type === type);
};

export const clearCustomerMedia = (UID) => {
    mediaCache.delete(UID);
};

// Giữ lại hàm cũ cho compatibility
export const clearCustomerImages = (UID) => {
    clearCustomerMedia(UID);
};
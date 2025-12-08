import db from "../models/index.js";
import logger from "./logger.js";

// Mảng lưu trữ các API key đã load từ database
let apiKeys = [];
// Chỉ số hiện tại cho việc lấy key theo vòng tròn (không còn sử dụng trong logic mới)
let currentIndex = 0;

/**
 * Load tất cả API keys đang active từ database
 * Sắp xếp theo api_key_id tăng dần
 * Nếu lỗi DB, fallback về env keys
 */
const loadApiKeys = async () => {
    try {
        const keys = await db.ApiKeys.findAll({
            where: { is_active: true },
            order: [["api_key_id", "ASC"]],
        });
        apiKeys = keys.map((key) => ({
            id: key.api_key_id,
            api_key: key.api_key,
            model: key.model,
        }));

        logger.warn(`[ApiKeyManager] Loaded ${apiKeys.length} active API keys`);
    } catch (error) {
        logger.error(`[ApiKeyManager] Error loading API keys:`, error.message);
        // Fallback to env keys if DB fails
        apiKeys = [
            {
                api_key: process.env.GEMENI_API_KEY,
                model: "gemini-2.5-flash-lite",
            },
            {
                api_key: process.env.GEMENI_API_KEY_2,
                model: "gemini-2.5-flash-lite",
            },
        ];
    }
};

/**
 * Lấy API key đang được đánh dấu là using
 * Nếu chưa có key nào using, tự động set key đầu tiên làm using
 * @returns {Object} Key object với id, api_key, model
 */
const getCurrentUsingKey = async () => {
    if (apiKeys.length === 0) {
        throw new Error("No API keys available");
    }

    // Kiểm tra xem có key nào đang using không
    const usingKeys = await db.ApiKeys.findAll({
        where: { is_active: true, using: true },
        order: [["api_key_id", "ASC"]],
    });

    if (usingKeys.length > 0) {
        // Trả về key đầu tiên đang using
        const key = usingKeys[0];
        logger.info(
            `[ApiKeyManager] Current using key is ${key.api_key.substring(
                0,
                10
            )}*-*-* - model ${key.model}`
        );
        return {
            id: key.api_key_id,
            api_key: key.api_key,
            model: key.model,
        };
    } else {
        // Không có key nào using, set key đầu tiên làm using
        const firstKey = apiKeys[0];
        await db.ApiKeys.update(
            { using: true },
            { where: { api_key_id: firstKey.id } }
        );

        logger.info(
            `[ApiKeyManager] Set first key ${firstKey.api_key.substring(
                0,
                10
            )}*-*-* as using - model ${firstKey.model}`
        );
        return firstKey;
    }
};

/**
 * Chuyển sang API key tiếp theo khi gặp lỗi quota
 * Set tất cả keys using = false, rồi set key tiếp theo using = true
 * @returns {Object} Key object mới
 */
const switchToNextKey = async () => {
    if (apiKeys.length === 0) {
        throw new Error("No API keys available");
    }

    // Tìm key hiện tại đang using
    const currentUsing = await db.ApiKeys.findOne({
        where: { is_active: true, using: true },
        order: [["api_key_id", "ASC"]],
    });

    if (!currentUsing) {
        // Không có key nào using, set key đầu tiên
        const firstKey = apiKeys[0];
        await db.ApiKeys.update(
            { using: true },
            { where: { api_key_id: firstKey.id } }
        );
        logger.info(
            `[ApiKeyManager] Switched to first key ${firstKey.api_key.substring(
                0,
                10
            )}*-*-*`
        );
        return firstKey;
    }

    // Tìm key tiếp theo sau key hiện tại
    const currentIndex = apiKeys.findIndex(
        (key) => key.id === currentUsing.api_key_id
    );
    const nextIndex = (currentIndex + 1) % apiKeys.length;
    const nextKey = apiKeys[nextIndex];

    // Reset tất cả keys using = false, rồi set key mới using = true
    await db.ApiKeys.update({ using: false }, { where: { is_active: true } });
    await db.ApiKeys.update(
        { using: true },
        { where: { api_key_id: nextKey.id } }
    );

    logger.info(
        `[ApiKeyManager] Switched from key ${currentUsing.api_key.substring(
            0,
            10
        )}*-*-* to ${nextKey.api_key.substring(0, 10)}*-*-*`
    );
    return nextKey;
};

/**
 * Lấy key tiếp theo theo vòng tròn (legacy function, không còn sử dụng)
 */
const getNextApiKey = () => {
    if (apiKeys.length === 0) {
        throw new Error("No API keys available");
    }
    const key = apiKeys[currentIndex];
    currentIndex = (currentIndex + 1) % apiKeys.length;
    // Mark as using
    db.ApiKeys.update({ using: true }, { where: { api_key_id: key.id } });
    return key;
};

/**
 * Release API key (set using = false)
 * @param {number} apiKeyId - ID của key cần release
 */
const releaseApiKey = async (apiKeyId) => {
    try {
        await db.ApiKeys.update(
            { using: false },
            { where: { api_key_id: apiKeyId } }
        );
        logger.info(`[ApiKeyManager] Released API key ${apiKeyId}`);
    } catch (error) {
        logger.error(`[ApiKeyManager] Error releasing key:`, error.message);
    }
};

// Khởi tạo: load API keys khi module được import
loadApiKeys();

// Export các functions
const apiKeyManager = {
    loadApiKeys,
    getNextApiKey,
    getCurrentUsingKey,
    switchToNextKey,
    releaseApiKey,
};

export default apiKeyManager;

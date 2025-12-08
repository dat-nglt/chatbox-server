import { sendZaloMessage } from "../chats/zalo.service.js";
import logger from "./logger.js";

const ADMIN_UID = "7365147034329534561"; // UID của ADMIN

/**
 * Gửi thông báo lỗi quota Gemini cho ADMIN
 * @param {string} userUID - UID người dùng gặp lỗi
 * @param {Object} error - Error object từ Gemini API
 * @param {string} accessToken - Access token để gửi tin nhắn
 */
export const notifyAdminQuotaExceeded = async (userUID, error, accessToken) => {
    try {
        const errorDetails = error.error || error;
        const retryTime =
            errorDetails.details?.find((d) => d["@type"]?.includes("RetryInfo"))
                ?.retryDelay || "không xác định";
        const quotaLimit =
            errorDetails.details?.find((d) =>
                d["@type"]?.includes("QuotaFailure")
            )?.violations?.[0]?.quotaValue || "không xác định";

        const adminMessage = `🚨 **CẢNH BÁO HỆ THỐNG** 🚨

❌ **Lỗi:** Gemini API hết quota (Code: ${errorDetails.code || 429})
👤 **User gặp lỗi:** ${userUID}
📊 **Giới hạn:** ${quotaLimit} requests/ngày
⏰ **Thời gian retry:** ${retryTime}
🔗 **Link quản lý:** https://ai.dev/usage?tab=rate-limit

**Hành động cần thiết:**
- Kiểm tra usage trên Google AI Studio
- Nâng cấp plan hoặc chờ reset quota
- Theo dõi hệ thống trong ${retryTime}

⚠️ Hệ thống sẽ tạm dừng phản hồi AI cho đến khi quota được reset.`;

        await sendZaloMessage(ADMIN_UID, adminMessage, accessToken);
        logger.info(
            `[Admin Notification] Đã gửi thông báo quota exceeded cho ADMIN`
        );
    } catch (notifyError) {
        logger.error(
            `[Admin Notification] Lỗi khi gửi thông báo cho ADMIN:`,
            notifyError.message
        );
    }
};

export const notifyAdminSendMessageError = async (userUID, error, accessToken) => {
    try {
        const errorDetails = error.error || error;

        const adminMessage = `🚨 **CẢNH BÁO LỖI GỬI TIN NHẮN** 🚨

❌ **Lỗi:** Không thể gửi tin nhắn cho user (Code: ${errorDetails.code || 'Unknown'})
👤 **User gặp lỗi:** ${userUID}
📝 **Chi tiết lỗi:** ${errorDetails.message || 'Không xác định'}
🕐 **Thời gian:** ${new Date().toLocaleString('vi-VN')}

**Hành động cần thiết:**
- Kiểm tra kết nối Zalo API
- Xác minh access token
- Kiểm tra quota Zalo
- Xem logs chi tiết

⚠️ Hệ thống sẽ thử gửi lại hoặc thông báo lỗi cho user.`;

        await sendZaloMessage(ADMIN_UID, adminMessage, accessToken);
        logger.info(
            `[Admin Notification] Đã gửi thông báo lỗi gửi tin nhắn cho ADMIN`
        );
    } catch (notifyError) {
        logger.error(
            `[Admin Notification] Lỗi khi gửi thông báo cho ADMIN:`,
            notifyError.message
        );
    }
};

/**
 * Gửi thông báo lỗi hệ thống chung cho ADMIN
 * @param {string} userUID - UID người dùng gặp lỗi
 * @param {string} errorType - Loại lỗi
 * @param {string} errorMessage - Nội dung lỗi
 * @param {string} accessToken - Access token
 */
export const notifyAdminSystemError = async (
    userUID,
    errorType,
    errorMessage,
    accessToken
) => {
    try {
        const adminMessage = `🔧 **THÔNG BÁO LỖI HỆ THỐNG** 

❌ **Loại lỗi:** ${errorType}
👤 **User:** ${userUID}
📝 **Chi tiết:** ${errorMessage.substring(0, 200)}...
🕐 **Thời gian:** ${new Date().toLocaleString("vi-VN")}

Vui lòng kiểm tra logs để biết thêm chi tiết.`;

        await sendZaloMessage(ADMIN_UID, adminMessage, accessToken);
        logger.info(
            `[Admin Notification] Đã gửi thông báo lỗi ${errorType} cho ADMIN`
        );
    } catch (notifyError) {
        logger.error(
            `[Admin Notification] Lỗi khi gửi thông báo cho ADMIN:`,
            notifyError.message
        );
    }
};

/**
 * Gửi thông báo lỗi phân tích tin nhắn cho ADMIN
 * @param {string} userUID - UID người dùng gặp lỗi
 * @param {Object} error - Error object
 * @param {string} accessToken - Access token để gửi tin nhắn
 */
export const notifyAdminAnalyzeError = async (userUID, error, accessToken) => {
    try {
        const errorDetails = error.error || error;

        const adminMessage = `🔍 **CẢNH BÁO LỖI PHÂN TÍCH TIN NHẮN** 🔍

❌ **Lỗi:** Không thể phân tích tin nhắn người dùng (Code: ${errorDetails.code || 'Unknown'})
👤 **User gặp lỗi:** ${userUID}
📝 **Chi tiết lỗi:** ${errorDetails.message || 'Không xác định'}
🕐 **Thời gian:** ${new Date().toLocaleString('vi-VN')}

**Hành động cần thiết:**
- Kiểm tra prompt phân tích tin nhắn
- Xác minh kết nối Gemini API
- Kiểm tra định dạng tin nhắn đầu vào
- Xem logs chi tiết

⚠️ Hệ thống sẽ bỏ qua việc trích xuất thông tin lead.`;

        await sendZaloMessage(ADMIN_UID, adminMessage, accessToken);
        logger.info(
            `[Admin Notification] Đã gửi thông báo lỗi phân tích cho ADMIN`
        );
    } catch (notifyError) {
        logger.error(
            `[Admin Notification] Lỗi khi gửi thông báo cho ADMIN:`,
            notifyError.message
        );
    }
};

/**
 * Gửi thông báo lỗi gọi AI phản hồi cho ADMIN
 * @param {string} userUID - UID người dùng gặp lỗi
 * @param {Object} error - Error object
 * @param {string} accessToken - Access token để gửi tin nhắn
 */
export const notifyAdminChatServiceError = async (userUID, error, accessToken) => {
    try {
        const errorDetails = error.error || error;

        const adminMessage = `🤖 **CẢNH BÁO LỖI AI PHẢN HỒI** 🤖

❌ **Lỗi:** AI không thể tạo phản hồi (Code: ${errorDetails.code || 'Unknown'})
👤 **User gặp lỗi:** ${userUID}
📝 **Chi tiết lỗi:** ${errorDetails.message || 'Không xác định'}
🕐 **Thời gian:** ${new Date().toLocaleString('vi-VN')}

**Hành động cần thiết:**
- Kiểm tra quota Gemini API
- Xác minh prompt phản hồi
- Kiểm tra kết nối mạng
- Xem logs chi tiết

⚠️ Hệ thống sẽ không gửi phản hồi cho user.`;

        await sendZaloMessage(ADMIN_UID, adminMessage, accessToken);
        logger.info(
            `[Admin Notification] Đã gửi thông báo lỗi AI phản hồi cho ADMIN`
        );
    } catch (notifyError) {
        logger.error(
            `[Admin Notification] Lỗi khi gửi thông báo cho ADMIN:`,
            notifyError.message
        );
    }
};

/**
 * Gửi thông báo lỗi ghi Google Sheets cho ADMIN
 * @param {string} userUID - UID người dùng gặp lỗi
 * @param {Object} error - Error object
 * @param {string} accessToken - Access token để gửi tin nhắn
 */
export const notifyAdminSheetError = async (userUID, error, accessToken) => {
    try {
        const errorDetails = error.error || error;

        const adminMessage = `📊 **CẢNH BÁO LỖI GHI GOOGLE SHEETS** 📊

❌ **Lỗi:** Không thể ghi dữ liệu vào Google Sheets (Code: ${errorDetails.code || 'Unknown'})
👤 **User gặp lỗi:** ${userUID}
📝 **Chi tiết lỗi:** ${errorDetails.message || 'Không xác định'}
🕐 **Thời gian:** ${new Date().toLocaleString('vi-VN')}

**Hành động cần thiết:**
- Kiểm tra quyền truy cập Google Sheets
- Xác minh service account credentials
- Kiểm tra kết nối mạng
- Xem logs chi tiết

⚠️ Dữ liệu lead có thể bị mất.`;

        await sendZaloMessage(ADMIN_UID, adminMessage, accessToken);
        logger.info(
            `[Admin Notification] Đã gửi thông báo lỗi ghi sheet cho ADMIN`
        );
    } catch (notifyError) {
        logger.error(
            `[Admin Notification] Lỗi khi gửi thông báo cho ADMIN:`,
            notifyError.message
        );
    }
};

/**
 * Gửi thông báo lỗi gửi lead cho ADMIN
 * @param {string} userUID - UID người dùng gặp lỗi
 * @param {Object} error - Error object
 * @param {string} accessToken - Access token để gửi tin nhắn
 */
export const notifyAdminLeadForwardError = async (userUID, error, accessToken) => {
    try {
        const errorDetails = error.error || error;

        const adminMessage = `📤 **CẢNH BÁO LỖI GỬI LEAD** 📤

❌ **Lỗi:** Không thể gửi thông tin lead (Code: ${errorDetails.code || 'Unknown'})
👤 **User gặp lỗi:** ${userUID}
📝 **Chi tiết lỗi:** ${errorDetails.message || 'Không xác định'}
🕐 **Thời gian:** ${new Date().toLocaleString('vi-VN')}

**Hành động cần thiết:**
- Kiểm tra kết nối Zalo API
- Xác minh access token
- Kiểm tra định dạng dữ liệu lead
- Xem logs chi tiết

⚠️ Thông tin khách hàng có thể bị mất.`;

        await sendZaloMessage(ADMIN_UID, adminMessage, accessToken);
        logger.info(
            `[Admin Notification] Đã gửi thông báo lỗi gửi lead cho ADMIN`
        );
    } catch (notifyError) {
        logger.error(
            `[Admin Notification] Lỗi khi gửi thông báo cho ADMIN:`,
            notifyError.message
        );
    }
};

/**
 * Gửi thông báo lỗi lấy access token cho ADMIN
 * @param {Object} error - Error object
 * @param {string} accessToken - Access token để gửi tin nhắn (nếu có)
 */
export const notifyAdminTokenError = async (error, accessToken) => {
    try {
        const errorDetails = error.error || error;

        const adminMessage = `🔑 **CẢNH BÁO LỖI ACCESS TOKEN** 🔑

❌ **Lỗi:** Không thể lấy access token hợp lệ (Code: ${errorDetails.code || 'Unknown'})
📝 **Chi tiết lỗi:** ${errorDetails.message || 'Không xác định'}
🕐 **Thời gian:** ${new Date().toLocaleString('vi-VN')}

**Hành động cần thiết:**
- Kiểm tra database Zalo tokens
- Refresh access token
- Xác minh app credentials
- Xem logs chi tiết

⚠️ Hệ thống không thể gửi tin nhắn.`;

        await sendZaloMessage(ADMIN_UID, adminMessage, accessToken);
        logger.info(
            `[Admin Notification] Đã gửi thông báo lỗi token cho ADMIN`
        );
    } catch (notifyError) {
        logger.error(
            `[Admin Notification] Lỗi khi gửi thông báo cho ADMIN:`,
            notifyError.message
        );
    }
};

/**
 * Gửi thông báo lỗi webhook cho ADMIN
 * @param {Object} error - Error object
 * @param {string} accessToken - Access token để gửi tin nhắn
 */
export const notifyAdminWebhookError = async (error, accessToken) => {
    try {
        const errorDetails = error.error || error;

        const adminMessage = `🌐 **CẢNH BÁO LỖI WEBHOOK** 🌐

❌ **Lỗi:** Webhook xử lý thất bại (Code: ${errorDetails.code || 'Unknown'})
📝 **Chi tiết lỗi:** ${errorDetails.message || 'Không xác định'}
🕐 **Thời gian:** ${new Date().toLocaleString('vi-VN')}

**Hành động cần thiết:**
- Kiểm tra kết nối Redis
- Xác minh queue BullMQ
- Kiểm tra định dạng webhook payload
- Xem logs chi tiết

⚠️ Tin nhắn người dùng có thể bị mất.`;

        await sendZaloMessage(ADMIN_UID, adminMessage, accessToken);
        logger.info(
            `[Admin Notification] Đã gửi thông báo lỗi webhook cho ADMIN`
        );
    } catch (notifyError) {
        logger.error(
            `[Admin Notification] Lỗi khi gửi thông báo cho ADMIN:`,
            notifyError.message
        );
    }
};

/**
 * Gửi thông báo lỗi reminder cho ADMIN
 * @param {string} userUID - UID người dùng gặp lỗi
 * @param {Object} error - Error object
 * @param {string} accessToken - Access token để gửi tin nhắn
 */
export const notifyAdminReminderError = async (userUID, error, accessToken) => {
    try {
        const errorDetails = error.error || error;

        const adminMessage = `⏰ **CẢNH BÁO LỖI REMINDER** ⏰

❌ **Lỗi:** Không thể thiết lập/gửi reminder (Code: ${errorDetails.code || 'Unknown'})
👤 **User gặp lỗi:** ${userUID}
📝 **Chi tiết lỗi:** ${errorDetails.message || 'Không xác định'}
🕐 **Thời gian:** ${new Date().toLocaleString('vi-VN')}

**Hành động cần thiết:**
- Kiểm tra kết nối Redis
- Xác minh queue BullMQ
- Kiểm tra logic reminder
- Xem logs chi tiết

⚠️ Hệ thống có thể không gửi nhắc nhở tự động.`;

        await sendZaloMessage(ADMIN_UID, adminMessage, accessToken);
        logger.info(
            `[Admin Notification] Đã gửi thông báo lỗi reminder cho ADMIN`
        );
    } catch (notifyError) {
        logger.error(
            `[Admin Notification] Lỗi khi gửi thông báo cho ADMIN:`,
            notifyError.message
        );
    }
};

/**
 * Gửi thông báo lỗi API key manager cho ADMIN
 * @param {Object} error - Error object
 * @param {string} accessToken - Access token để gửi tin nhắn
 */
export const notifyAdminApiKeyError = async (error, accessToken) => {
    try {
        const errorDetails = error.error || error;

        const adminMessage = `🔐 **CẢNH BÁO LỖI API KEY MANAGER** 🔐

❌ **Lỗi:** Lỗi quản lý API key (Code: ${errorDetails.code || 'Unknown'})
📝 **Chi tiết lỗi:** ${errorDetails.message || 'Không xác định'}
🕐 **Thời gian:** ${new Date().toLocaleString('vi-VN')}

**Hành động cần thiết:**
- Kiểm tra database API keys
- Xác minh cấu hình API key
- Kiểm tra logic load/release key
- Xem logs chi tiết

⚠️ Hệ thống có thể không thể gọi Gemini API.`;

        await sendZaloMessage(ADMIN_UID, adminMessage, accessToken);
        logger.info(
            `[Admin Notification] Đã gửi thông báo lỗi API key cho ADMIN`
        );
    } catch (notifyError) {
        logger.error(
            `[Admin Notification] Lỗi khi gửi thông báo cho ADMIN:`,
            notifyError.message
        );
    }
};

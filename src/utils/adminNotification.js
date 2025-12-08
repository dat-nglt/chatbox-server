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

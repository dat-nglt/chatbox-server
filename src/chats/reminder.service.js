import logger from "../utils/logger.js";
import { getValidAccessToken, sendZaloMessage } from "./zalo.service.js";

const REMINDER_MESSAGE = "Dạ không biết em có thể giúp gì thêm cho mình không ạ";

// Cấu hình reminder
const REMINDER_CONFIG = {
    MAX_REMINDERS: 1, // Chỉ gửi 1 lần nhắc nhở
    INITIAL_DELAY: 300000, // 5 phút (delay trước khi gửi nhắc nhở)
    KEY_EXPIRY: 600, // 10 phút - TTL cho reminder keys (tự động reset)
};

/**
 * Thiết lập reminder job để kiểm tra và gửi tin nhắn nhắc nhở sau một khoảng thời gian
 * @param {object} redisClient - Redis client
 * @param {string} UID - User ID
 * @param {object} zaloChatQueue - BullMQ queue
 */
export const setupReminderJob = async (redisClient, UID, zaloChatQueue) => {
    const lastSentKey = `last-sent-${UID}`;
    const reminderJobId = `reminder-${UID}`;

    try {
        await redisClient.set(lastSentKey, Date.now());
        await redisClient.expire(lastSentKey, REMINDER_CONFIG.KEY_EXPIRY);

        // Xóa job cũ nếu tồn tại
        try {
            const existingJob = await zaloChatQueue.getJob(reminderJobId);
            if (existingJob) {
                await existingJob.remove();
            }
        } catch (error) {
            logger.debug(`[Reminder Service] Không tìm thấy job cũ cho UID: ${UID}`);
        }

        await zaloChatQueue.add(
            "reminder-check",
            { UID },
            {
                jobId: reminderJobId,
                delay: REMINDER_CONFIG.INITIAL_DELAY,
                removeOnComplete: true,
            }
        );
        logger.info(`[Reminder Service] Đã thiết lập reminder job cho UID: ${UID} (chưa có số điện thoại)`);
    } catch (error) {
        logger.error(`[Reminder Service] Lỗi khi thiết lập reminder job cho UID ${UID}:`, error.message);
    }
};

/**
 * Xử lý công việc kiểm tra reminder và gửi tin nhắn nhắc nhở
 * @param {object} redisClient - Redis client
 * @param {string} UID - User ID
 * @param {object} zaloChatQueue - BullMQ queue (tùy chọn, để schedule retry)
 */
export const handleReminderCheck = async (redisClient, UID, zaloChatQueue) => {
    const lastSentKey = `last-sent-${UID}`;
    const lastReceivedKey = `last-received-${UID}`;
    const reminderCountKey = `reminder-count-${UID}`;
    const hasPhoneKey = `has-phone-${UID}`;

    try {
        const lastSent = await redisClient.get(lastSentKey);
        const lastReceived = await redisClient.get(lastReceivedKey);
        const reminderCount = parseInt(await redisClient.get(reminderCountKey)) || 0;
        const hasPhone = await redisClient.get(hasPhoneKey);

        logger.info(`[Reminder Service] Kiểm tra reminder cho UID: ${UID}`, {
            lastSent,
            lastReceived,
            reminderCount,
            hasPhone,
        });

        // Nếu đã có số điện thoại => bỏ qua
        if (hasPhone === "true") {
            logger.info(`[Reminder Service] Bỏ qua reminder cho UID: ${UID} (đã có số điện thoại)`);
            return;
        }

        // Nếu đã gửi reminder 1 lần => bỏ qua (sẽ reset tự động sau 5 phút)
        if (reminderCount >= REMINDER_CONFIG.MAX_REMINDERS) {
            logger.info(`[Reminder Service] Đã gửi reminder cho UID: ${UID} (${reminderCount}/${REMINDER_CONFIG.MAX_REMINDERS}), chờ reset tự động`);
            return;
        }

        // Kiểm tra: chưa có số điện thoại, chưa có phản hồi mới => gửi reminder
        if (lastSent && (!lastReceived || parseInt(lastReceived) < parseInt(lastSent))) {
            const accessToken = await getValidAccessToken();
            if (accessToken) {
                await sendZaloMessage(UID, REMINDER_MESSAGE, accessToken);
                logger.info(`[Reminder Service] Đã gửi tin nhắn reminder cho UID: ${UID} (lần ${reminderCount + 1}/${REMINDER_CONFIG.MAX_REMINDERS})`);

                // Cập nhật counter
                await redisClient.incr(reminderCountKey);
                await redisClient.expire(reminderCountKey, REMINDER_CONFIG.KEY_EXPIRY);
                logger.info(`[Reminder Service] Sẽ reset reminder sau ${REMINDER_CONFIG.KEY_EXPIRY}s (5 phút)`);
            } else {
                logger.error(`[Reminder Service] Không thể lấy access token để gửi reminder cho UID: ${UID}`);
            }
        } else {
            logger.info(`[Reminder Service] Không cần gửi reminder cho UID: ${UID}`, {
                sentCount: reminderCount,
                userResponded: lastReceived && parseInt(lastReceived) >= parseInt(lastSent),
            });
        }
    } catch (error) {
        logger.error(`[Reminder Service] Lỗi khi xử lý reminder check cho UID ${UID}:`, error.message);
    }
};

/**
 * Cập nhật thời gian tin nhắn cuối cùng được nhận từ người dùng
 * @param {object} redisClient - Redis client
 * @param {string} UID - User ID
 */
export const updateLastReceivedTime = async (redisClient, UID) => {
    const lastReceivedKey = `last-received-${UID}`;
    try {
        await redisClient.set(lastReceivedKey, Date.now());
        await redisClient.expire(lastReceivedKey, REMINDER_CONFIG.KEY_EXPIRY);
        logger.info(`[Reminder Service] Cập nhật thời gian tin nhắn cuối cùng cho UID: ${UID}`);
    } catch (error) {
        logger.error(`[Reminder Service] Lỗi khi cập nhật last-received cho UID ${UID}:`, error.message);
    }
};

/**
 * Reset reminder cho user (khi user phản hồi hoặc có số điện thoại)
 * @param {object} redisClient - Redis client
 * @param {string} UID - User ID
 */
export const resetReminder = async (redisClient, UID) => {
    const reminderCountKey = `reminder-count-${UID}`;
    try {
        await redisClient.del(reminderCountKey);
        logger.info(`[Reminder Service] Đã reset reminder counter cho UID: ${UID}`);
    } catch (error) {
        logger.error(`[Reminder Service] Lỗi khi reset reminder cho UID ${UID}:`, error.message);
    }
};
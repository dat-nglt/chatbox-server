import { Worker, Queue } from "bullmq";
import logger from "./src/utils/logger.js";
import conversationService from "./src/utils/conversation.js";
import { handleChatService } from "./src/chats/chatbox.service.js";
import { analyzeUserMessageService, informationForwardingSynthesisService } from "./src/chats/analyze.service.js";
import { appendJsonToSheet } from "./src/chats/googleSheet.js";
import { getValidAccessToken, sendZaloMessage } from "./src/chats/zalo.service.js";
import { setupReminderJob, handleReminderCheck, updateLastReceivedTime } from "./src/chats/reminder.service.js";
import * as notifyAdmin from "./src/utils/adminNotification.js";

const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || "khonggilatuyetdoiBAOMAT2025",
};

const zaloChatQueue = new Queue("zalo-chat", { connection });

logger.info("[Worker] Đang khởi động và lắng nghe hàng đợi [zalo-chat]...");

const worker = new Worker(
    "zalo-chat",
    async (job) => {
        const { UID, isDebounced } = job.data;
        const redisClient = await worker.client;
        const pendingMessageKey = `pending-msgs-${UID}`;
        let messageFromUser;

        // Handle reminder-check job
        if (job.name === "reminder-check") {
            await handleReminderCheck(redisClient, UID);
            return;
        }

        // Handle normal zalo-chat job
        if (isDebounced) {
            const messages = await redisClient.lrange(pendingMessageKey, 0, -1);

            if (messages.length === 0) {
                logger.warn(
                    `[Worker] Tiến trình ${job.id} cho UID ${UID} không có tin nhắn nào (có thể đã xử lý rồi) [bỏ qua...]`
                );
                return;
            }

            messageFromUser = messages.join(", ");
        } else {
            logger.warn(`[Worker] Job ${job.id} cho UID ${UID} không có cờ 'isDebounced'. Xử lý như job thường.`);
            messageFromUser = job.data.messageFromUser;
        }

        // Cập nhật thời gian tin nhắn cuối cùng từ người dùng
        await updateLastReceivedTime(redisClient, UID);

        // --- [LOGIC XỬ LÝ CHÍNH BẮT ĐẦU TỪ ĐÂY] ---

        let accessToken;
        try {
            accessToken = await getValidAccessToken();
            if (!accessToken) {
                throw new Error("No valid access token available");
            }
        } catch (tokenError) {
            logger.error(`Không nhận được accessToken: ${tokenError.message}`);
            throw tokenError;
        }

        logger.info(`[Worker] Bắt đầu xử lý phiên trò chuyện [${job.id}] cho ${UID} với nội dung: ${messageFromUser}`);

        try {
            conversationService.addMessage(UID, "user", messageFromUser);
            let jsonData = null;

            logger.info(`[Worker] Đang phân tích tin nhắn người dùng cho UID ${UID}...`);

            try {
                const analyzeResult = await analyzeUserMessageService(messageFromUser, UID, accessToken);
                logger.info(`[Worker] Phân tích tin nhắn người dùng cho UID ${UID} hoàn thành.`);
                const analyzeJSON = analyzeResult.replace("```json", "").replace("```", "").trim();
                jsonData = JSON.parse(analyzeJSON);
            } catch (analyzeError) {
                logger.error(`[Worker] Lỗi khi PHÂN TÍCH cho UID ${UID}:`, analyzeError.message);
                await notifyAdmin.notifyAdminAnalyzeError(UID, analyzeError, accessToken);
                throw analyzeError;
            }

            if (jsonData && jsonData.soDienThoai && jsonData.nhuCau) {
                const previouslySentPhone = conversationService.getSentLeadPhone(UID);
                if (previouslySentPhone && previouslySentPhone === jsonData.soDienThoai) {
                    logger.info(
                        `[Worker] Đã gửi thông tin đến Lead cho UID ${UID} rồi [bỏ qua việc gửi lại] - SĐT: ${jsonData.soDienThoai}`
                    );
                } else {
                    logger.info(`[Worker] Gửi thông tin đến Lead cho UID ${UID}. SĐT mới: ${jsonData.soDienThoai}`);
                    const dataCustomer = `🔔 THÔNG TIN KHÁCH HÀNG MỚI\n
    ➡ TÊN KHÁCH HÀNG: ${jsonData.tenKhachHang || "Anh/chị"}
    ➡ SỐ ĐIỆN THOẠI: ${jsonData.soDienThoai}
    ➡ NHU CẦU: ${jsonData.nhuCau}
    ➡ QUAN TÂM: ${jsonData.mucDoQuanTam}\nXem chi tiết trò chuyện tại: https://oa.zalo.me/chat?uid=${UID}&oaid=2357813223063363432`;

                    try {
                        await appendJsonToSheet("data-from-chatbox-ai", jsonData);
                    } catch (sheetError) {
                        logger.error(
                            `[Worker] LỖI NGHIÊM TRỌNG: Không thể ghi Sheet cho SĐT ${jsonData.soDienThoai}:`,
                            sheetError.message
                        );
                        await notifyAdmin.notifyAdminSheetError(UID, sheetError, accessToken);
                    }

                    try {
                        await informationForwardingSynthesisService(
                            UID,
                            dataCustomer,
                            accessToken,
                            jsonData.soDienThoai
                        );
                        logger.info(`[Worker] Đã gửi thông tin Lead thành công cho UID: ${UID}`);
                    } catch (leadError) {
                        logger.error(`[Worker] Lỗi khi GỬI LEAD cho UID ${UID}:`, leadError.message);
                        await notifyAdmin.notifyAdminLeadForwardError(UID, leadError, accessToken);
                    }
                }
                // Đánh dấu đã có số điện thoại
                await redisClient.set(`has-phone-${UID}`, "true");
                await redisClient.expire(`has-phone-${UID}`, 7200);
            } else {
                logger.warn(`[Worker] Chưa đủ thông tin Lead hoặc lỗi phân tích cho UID: ${UID}`);
                // Đánh dấu chưa có số điện thoại
                await redisClient.set(`has-phone-${UID}`, "false");
                await redisClient.expire(`has-phone-${UID}`, 7200);
            }

            logger.info(`[Worker] Đang gọi AI phản hồi cho phiên trò chuyện [${UID}]  [${messageFromUser}]`);

            let messageFromAI;
            try {
                messageFromAI = await handleChatService(messageFromUser, UID, accessToken);
            } catch (chatError) {
                logger.error(`[Worker] Lỗi khi gọi AI phản hồi cho UID ${UID}:`, chatError.message);
                await notifyAdmin.notifyAdminChatServiceError(UID, chatError, accessToken);
                throw chatError;
            }

            conversationService.addMessage(UID, "model", messageFromAI);
            logger.info(`[Worker] AI trả lời [${UID}]: ${messageFromAI.substring(0, 20)}...`);

            try {
                await sendZaloMessage(UID, messageFromAI, accessToken);
            } catch (sendError) {
                logger.error(`[Worker] Lỗi khi gửi tin nhắn cho UID ${UID}:`, sendError.message);
                await notifyAdmin.notifyAdminSendMessageError(UID, sendError, accessToken);
                throw sendError;
            }

            // Chỉ thiết lập reminder nếu chưa có số điện thoại
            const hasPhone = await redisClient.get(`has-phone-${UID}`);
            if (hasPhone !== "true") {
                try {
                    await setupReminderJob(redisClient, UID, zaloChatQueue);
                } catch (reminderError) {
                    logger.error(`[Worker] Lỗi khi thiết lập reminder cho UID ${UID}:`, reminderError.message);
                    await notifyAdmin.notifyAdminReminderError(UID, reminderError, accessToken);
                }
            } else {
                logger.info(`[Worker] Bỏ qua reminder job cho UID: ${UID} (đã có số điện thoại)`);
            }

            logger.info(`[Worker] Phiên trò chuyện [${job.id}] đã xử lý xong cho [${UID}]`);
            await redisClient.del(pendingMessageKey);
        } catch (error) {
            logger.error(
                `[Worker] Phiên làm việc [${job.id}] xử lý thất bại cho ${UID}: ${error.message}. Sẽ tiến hành thực hiện lại...`
            );
            throw error;
        }
    },
    { connection }
);

worker.on("completed", (job) => {
    logger.info(`[Worker] Đã hoàn thành phiên làm việc [${job.id}]`);
});

worker.on("failed", (job, err) => {
    logger.error(`[Worker] Phiên làm việc ${job.id} thất bại sau ${job.attemptsMade} lần thử: ${err.message}`);
});

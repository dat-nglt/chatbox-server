import logger from "../utils/logger.js";
import { zaloChatQueue } from "../chats/queue.service.js";
import { getValidAccessToken, sendZaloMessage } from "../chats/zalo.service.js";

const DEBOUNCE_DELAY = 20000; // 20 giây
// const UN_ALLOWED_UID = ["1591235795556991810", "7365147034329534561"];
const ALLOWED_UID = ["7365147034329534561"];

export const handleZaloWebhook = async (req, res) => {
    try {
        const UID = req.body?.sender?.id; // Lấy UID người gửi từ webhook
        const messageText = req.body?.message?.text; // Lấy tin nhắn từ webhook
        const eventName = req.body?.event_name; // Lấy loại sự kiện từ webhook
        const attachments = req.body?.message?.attachments || []; // Lấy attachment (hình ảnh, file, etc.)

        // Kiểm tra xem UID có được phép không
        if (!ALLOWED_UID.includes(UID)) {
            logger.warn(
                `[Webhook] Bỏ qua tin nhắn từ UID không được phép [${UID}]`
            );
            return res.status(200).send("OK (UID not allowed)");
        }

        // Kiểm tra tính hợp lệ của webhook - hỗ trợ text, image, file, và sticker
        if (
            !UID ||
            (eventName !== "user_send_text" &&
                eventName !== "user_send_image" &&
                eventName !== "user_send_file" &&
                eventName !== "user_send_sticker")
        ) {
            console.log(eventName);
            logger.warn(
                "Webhook không hợp lệ (thiếu UID hoặc event_name không đúng)"
            );
            return res.status(400).send("Invalid webhook data");
        }

        // --- [LOGIC XỬ LÝ STICKER] ---
        if (eventName === "user_send_sticker") {
            try {
                const redisClient = await zaloChatQueue.client;
                const hasSentAnyMsgKey = `has-sent-any-msg-${UID}`;
                const hasSentAnyMsg = await redisClient.get(hasSentAnyMsgKey);

                // Nếu chưa có tin nhắn nào trước (text/image/file) → phản hồi ngay
                if (!hasSentAnyMsg) {
                    logger.info(`[Webhook] Tin nhắn đầu tiên từ UID ${UID} là sticker`);
                    
                    const accessToken = await getValidAccessToken();
                    if (accessToken) {
                        try {
                            await sendZaloMessage(UID, "Chào anh chị ạ!", accessToken);
                            logger.info(`[Webhook] ✓ Gửi phản hồi sticker thành công cho UID: ${UID}`);
                        } catch (sendError) {
                            logger.error(`[Webhook] ✗ Lỗi gửi phản hồi sticker:`, sendError.message);
                        }
                    }

                    // Đánh dấu UID đã có tin nhắn bất kỳ
                    await redisClient.set(hasSentAnyMsgKey, "true", "EX", 86400); // Lưu 24h
                }

                return res.status(200).send("OK (Sticker handled)");
            } catch (error) {
                logger.error(`[Webhook] Lỗi xử lý sticker:`, error.message);
                return res.status(200).send("OK (Sticker error)");
            }
        }

        // Xây dựng message từ text và/hoặc attachments
        let messageFromUser = messageText || "";

        if (eventName === "user_send_image" && attachments.length > 0) {
            // Xử lý hình ảnh
            const imageInfo = attachments
                .filter((att) => att.type === "image")
                .map((att, index) => {
                    const url = att.payload?.url;
                    return url ? `[Hình ảnh ${index + 1}]: ${url}` : null;
                })
                .filter(Boolean)
                .join("\n");

            if (imageInfo) {
                messageFromUser = messageFromUser
                    ? `${messageFromUser}\n\n${imageInfo}`
                    : imageInfo;
            }
        }

        if (eventName === "user_send_file" && attachments.length > 0) {
            // Xử lý file
            const fileInfo = attachments
                .filter((att) => att.type === "file")
                .map((att, index) => {
                    const url = att.payload?.url;
                    const fileName = att.payload?.name || `File ${index + 1}`;
                    const fileSize = att.payload?.size || "unknown";
                    return url
                        ? `[File ${
                              index + 1
                          }]: ${fileName} (${fileSize} bytes) - ${url}`
                        : null;
                })
                .filter(Boolean)
                .join("\n");

            if (fileInfo) {
                messageFromUser = messageFromUser
                    ? `${messageFromUser}\n\n${fileInfo}`
                    : fileInfo;
            }
        }

        // Kiểm tra xem có tin nhắn hợp lệ không
        if (!messageFromUser) {
            logger.warn(`[Webhook] Không có nội dung tin nhắn cho UID: ${UID}`);
            return res.status(200).send("OK (No content)");
        }

        // --- [LOGIC DEBOUNCE] ---
        logger.info(
            `[Webhook] Bắt đầu xử lý Redis/Queue cho UID: ${UID} [${eventName}]`
        );

        try {
            // 1. Lấy Redis client từ queue (BullMQ cung cấp sẵn)
            const redisClient = await zaloChatQueue.client;
            logger.info(`[Webhook] Đã kết nối Redis client thành công`);

            // Đánh dấu đã có tin nhắn bất kỳ (text/image/file)
            await redisClient.set(`has-sent-any-msg-${UID}`, "true", "EX", 86400);

            // 2. Định nghĩa key/jobId cho người dùng này
            const pendingMessageKey = `pending-msgs-${UID}`;
            const debounceJobId = `debounce-job-${UID}`;

            // 3. Lưu tin nhắn này vào danh sách chờ trong Redis
            await redisClient.rpush(pendingMessageKey, messageFromUser);
            await redisClient.expire(pendingMessageKey, 3600);
            logger.info(
                `[Webhook] Đã lưu message vào Redis với key: ${pendingMessageKey}`
            );

            // 4. Tìm job cũ (nếu có) đang trong hàng đợi "delayed"
            const existingJob = await zaloChatQueue.getJob(debounceJobId);
            if (existingJob && (await existingJob.isDelayed())) {
                await existingJob.remove();
                logger.info(`[Webhook] Đã xóa job cũ: ${debounceJobId}`);
            }

            // 5. Thêm job "GỘP" vào hàng đợi với delay
            const newJob = await zaloChatQueue.add(
                "process-message",
                {
                    UID: UID,
                    isDebounced: true,
                },
                {
                    jobId: debounceJobId,
                    delay: DEBOUNCE_DELAY,
                }
            );

            logger.info(
                `[Webhook] Đã tạo tiến trình công việc thành công ID: ${
                    newJob.id
                } cho UID: ${UID}. Sẽ xử lý sau ${
                    DEBOUNCE_DELAY / 1000
                }s nếu không có thêm yêu cầu.`
            );

            // Gửi response sau khi tất cả xử lý thành công
            res.status(200).send("OK");
        } catch (queueError) {
            logger.error("[Webhook] Lỗi xử lý Redis/Queue:", {
                error: queueError.message,
                stack: queueError.stack,
                UID: UID,
                message: messageFromUser,
            });

            // Vẫn gửi response OK để Zalo không retry
            res.status(200).send("OK (Queue Error)");
        }
    } catch (error) {
        logger.error("[Webhook Controller] Lỗi nghiêm trọng:", error);
        if (!res.headersSent) {
            res.status(500).send("Internal Server Error");
        }
    }
};

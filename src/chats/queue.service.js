// File này khởi tạo kết nối Redis và hàng đợi.

import { Queue } from "bullmq";
import logger from "../utils/logger.js";

// Đảm bảo bạn đã cài: npm install bullmq
// Và Redis đang chạy

const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || "khonggilatuyetdoiBAOMAT2025", // Mật khẩu bạn đã set
};

/**
 * Hàng đợi chính xử lý tin nhắn chat từ Zalo.
 */
export const zaloChatQueue = new Queue("zalo-chat", {
    connection,
    defaultJobOptions: {
        attempts: 5, // Thử lại 5 lần nếu thất bại
        backoff: {
            type: "exponential",
            delay: 5000, // Thử lại sau 5s, 10s, 20s, 40s, 80s
        },
        removeOnComplete: true, // Tự động xóa job khi hoàn thành
        removeOnFail: true, // Tự động xóa job khi thất bại sau tất cả lần thử
    },
});

logger.info(
    `[Queue] Đã kết nối Redis tại ${connection.host}:${connection.port}`
);

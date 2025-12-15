import axios from "axios";
import logger from "../utils/logger.js";
import db from "../models/index.js";

const { ZaloTokens } = db;

const ZALO_AUTH_URL = process.env.ZALO_AUTH_URL;

export const getValidAccessToken = async () => {
    // 1. Lấy token duy nhất từ DB (Singleton)
    const tokenData = await ZaloTokens.findOne();
    if (!tokenData) {
        throw new Error("CRITICAL: Chưa có dữ liệu Token trong DB. Vui lòng Admin đăng nhập thủ công lần đầu!");
    }

    // 2. Kiểm tra thời gian hết hạn
    const minuteTime = 10; // Số phút trước khi hết hạn để kích hoạt refresh
    const BUFFER_TIME = minuteTime * 60 * 1000; // Thời gian refresh sớm hơn so với hạn thực tế => tránh lỗi mạng vào thời điểm refresh
    const now = new Date().getTime(); // Thời điểm hiện tại
    const expireTime = new Date(tokenData.access_token_expires_at).getTime(); // Thời điểm hết hạn
    const remainingMinutes = ((expireTime - now) / 1000 / 60).toFixed(1); // Phút còn lại

    logger.warn(
        `[Zalo Token] Token sắp hết hạn! Kích hoạt Refresh tự động sẽ được thực thi sau ${remainingMinutes} phút nữa...`
    );
    logger.warn(`[Zalo Token] Thời điểm hiện tại: ${new Date().toLocaleString()}`);
    logger.warn(`[Zalo Token] Thời điểm hết hạn:  ${new Date(tokenData.access_token_expires_at).toLocaleString()}`);

    if (expireTime - now > BUFFER_TIME) {
        // Chưa đến thời điểm cần refresh
        return tokenData.access_token;
    }

    console.log("[Zalo API] Zalo Token hết hạn, đang tự động refresh...");
    return await refreshAccessToken(tokenData); // Thực hiện refresh và trả về access token mới
};

const refreshAccessToken = async (tokenRecord) => {
    try {
        // Cấu hình Request theo đúng ảnh tài liệu bạn gửi
        const bodyParams = new URLSearchParams();
        bodyParams.append("refresh_token", tokenRecord.refresh_token);
        bodyParams.append("app_id", process.env.ZALO_APP_ID);
        bodyParams.append("grant_type", "refresh_token");

        const config = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                secret_key: process.env.ZALO_SECRET_KEY, // Quan trọng: Header theo ảnh curl
            },
        };

        // Gọi POST request
        const response = await axios.post(ZALO_AUTH_URL, bodyParams, config);
        const data = response.data;

        // Kiểm tra xem Zalo có trả về lỗi không
        if (data.error) {
            throw new Error(`Zalo API Error: ${data.error_name} - ${data.error_description}`);
        }

        // 4. Cập nhật vào Database (Cập nhật bản ghi hiện tại, không tạo mới)
        tokenRecord.access_token = data.access_token; // Cập nhật access token mới
        tokenRecord.refresh_token = data.refresh_token; // Luôn lưu refresh token mới

        // Tính toán thời gian hết hạn mới
        // data.expires_in là giây (thường là 90000s = 25h)
        const newExpireDate = new Date(Date.now() + Number(data.expires_in) * 1000);

        // Refresh token hết hạn sau 3 tháng (tùy chính sách Zalo, ta cứ set dư ra hoặc theo logic của họ)
        const newRefreshExpireDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

        tokenRecord.access_token_expires_at = newExpireDate;
        tokenRecord.refresh_token_expires_at = newRefreshExpireDate;

        await tokenRecord.save();

        console.log("[Zalo Token] Đã refresh token thành công!");
        return data.access_token;
    } catch (error) {
        console.error("[Zalo Token] Lỗi khi refresh Zalo Token:", error.message);
        throw error;
    }
};
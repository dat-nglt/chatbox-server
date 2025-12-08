// File này tập trung toàn bộ logic gọi API Zalo về một chỗ.

import axios from "axios";
import FormData from "form-data";
import logger from "../utils/logger.js";
import { ensureSupportedFormat } from "../utils/fileConverter.js";
import db from "../models/index.js";

const { ZaloTokens } = db;

const ZALO_API = process.env.ZALO_API_BASE_URL;
const ZALO_AUTH_URL = process.env.ZALO_AUTH_URL;

/**
 * Hàm gửi tin nhắn Zalo CS (Chăm sóc khách hàng) - chỉ text
 * @param {string} UID - User ID của người nhận
 * @param {string} text - Nội dung tin nhắn
 * @param {string} accessToken - Access token Zalo
 */
export const sendZaloMessage = async (UID, text, accessToken) => {
    if (!UID || !text) {
        logger.warn("[Zalo API] Thiếu UID hoặc nội dung tin nhắn để gửi");
        return;
    }

    const url = `${ZALO_API}/v3.0/oa/message/cs`;
    const payload = {
        recipient: { user_id: UID },
        message: {
            text: text,
        },
    };

    const headers = {
        access_token: accessToken,
        "Content-Type": "application/json",
    };

    try {
        const response = await axios.post(url, payload, { headers });
        const responseMessage = response.data.message;

        if (responseMessage.toLowerCase() === "success") {
            logger.info(`[Zalo API] Đã gửi tin nhắn thành công đến [UID: ${UID}]`);
            return response.data;
        } else {
            logger.error(
                `[Zalo API] Phản hồi không thành công từ Zalo [UID: ${UID}]:`,
                JSON.stringify(response.data, null, 2)
            );
            throw new Error(`Zalo API returned: ${responseMessage}`);
        }
    } catch (error) {
        logger.error(
            `[Zalo API] Zalo API Error (sendZaloMessage to ${UID}): ${error.response?.data?.message || error.message}`
        );
        throw new Error(error.response?.data?.message || error.message || "Failed to send Zalo message");
    }
};

/**
 * Hàm gửi hình ảnh qua Zalo CS
 * @param {string} UID - User ID của người nhận
 * @param {string} imageUrl - URL của hình ảnh
 * @param {string} accessToken - Access token Zalo
 */
export const sendZaloImage = async (UID, imageUrl, accessToken) => {
    if (!UID || !imageUrl) {
        logger.warn("[Zalo API] Thiếu UID hoặc URL hình ảnh để gửi");
        return;
    }

    const url = `${ZALO_API}/v3.0/oa/message/cs`;
    const payload = {
        recipient: { user_id: UID },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "media",
                    elements: [
                        {
                            media_type: "image",
                            url: imageUrl,
                        },
                    ],
                },
            },
        },
    };

    const headers = {
        access_token: accessToken,
        "Content-Type": "application/json",
    };

    try {
        const response = await axios.post(url, payload, { headers });
        const responseMessage = response.data.message;

        if (responseMessage.toLowerCase() === "success") {
            logger.info(`[Zalo API] Đã gửi hình ảnh thành công đến [UID: ${UID}]`);
            return response.data;
        } else {
            logger.error(
                `[Zalo API] Phản hồi không thành công khi gửi hình ảnh [UID: ${UID}]:`,
                JSON.stringify(response.data, null, 2)
            );
            throw new Error(`Zalo API returned: ${responseMessage}`);
        }
    } catch (error) {
        logger.error(
            `[Zalo API] Zalo API Error (sendZaloImage to ${UID}):`,
            error.response?.data?.message || error.message
        );
        throw new Error(error.response?.data?.message || error.message || "Failed to send Zalo image");
    }
};

/**
 * Hàm upload file lên Zalo và nhận token
 * Lưu ý: Chỉ hỗ trợ file PDF/DOC/DOCX, dung lượng không vượt quá 5MB
 * @param {string} fileUrl - URL của file cần upload
 * @param {string} fileName - Tên file
 * @param {string} accessToken - Access token Zalo
 * @returns {Promise<string>} File token từ Zalo
 */
export const uploadZaloFile = async (fileUrl, fileName, accessToken) => {
    if (!fileUrl || !fileName) {
        logger.warn("[Zalo API] Thiếu URL file hoặc tên file để upload");
        throw new Error("Missing file URL or file name");
    }

    try {
        // Kiểm tra định dạng file
        const { isSupportedFormat } = await import("../utils/fileConverter.js");
        if (!isSupportedFormat(fileName)) {
            const error = new Error(`UNSUPPORTED_FORMAT: ${fileName}`);
            logger.warn(`[Zalo API] File không được hỗ trợ: ${fileName}`);
            throw error;
        }

        // Tải file từ URL
        logger.info(`[Zalo API] Bắt đầu tải file từ URL: ${fileUrl}`);
        const fileResponse = await axios.get(fileUrl, { responseType: "arraybuffer" });
        const fileBuffer = fileResponse.data;

        // Kiểm tra kích thước file (max 5MB)
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        if (fileBuffer.length > maxFileSize) {
            logger.warn(`[Zalo API] File vượt quá kích thước tối đa (5MB): ${fileName}`);
            throw new Error(
                `File size exceeds 5MB limit. Current size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`
            );
        }

        // Sử dụng V2.0 API endpoint
        const url = `${ZALO_API}/v2.0/oa/upload/file`;

        // Tạo FormData để gửi file
        const form = new FormData();
        form.append("file", fileBuffer, fileName);

        const headers = {
            ...form.getHeaders(),
            access_token: accessToken,
        };

        logger.info(`[Zalo API] Uploading file: ${fileName} (${(fileBuffer.length / 1024).toFixed(2)}KB)`);

        const response = await axios.post(url, form, { headers });

        // Kiểm tra response
        if (response.data?.data?.token) {
            logger.info(`[Zalo API] Upload file thành công: ${fileName}`);
            return response.data.data.token;
        } else if (response.data?.error === 0 && response.data?.data?.token) {
            logger.info(`[Zalo API] Upload file thành công: ${fileName}`);
            return response.data.data.token;
        } else {
            logger.warn(`[Zalo API] Upload file thất bại:`, JSON.stringify(response.data, null, 2));
            throw new Error(`Failed to get file token from Zalo API`);
        }
    } catch (error) {
        logger.warn(`[Zalo API] Lỗi khi upload file (${fileName}):`, error.message);
        throw error;
    }
};

/**
 * Hàm gửi file Zalo CS (Chăm sóc khách hàng) - sử dụng file token từ V2.0 API
 * @param {string} UID - User ID của người nhận
 * @param {string} fileToken - Token của file đã được upload lên Zalo (từ /v2.0/oa/upload/file)
 * @param {string} fileName - Tên file
 * @param {string} accessToken - Access token Zalo
 */
export const sendZaloFile = async (UID, fileToken, fileName, accessToken) => {
    if (!UID || !fileToken) {
        logger.warn("[Zalo API] Thiếu UID hoặc File Token để gửi file");
        return;
    }

    const url = `${ZALO_API}/v3.0/oa/message/cs`;

    // Cấu trúc Payload cho V3.0 API sử dụng file token từ V2.0
    const payload = {
        recipient: { user_id: UID },
        message: {
            attachment: {
                type: "file",
                payload: {
                    token: fileToken,
                },
            },
        },
    };

    // Thêm text nếu có tên file
    if (fileName) {
        payload.message.text = `📎 File: ${fileName}`;
    }

    const headers = {
        access_token: accessToken,
        "Content-Type": "application/json",
    };

    try {
        const response = await axios.post(url, payload, { headers });
        const responseMessage = response.data.message;

        if (responseMessage.toLowerCase() === "success") {
            logger.info(`[Zalo API] Đã gửi file thành công đến [UID: ${UID}]: ${fileName || "Unknown"}`);
            return response.data;
        } else {
            logger.error(
                `[Zalo API] Phản hồi không thành công khi gửi file [UID: ${UID}]:`,
                JSON.stringify(response.data, null, 2)
            );
            throw new Error(`Zalo API returned: ${responseMessage}`);
        }
    } catch (error) {
        logger.error(
            `[Zalo API] Zalo API Error (sendZaloFile to ${UID}):`,
            error.response?.data?.message || error.message
        );
        throw new Error(error.response?.data?.message || error.message || "Failed to send Zalo file");
    }
};

export const extractDisplayNameFromMessage = async (UID, accessToken) => {
    if (!UID) {
        logger.warn("[Zalo API] Không có UID để thực hiện trích lọc");
        return null;
    }

    // Chuyển body JSON thành query string
    const queryData = encodeURIComponent(JSON.stringify({ user_id: UID, offset: 0, count: 1 }));
    const url = `${ZALO_API}/v2.0/oa/conversation?data=${queryData}`;

    const headers = {
        access_token: accessToken,
        "Content-Type": "application/json",
    };

    try {
        const response = await axios.get(url, { headers });
        const messages = response.data?.data || [];
        const latestMessage = messages[0] || null;

        if (!latestMessage) {
            logger.warn(`[Zalo API] [${UID}] - Không tìm thấy tin nhắn nào để trích lọc tên hiển thị`);
            return null;
        }
        return latestMessage;
    } catch (error) {
        logger.error(
            `[Zalo API] Error (extractDisplayNameFromMessage for ${UID}): ${JSON.stringify(
                error.response?.data,
                null,
                2
            )}`
        );
        throw new Error(error.response?.data?.message || "Failed to extract display name from Zalo message");
    }
};

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
import axios from "axios";
import logger from "../utils/logger.js";

const ZALO_API = process.env.ZALO_API_BASE_URL;

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
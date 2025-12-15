import axios from "axios";
import FormData from "form-data";
import logger from "../utils/logger.js";

const ZALO_API = process.env.ZALO_API_BASE_URL;

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

    console.log(fileUrl);
    

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
import logger from "./logger.js";

const SUPPORTED_FORMATS = [".pdf", ".doc", ".docx"];

/**
 * Kiểm tra xem file có định dạng được hỗ trợ không
 * @param {string} fileName - Tên file
 * @returns {boolean} True nếu định dạng được hỗ trợ
 */
export const isSupportedFormat = (fileName) => {
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
    return SUPPORTED_FORMATS.includes(fileExtension);
};

/**
 * Lấy danh sách định dạng được hỗ trợ
 */
export const getSupportedFormats = () => SUPPORTED_FORMATS;

/**
 * Kiểm tra định dạng file
 * @param {Buffer} fileBuffer - Buffer của file
 * @param {string} fileName - Tên file
 * @returns {Promise<{buffer: Buffer, newFileName: string, isSupported: boolean}>}
 */
export const ensureSupportedFormat = async (fileBuffer, fileName) => {
    const isSupported = isSupportedFormat(fileName);
    
    if (isSupported) {
        logger.info(`[FileConverter] File hỗ trợ: ${fileName}`);
    } else {
        logger.warn(`[FileConverter] File không hỗ trợ: ${fileName}. Định dạng được hỗ trợ: ${SUPPORTED_FORMATS.join(", ")}`);
    }
    
    return {
        buffer: fileBuffer,
        newFileName: fileName,
        isSupported,
    };
};
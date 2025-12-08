import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đường dẫn CHÍNH XÁC đến file key JSON
const keyFilePath = path.join(__dirname, "google-sheet-key.json");

logger.info(`KeyFilePath ${keyFilePath}`);

const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID =
    process.env.SPREADSHEET_ID ||
    "1NyOabylt4AJlHzhXuQCTwsgg4rOCDwx_podtTwFMe5w";

export const appendJsonToSheet = async (sheetName, jsonData) => {
    try {
        logger.info(`[Sheet] Chuẩn bị ghi dữ liệu vào sheet: ${sheetName}`);

        const vietnamTime = new Date().toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour12: false,
        });

        // Thêm dấu ' để đảm bảo Sheet hiểu là text
        const phone = jsonData.soDienThoai ? `'${jsonData.soDienThoai}` : "";

        const row = [
            jsonData.tenKhachHang || "",
            phone,
            jsonData.nhuCau || "",
            "ZALO OA - ChatAI",
            vietnamTime,
        ];

        const range = `${sheetName}!A:E`;

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range,
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values: [row],
            },
        });

        logger.info(
            `[Sheet] Đã ghi thành công vào dòng ${response.data.updates?.updatedRange}`
        );
        return true;
    } catch (error) {
        logger.error(`[Sheet] Lỗi khi ghi file: ${error.message}`);
        throw error; // Lỗi mới: Ném lỗi ra để worker bắt
    }
};
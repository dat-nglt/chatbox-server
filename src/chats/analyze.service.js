import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION_ANALYZE } from "../promts/promt.v1.analyze.js";
import { extractPhoneNumber } from "../utils/extractPhoneNumber.js";
import conversationService from "../utils/conversation.js";
import logger from "../utils/logger.js";
import {
    extractDisplayNameFromMessage,
    sendZaloMessage,
    sendZaloImage,
    sendZaloFile,
    uploadZaloFile,
} from "./zalo.service.js";
import {
    storeCustomerImage,
    storeCustomerFile,
    getAllCustomerMedia,
    clearCustomerMedia,
} from "../utils/imageCache.js";
import apiKeyManager from "../utils/apiKeyManager.js";

// (Giữ nguyên analyzeUserMessageService, không cần sửa)
export const analyzeUserMessageService = async (
    messageFromUser,
    UID,
    accessToken
) => {
    const phoneNumberFromUser = extractPhoneNumber(messageFromUser); // Trích xuất số điện thoại từ tin nhắn
    let displayName = "Anh/chị"; // Giá trị mặc định nếu không lấy được tên người dùng
    let phoneInfo = null;
    if (phoneNumberFromUser && phoneNumberFromUser.length > 0) {
        phoneInfo = phoneNumberFromUser.join(", "); // Nối các số điện thoại thành chuỗi
        logger.info(`[Data] Phát hiện SĐT: ${phoneInfo}`);
    }

    try {
        const latestMessageFromUID = await extractDisplayNameFromMessage(
            UID,
            accessToken
        );
        displayName = latestMessageFromUID?.from_display_name || displayName;
    } catch (error) {
        logger.warn(
            `Không thể xác định tên người dùng - Giá trị mặc định: Anh/chị`
        );
    }

    const conversationHistory = conversationService.getConversationHistory(UID); // Lấy lịch sử hội thoại của UID cho mục phân tích

    const prompt = `
  Dưới đây là hội thoại trước đó với khách hàng (nếu có):
  ${
      conversationHistory.length
          ? conversationService.getFormattedHistory(UID)
          : "(Chưa có hội thoại trước đó)"
  }
  
  Tin nhắn mới nhất của người dùng: "${messageFromUser}"
  
  ---
  **Thông tin đã biết:**
  * Tên khách hàng (từ hệ thống/lịch sử): "${displayName}"
  * Số điện thoại (từ regex): ${
      phoneInfo ? `"${phoneInfo}"` : "(Chưa phát hiện)"
  }

  ---
  **Nhiệm vụ:**
  Hãy phân tích tin nhắn mới nhất dựa trên bối cảnh hội thoại và thông tin đã biết.
  Trả về một đối tượng JSON duy nhất theo mẫu sau.

  **Lưu ý quan trọng khi điền vào mẫu:**
  1.  **tenKhachHang:** Ưu tiên sử dụng tên từ hệ thống ("${displayName}"). Tuy nhiên, nếu người dùng tự xưng tên MỚI hoặc khác trong tin nhắn mới nhất (ví dụ: "Mình tên là Minh"), hãy cập nhật bằng tên mới đó.
  2.  **soDienThoai:** Ưu tiên số điện thoại từ regex (${
      phoneInfo ? `"${phoneInfo}"` : `""`
  }). Nếu regex không phát hiện được, nhưng người dùng cung cấp số điện thoại rõ ràng trong tin nhắn mới nhất, hãy trích xuất số đó.
  3.  **nhuCau:** Tóm tắt ngắn gọn nhu cầu chính (ví dụ: "Hỏi về giá sản phẩm X", "Khiếu nại", "Cần tư vấn").
  4.  **daDuThongTin:** Đặt là \`true\` nếu bạn đã có cả (1) nhuCau, (2) tenKhachHang, VÀ (3) soDienThoai. Nếu thiếu bất kỳ thông tin nào trong ba thông tin này, hãy đặt là \`false\`.
  5.  **lyDo:** Nếu \`daDuThongTin\` là \`false\`, giải thích ngắn gọn thông tin nào còn thiếu (ví dụ: "Thiếu số điện thoại", "Chưa rõ nhu cầu").

  **Mẫu JSON (Chỉ trả về JSON này):**
  {
    "nhuCau": "",
    "tenKhachHang": "${displayName}",
    "soDienThoai": ${phoneInfo ? `"${phoneInfo}"` : `""`},
    "mucDoQuanTam": "",
    "daDuThongTin": false,
    "lyDo": ""
  }
  `;

    // Trích xuất URL hình ảnh từ tin nhắn nếu có - LÀM TRƯỚC khi gọi AI
    const imageUrlMatch = messageFromUser.match(
        /\[Hình ảnh \d+\]:\s*(https?:\/\/[^\s]+)/g
    );
    if (imageUrlMatch) {
        imageUrlMatch.forEach((match) => {
            const url = match.replace(/\[Hình ảnh \d+\]:\s*/, "").trim();
            if (url) {
                storeCustomerImage(UID, url);
                logger.info(`[Data] Đã lưu trữ hình ảnh khách hàng: ${url}`);
            }
        });
    }

    // Trích xuất URL file từ tin nhắn nếu có
    const fileUrlMatch = messageFromUser.match(
        /\[File \d+\]:\s*(.+?)\s*\((\d+)\s*bytes\)\s*-\s*(https?:\/\/[^\s]+)/g
    );
    if (fileUrlMatch) {
        fileUrlMatch.forEach((match) => {
            const parsed = match.match(
                /\[File \d+\]:\s*(.+?)\s*\((\d+)\s*bytes\)\s*-\s*(https?:\/\/[^\s]+)/
            );
            if (parsed) {
                const fileName = parsed[1];
                const fileSize = parsed[2];
                const fileUrl = parsed[3];
                storeCustomerFile(UID, fileUrl, fileName, fileSize);
                logger.info(
                    `[Data] Đã lưu trữ file khách hàng: ${fileName} (${fileSize} bytes)`
                );
            }
        });
    }

    // Thêm try...catch ở đây để nó cũng ném lỗi 503 nếu có
    let attempts = 0;
    const maxAttempts = 8; // Thử tối đa 8 lần với các API key khác nhau
    let currentApiKey = await apiKeyManager.getCurrentUsingKey();

    let currentAi = new GoogleGenAI({ apiKey: currentApiKey.api_key });
    let currentChat = currentAi.chats.create({
        model: currentApiKey.model,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION_ANALYZE,
        },
    });

    while (attempts < maxAttempts) {
        try {
            const analyzeFromAI = await currentChat.sendMessage({
                message: prompt,
            }); // Gọi AI để phân tích

            const textMessage =
                analyzeFromAI?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
                null;

            if (!textMessage) {
                // Nếu phản hồi rỗng thì ném lỗi
                logger.warn(`[AI Analyze] Phản hồi rỗng cho [${UID}]`);
                throw new Error(
                    "Không đủ dữ liệu để phân tích (phản hồi rỗng)"
                );
            }
            return textMessage;
        } catch (error) {
            attempts++;
            logger.error(
                `[AI Analyze Error] Lỗi khi gọi Gemini - Phân tích hội thoại giữa OA & [${UID}] (attempt ${attempts}):` +
                    error.message
            );

            const errorMessage = error.message || "";
            const errorStatus =
                error.status || error.response?.status || error.code;

            // KIỂM TRA LỖI 429 (QUOTA EXCEEDED) - CHUYỂN SANG KEY TIẾP THEO
            if (
                errorStatus === 429 ||
                errorStatus === "429" ||
                (errorMessage && errorMessage.includes("RESOURCE_EXHAUSTED")) ||
                (errorMessage && errorMessage.includes("quota exceeded"))
            ) {
                logger.warn(
                    `[AI Analyze] Quota exceeded, chuyển sang API key tiếp theo (attempt ${attempts})`
                );

                if (attempts < maxAttempts) {
                    // Chuyển sang key tiếp theo và tạo chat mới
                    currentApiKey = await apiKeyManager.switchToNextKey();
                    currentAi = new GoogleGenAI({
                        apiKey: currentApiKey.api_key,
                    });
                    currentChat = currentAi.chats.create({
                        model: currentApiKey.model,
                        config: {
                            systemInstruction: SYSTEM_INSTRUCTION_ANALYZE,
                        },
                    });
                    continue;
                } else {
                    // ✅ ĐÃ THỬ HẾT API KEYS → Trả về JSON mặc định thay vì throw error
                    logger.warn(
                        `[AI Analyze] Đã thử hết API keys (8 lần 429), trả về JSON mặc định với dữ liệu đã trích xuất`
                    );
                    const defaultAnalyzeResult = {
                        nhuCau: "Cần tư vấn/hỗ trợ",
                        tenKhachHang: displayName,
                        soDienThoai: phoneInfo || "Chưa có số điện thoại",
                        mucDoQuanTam: "",
                    };
                    return JSON.stringify(defaultAnalyzeResult);
                }
            }

            // KIỂM TRA LỖI 503 (HOẶC LỖI MẠNG) - THROW ERROR ĐỂ RETRY CÔNG VIỆC
            if (
                errorStatus === 503 ||
                errorStatus === "503" ||
                errorMessage.includes("503") ||
                errorMessage.includes("overloaded") ||
                errorMessage.includes("ECONNRESET") ||
                errorMessage.includes("ETIMEDOUT") ||
                errorMessage.includes("ENOTFOUND") ||
                error.code === "ECONNRESET" ||
                error.code === "ETIMEDOUT"
            ) {
                logger.error(
                    `[AI Analyze Error] Lỗi ${
                        errorStatus || "mạng"
                    } (Quá tải yêu cầu || Mất kết nối). YÊU CẦU THỬ LẠI.`
                );
                throw new Error(
                    `Lỗi ${
                        errorStatus || "mạng"
                    } (Quá tải yêu cầu || Mất kết nối). Sẽ thử lại tiến trình công việc ...`
                );
            }

            // Các lỗi khác (400, 401...) là lỗi "cứng", không retry, throw error
            logger.warn(
                `[AI Analyze Error] Lỗi không retry (${errorStatus}), throw error`
            );
            throw error;
        }
    }
};

export const informationForwardingSynthesisService = async (
    UID,
    dataCustomer,
    accessToken,
    phoneNumberSent
) => {
    // Danh sách UID của các Lead/Quản lý
    // const LEAD_UIDS = ["1591235795556991810", "7365147034329534561"];
    const LEAD_UIDS = ["7365147034329534561"];

    // Lấy tất cả media (hình ảnh & file) của khách hàng
    const allCustomerMedia = getAllCustomerMedia(UID);

    try {
        // Gửi tin nhắn đồng thời cho tất cả Lead UIDs
        const sendPromises = LEAD_UIDS.map(async (leadUID) => {
            try {
                // Gửi tin nhắn chính với thông tin khách hàng
                await sendZaloMessage(leadUID, dataCustomer, accessToken);
                logger.info(
                    `Đã gửi thông tin khách hàng đến Lead [${leadUID}]`
                );

                // Nếu có media (hình ảnh & file), gửi kèm từng item
                if (allCustomerMedia.length > 0) {
                    for (const media of allCustomerMedia) {
                        try {
                            if (media.type === "image") {
                                await sendZaloImage(
                                    leadUID,
                                    media.url,
                                    accessToken
                                );
                                logger.info(
                                    `Đã gửi hình ảnh đến Lead [${leadUID}]: ${media.url}`
                                );
                            } else if (media.type === "file") {
                                try {
                                    // Upload file trước để lấy token
                                    logger.info(
                                        `[Lead Service] Đang upload file: ${media.name}`
                                    );
                                    const fileToken = await uploadZaloFile(
                                        media.url,
                                        media.name,
                                        accessToken
                                    );

                                    // Sau đó gửi file sử dụng token
                                    await sendZaloFile(
                                        leadUID,
                                        fileToken,
                                        media.name,
                                        accessToken
                                    );
                                    logger.info(
                                        `Đã gửi file đến Lead [${leadUID}]: ${media.name}`
                                    );
                                } catch (uploadError) {
                                    // Gửi thông báo cho Lead về file không thể upload
                                    logger.warn(
                                        `[Lead Service] Không thể upload file ${media.name}: ${uploadError.message}`
                                    );

                                    try {
                                        await sendZaloMessage(
                                            leadUID,
                                            `[CẦN XỬ LÝ 🆘] Khách hàng đã gửi file "${media.name}" nhưng định dạng không được hỗ trợ để tự động xử lý ➡️ Vui lòng truy cập trang Quản lý OA để tải xuống file này`,
                                            accessToken
                                        );
                                    } catch (notifyError) {
                                        logger.error(
                                            `Lỗi khi gửi thông báo:`,
                                            notifyError.message
                                        );
                                    }
                                }
                            }
                        } catch (mediaError) {
                            logger.error(
                                `Lỗi khi gửi media đến Lead [${leadUID}]: ${mediaError.message}`
                            );
                        }
                    }
                }

                return { leadUID, success: true };
            } catch (error) {
                logger.error(
                    `Lỗi khi gửi thông tin đến Lead [${leadUID}]:`,
                    error.message
                );
                return { leadUID, success: false, error: error.message };
            }
        });

        const results = await Promise.all(sendPromises);

        // Kiểm tra kết quả gửi
        const successCount = results.filter((result) => result.success).length;
        const failCount = results.length - successCount;

        logger.info(
            `Gửi thông tin khách hàng: ${successCount} thành công, ${failCount} thất bại`
        );

        if (successCount > 0) {
            // Đánh dấu SĐT này đã được gửi thành công nếu có ít nhất 1 Lead nhận được
            conversationService.setLeadSent(UID, phoneNumberSent);

            // Xóa cache media sau khi gửi thành công
            clearCustomerMedia(UID);
        }

        if (failCount === results.length) {
            // Nếu tất cả đều thất bại
            throw new Error("Không thể gửi thông tin đến bất kỳ Lead nào");
        }

        return results;
    } catch (error) {
        logger.error(`Lỗi nghiêm trọng khi gửi thông tin Lead:`, error.message);
        throw new Error("Failed to send lead info");
    }
};

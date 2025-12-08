import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION_RESPONSE } from "../promts/promt.v8.response.js";
import logger from "../utils/logger.js";
import { notifyAdminQuotaExceeded, notifyAdminSendMessageError } from "../utils/adminNotification.js";
import apiKeyManager from "../utils/apiKeyManager.js";

// (Giữ nguyên createChatSessionService)
export const createChatSessionService = (apiKey, model) => {
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
        model: model || "gemini-2.5-flash-lite", // Default model nếu undefined
        config: {
            systemInstruction: SYSTEM_INSTRUCTION_RESPONSE,
        },
    });
    return chat;
};

// (Giữ nguyên getOrCreateChatSession)
const chatSessions = new Map(); // Lưu trữ các phiên chat theo UID người dùng
const getOrCreateChatSession = async (UID) => {
    if (chatSessions.has(UID)) {
        // Nếu người dùng đã tồn tại session chat => tiến hành truy xuất tiếp và xử lý với UID
        logger.info(`[Chat Service] Đang lấy SESSION cho [${UID}]`);
        return chatSessions.get(UID);
    }

    // Nếu người dùng chưa tồn tại session chat => thực hiện tạo mới session chat với UID
    logger.info(`[Chat Service] Tạo SESSION MỚI cho [${UID}]`);
    const { api_key, model } = await apiKeyManager.getCurrentUsingKey();
    const newChatSession = createChatSessionService(api_key, model);
    chatSessions.set(UID, { session: newChatSession, api_key, model });
    return chatSessions.get(UID);
};

// *** ĐÂY LÀ PHẦN QUAN TRỌNG ĐƯỢC CẬP NHẬT ***
export const handleChatService = async (
    userMessage,
    UID,
    accessToken = null
) => {
    let attempts = 0;
    const maxAttempts = 3; // Thử tối đa 3 lần với các API key khác nhau

    while (attempts < maxAttempts) {
        const chatData = await getOrCreateChatSession(UID);
        const { session: chatSession, api_key, model } = chatData;

        try {
            const responseFromAI = await chatSession.sendMessage({
                // Gửi tin nhắn của user đến Gemini AI
                message: userMessage,
            });

            if (
                responseFromAI &&
                responseFromAI.candidates?.[0]?.content?.parts?.[0]?.text
            ) {
                // Trả về text nếu thành công
                return responseFromAI.candidates[0].content.parts[0].text;
            } else {
                // Trường hợp AI trả về rỗng hoặc bị chặn (lỗi "cứng")
                logger.warn(
                    `[AI Warning] Phản hồi rỗng/bị chặn cho [${UID}] với model ${model}`
                );
                return "Dạ, hệ thống đang bảo trì tạm thời. Anh/chị vui lòng để lại số điện thoại để em chuyển tiếp đến bộ phận kinh doanh hỗ trợ trực tiếp mình ạ.";
            }
        } catch (error) {
            attempts++;
            logger.error(
                `[AI Error] Lỗi khi gọi Gemini cho user ${UID} với model ${model} (attempt ${attempts}):`,
                {
                    message: error.message,
                    status: error.status,
                    code: error.code,
                }
            );

            const errorMessage = error.message || "";
            const errorStatus =
                error.status || error.response?.status || error.code;
            const errorObject = error.error || error;

            // KIỂM TRA LỖI 429 (QUOTA EXCEEDED) - CHUYỂN SANG KEY TIẾP THEO
            if (
                errorStatus === 429 ||
                errorStatus === "429" ||
                errorObject?.code === 429 ||
                (errorMessage && errorMessage.includes("RESOURCE_EXHAUSTED")) ||
                (errorMessage && errorMessage.includes("quota exceeded")) ||
                (error && error.status === "RESOURCE_EXHAUSTED")
            ) {
                logger.warn(
                    `[AI Error] Quota exceeded cho model ${model}, chuyển sang API key tiếp theo (attempt ${attempts})`
                );

                if (attempts < maxAttempts) {
                    // Chuyển sang key tiếp theo và tạo session mới
                    const newKey = await apiKeyManager.switchToNextKey();
                    chatSessions.delete(UID);
                    const newChatSession = createChatSessionService(
                        newKey.api_key,
                        newKey.model
                    );
                    chatSessions.set(UID, {
                        session: newChatSession,
                        api_key: newKey.api_key,
                        model: newKey.model,
                    });
                    continue;
                } else {
                    // Đã thử hết, gửi thông báo cho admin
                    if (accessToken) {
                        try {
                            await notifyAdminQuotaExceeded(
                                UID,
                                error,
                                accessToken
                            );
                        } catch (notifyError) {
                            logger.error(
                                `[AI Error] Không thể gửi thông báo cho ADMIN:`,
                                notifyError.message
                            );
                        }
                    }
                    return "Dạ, hệ thống đang bảo trì tạm thời. Anh/chị vui lòng để lại số điện thoại để em chuyển tiếp đến bộ phận kinh doanh hỗ trợ trực tiếp mình ạ.";
                }
            }

            // KIỂM TRA LỖI 503 (HOẶC LỖI MẠNG) - RETRY VỚI CÙNG API KEY
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
                    `[AI Error] Lỗi ${
                        errorStatus || "mạng"
                    } (Quá tải yêu cầu || Mất kết nối). YÊU CẦU THỬ LẠI.`
                );
                throw new Error(
                    `Lỗi ${
                        errorStatus || "mạng"
                    } (Quá tải yêu cầu || Mất kết nối). Sẽ thử lại tiến trình công việc ...`
                );
            }

            // Các lỗi khác (400, 401...) là lỗi "cứng", không retry, trả về mặc định
            logger.warn(
                `[AI Error] Lỗi không retry (${errorStatus}), trả về message mặc định`
            );
            await notifyAdminSendMessageError(UID, error, accessToken);
            return "Dạ, anh/chị vui lòng đợi chút để em kết nối lại với bộ phận kinh doanh hỗ trợ mình ạ.";
        }
    }
};

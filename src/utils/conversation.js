import logger from "./logger.js";

/**
 * Trạng thái của service, được "ẩn" (private) bên trong module này.
 * Biến này sẽ nằm trong BỘ NHỚ RAM của ứng dụng.
 */
const conversations = new Map();
const sentLeadsPhone = new Map(); // <-- MỚI: Lưu SĐT của lead đã gửi
const maxHistoryLength = 30;

/**
 * Lấy lịch sử trò chuyện cho một người dùng.
 */
const getConversationHistory = (UID) => {
    return conversations.get(UID) || [];
};

/**
 * Thêm một tin nhắn vào lịch sử của người dùng.
 */
const addMessage = (UID, role, message) => {
    if (!conversations.has(UID)) {
        conversations.set(UID, []);
    }

    const history = conversations.get(UID);
    const messageEntry = {
        role,
        message,
        timestamp: new Date().toISOString(),
    };

    history.push(messageEntry); // Giới hạn độ dài lịch sử

    if (history.length > maxHistoryLength) {
        history.splice(0, history.length - maxHistoryLength);
    }

    return history;
};

/**
 * Lấy lịch sử đã định dạng (string).
 */
const getFormattedHistory = (UID) => {
    const history = getConversationHistory(UID);
    return history.map((entry) => `${entry.role}: ${entry.message}`).join("\n");
};

/**
 * Xóa lịch sử của một người dùng.
 * (Hữu ích nếu bạn muốn "xóa sau khi lấy thông tin")
 */
const clearHistory = (UID) => {
    conversations.delete(UID);
};

/**
 * Đếm số lượng cuộc trò chuyện đang hoạt động (có trong bộ nhớ).
 */
const getActiveConversationsCount = () => {
    return conversations.size;
};

// --- CÁC HÀM MỚI ĐỂ GIẢI QUYẾT BÀI TOÁN ---

/**
 * [MỚI] Đánh dấu UID này đã được gửi thông tin Lead với SĐT cụ thể.
 * Hàm này sẽ được gọi bởi informationForwardingSynthesisService.
 */
const setLeadSent = (UID, phoneNumber) => {
    if (!phoneNumber) return;
    sentLeadsPhone.set(UID, phoneNumber);
    logger.info(`[ConvService] Đã set SĐT ${phoneNumber} cho UID ${UID}`);
};

/**
 * [MỚI] Kiểm tra SĐT đã gửi trước đó cho UID này.
 * Hàm này sẽ được gọi bởi worker.js TRƯỚC KHI gửi lead.
 * @returns {string | null} Trả về SĐT (string) nếu có, hoặc null nếu chưa.
 */
const getSentLeadPhone = (UID) => {
    return sentLeadsPhone.get(UID) || null;
};

// --- HẾT PHẦN MỚI ---

/**
 * Tập hợp tất cả các hàm thành một đối tượng "service" duy nhất.
 */
const conversationService = {
    getConversationHistory,
    addMessage,
    getFormattedHistory,
    clearHistory,
    getActiveConversationsCount,
    setLeadSent, // <-- MỚI
    getSentLeadPhone, // <-- MỚI
};

/**
 * Export đối tượng service để các file khác có thể import và sử dụng.
 */
export default conversationService;
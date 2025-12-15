import axios from "axios";
import logger from "../utils/logger.js";

const ZALO_API = process.env.ZALO_API_BASE_URL;

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
/**
 * Trích xuất và chuẩn hóa các SĐT di động (10 số) của Việt Nam từ một chuỗi.
 * Hàm này xử lý các định dạng có dấu cách, chấm, gạch ngang, và ngoặc.
 *
 * @param {string} messageFromUser Chuỗi đầu vào để tìm kiếm SĐT.
 * @returns {string[]} Một mảng chứa các SĐT đã được chuẩn hóa (loại bỏ ký tự rác),
 * hoặc mảng rỗng ([]) nếu không tìm thấy hoặc đầu vào không hợp lệ.
 */
export const extractPhoneNumber = (messageFromUser) => {
  // 1. Kiểm tra đầu vào: Trả về mảng rỗng nếu không hợp lệ.
  // Điều này đảm bảo hàm *luôn* trả về một kiểu dữ liệu (Array).
  if (typeof messageFromUser !== "string" || messageFromUser.length === 0) {
    return [];
  }

  // 2. Tối ưu Regex:
  // Regex này cho phép các ký tự phân cách như cách, chấm, gạch ngang, ngoặc.
  // [\s.-()]* : Cho phép 0 hoặc nhiều ký tự phân cách (space, dot, dash, parentheses).
  // (?:...)   : Là một "non-capturing group", giúp nhóm mà không tạo ra một "capture".
  // [35789]   : Các đầu số di động 10 số (03x, 05x, 07x, 08x, 09x).
  // (?:[\s.-()]*\d){8} : 8 cặp (ký tự phân cách + 1 chữ số) tiếp theo.
  const phoneRegex = /\b((?:0|\+84|84)[\s.\-()]*[35789](?:[\s.\-()]*\d){8})\b/g;

  // 3. Thực hiện trích xuất
  const matches = messageFromUser.match(phoneRegex);

  // 4. Xử lý và chuẩn hóa kết quả
  if (matches) {
    // `matches` là một mảng các SĐT còn "rác" (ví dụ: ["(090) 123-4567", "84.987.654.321"])
    return matches.map((phone) => {
      // Loại bỏ tất cả các ký tự không phải là số (hoặc dấu +)
      // Cách đơn giản nhất là loại bỏ các ký tự phân cách đã cho phép
      return phone.replace(/[\s.\-()]/g, "");
    });
  } else {
    return [];
  }
};
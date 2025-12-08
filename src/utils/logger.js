import winston from "winston";
import "winston-daily-rotate-file";
import dotenv from "dotenv";

dotenv.config();

// Destructuring các hàm định dạng từ winston.format để sử dụng dễ hơn
const { combine, timestamp, printf, colorize } = winston.format;

// Định dạng log tùy chỉnh: hiển thị thời gian, cấp độ log và tin nhắn
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// Tạo một instance của logger
const logger = winston.createLogger({
  // Cấp độ log mặc định: 'debug' trong môi trường phát triển, 'info' trong môi trường production
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  // Kết hợp các định dạng: thêm timestamp và sử dụng định dạng tùy chỉnh đã tạo
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Định dạng thời gian cho log
    logFormat
  ),
  transports: [
    // Transport cho Console: log sẽ được hiển thị trên terminal
    new winston.transports.Console({
      // Định dạng cho console: thêm màu sắc và sử dụng logFormat
      format: combine(
        colorize(), // Tô màu cho log trên console để dễ đọc
        logFormat
      ),
      // Cấp độ log cho console: tương tự cấp độ mặc định của logger
      level: process.env.NODE_ENV === "development" ? "debug" : "info",
    }),

    // Transport để ghi các log lỗi vào file riêng, xoay vòng hàng ngày
    new winston.transports.DailyRotateFile({
      filename: "logs/error-%DATE%.log", // Tên file log lỗi (ví dụ: error-2023-07-08.log)
      datePattern: "YYYY-MM-DD", // Mẫu ngày để xoay vòng file
      zippedArchive: true, // Nén các log file cũ để tiết kiệm dung lượng
      maxSize: "20m", // Kích thước tối đa của mỗi log file trước khi tạo file mới
      maxFiles: "14d", // Giữ các log file trong 14 ngày
      level: "error", // Chỉ ghi các log có cấp độ 'error'
    }),

    // Transport để ghi tất cả các log (từ cấp độ 'info' trở lên) vào một file tổng hợp, xoay vòng hàng ngày
    new winston.transports.DailyRotateFile({
      filename: "logs/combined-%DATE%.log", // Tên file log tổng hợp (ví dụ: combined-2023-07-08.log)
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "info", // Ghi tất cả log từ cấp độ 'info' trở lên (info, warn, error)
    }),
  ],
  // Xử lý các lỗi không được bắt (uncaught exceptions) để ghi vào file riêng
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),

    new winston.transports.Console({
      // Tái sử dụng định dạng để log ra console cho đẹp
      format: combine(colorize(), logFormat),
    }),
  ],

  // Xử lý các Promise bị từ chối không được xử lý (unhandled rejections) để ghi vào file riêng
  rejectionHandlers: [
    new winston.transports.File({ filename: "logs/rejections.log" }),
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
});

export default logger;
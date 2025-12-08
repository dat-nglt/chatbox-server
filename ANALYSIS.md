# Phân Tích Toàn Bộ Quy Trình Tiếp Nhận & Phân Tích Tin Nhắn

## 📋 Tổng Quan Hệ Thống

Hệ thống chatbox Zalo này là một pipeline xử lý tin nhắn theo thời gian thực (real-time), kết hợp:
- **Webhook Zalo** để tiếp nhận sự kiện
- **Message Queue (BullMQ)** để debounce và xử lý bất đồng bộ
- **Google Gemini AI** để phân tích và trả lời
- **Redis** để lưu trữ trạng thái tạm thời

---

## 🔄 Quy Trình Chi Tiết: 5 Giai Đoạn

### **Giai Đoạn 1: Tiếp Nhận Webhook từ Zalo**
**File:** `src/controllers/webhook.controller.js`

```
Zalo API → Webhook Handler → Kiểm Tra UID → Xây Dựng Message → Redis
```

#### Chi tiết:
1. **Nhận sự kiện Zalo** → Trích xuất:
   - `UID`: User ID của người gửi tin nhắn
   - `messageText`: Nội dung tin nhắn text
   - `eventName`: Loại sự kiện (`user_send_text`, `user_send_image`, `user_send_file`)
   - `attachments`: Hình ảnh/file đính kèm

2. **Kiểm tra UID được phép** (`ALLOWED_UID`):
   ```javascript
   const ALLOWED_UID = ["7365147034329534561"];
   ```
   - ⚠️ **Vấn đề**: Whitelist cứng trong code, khó mở rộng
   - 💡 **Khuyến cáo**: Lưu vào database để quản lý linh hoạt

3. **Xây dựng message từ nhiều nguồn**:
   - Text + Hình ảnh: `[Hình ảnh 1]: <URL>`
   - Text + File: `[File 1]: <fileName> (<size> bytes) - <URL>`
   - Kết hợp cả ba

4. **Lưu vào Redis** (cache tạm):
   ```javascript
   await redisClient.rpush(pendingMessageKey, messageFromUser);
   ```

#### ✅ Ưu Điểm:
- Xử lý đa loại attachment (text, image, file)
- Whitelist bảo mật
- Trả response nhanh cho Zalo (không blocking)

#### ⚠️ Vấn Đề & Cải Thiện:

| Vấn Đề | Mức Độ | Giải Pháp |
|--------|--------|----------|
| UID whitelist cứng | 🟠 Trung Bình | Chuyển sang database, thêm config động |
| Không validate dung lượng file | 🔴 Cao | Thêm kiểm tra size trước khi lưu vào Redis |
| Message có thể lỗi encoding | 🟡 Thấp | Thêm sanitize UTF-8 |
| Không có rate limiting | 🟠 Trung Bình | Thêm throttle per UID |

---

### **Giai Đoạn 2: Debounce & Queue Management**
**File:** `src/controllers/webhook.controller.js` + `src/chats/queue.service.js`

```
Webhook → Redis Storage → Debounce Job (20s delay) → BullMQ Queue
```

#### Chi tiết:
1. **Debounce Logic** (Gộp tin nhắn):
   - Delay mặc định: **20 giây**
   - Nếu user gửi tin mới trong 20s → xóa job cũ, tạo job mới
   - Mục đích: Tránh xử lý multiple requests cho cùng 1 UID

   ```javascript
   const DEBOUNCE_DELAY = 20000; // 20 giây
   const debounceJobId = `debounce-job-${UID}`;
   
   // Tìm job cũ
   const existingJob = await zaloChatQueue.getJob(debounceJobId);
   if (existingJob && (await existingJob.isDelayed())) {
       await existingJob.remove(); // Xóa job cũ
   }
   
   // Tạo job mới
   const newJob = await zaloChatQueue.add(
       "process-message",
       { UID: UID, isDebounced: true },
       { jobId: debounceJobId, delay: DEBOUNCE_DELAY }
   );
   ```

2. **Queue Configuration** (BullMQ):
   ```javascript
   {
       attempts: 5,           // Thử lại 5 lần
       backoff: "exponential", // 5s → 10s → 20s → 40s → 80s
       removeOnComplete: true  // Tự động xóa khi hoàn thành
   }
   ```

#### ✅ Ưu Điểm:
- Giảm tải server qua debounce
- Retry logic thông minh với exponential backoff
- Automatic cleanup

#### ⚠️ Vấn Đề & Cải Thiện:

| Vấn Đề | Mức Độ | Giải Pháp |
|--------|--------|----------|
| Delay 20s cứng | 🟠 Trung Bình | Config từ .env cho flexibility |
| Không có circuit breaker | 🟠 Trung Bình | Thêm điều kiện dừng nếu error > X% |
| Redis expire key quá ngắn (3600s) | 🟡 Thấp | Xem xét dựa trên volume user |

---

### **Giai Đoàn 3: Worker Xử Lý Job từ Queue**
**File:** `worker.js`

```
BullMQ Worker → Lấy Messages từ Redis → AI Phân Tích → Kiểm Tra Data
```

#### Chi tiết:
1. **Lấy messages từ Redis**:
   ```javascript
   const messages = await redisClient.lrange(pendingMessageKey, 0, -1);
   const messageFromUser = messages.join(", "); // Gộp tất cả
   ```

2. **Cập nhật timestamp**:
   ```javascript
   await updateLastReceivedTime(redisClient, UID);
   ```

3. **Lấy Access Token Zalo** (để xác thực khi gọi API):
   ```javascript
   const accessToken = await getValidAccessToken();
   if (!accessToken) throw new Error("No valid access token");
   ```

4. **Thêm tin nhắn vào Conversation History** (lưu bộ nhớ):
   ```javascript
   conversationService.addMessage(UID, "user", messageFromUser);
   ```

#### ✅ Ưu Điểm:
- Pipeline rõ ràng từ queue → worker
- Cộng gộp multiple messages thành một

#### ⚠️ Vấn Đề & Cải Thiện:

| Vấn Đề | Mức Độ | Giải Pháp |
|--------|--------|----------|
| Conversation lưu RAM (mất khi restart) | 🔴 Cao | **Quan Trọng**: Migrate sang Redis/DB |
| Không kiểm tra token expiry | 🟠 Trung Bình | Thêm token refresh logic |
| Không có timeout cho từng step | 🟠 Trung Bình | Thêm Promise.race() với timeout |

---

### **Giai Đoàn 4: Phân Tích Tin Nhắn & Trích Xuất Data**
**File:** `src/chats/analyze.service.js`

```
Message → AI Analyze → Extract Phone/Name/Intent → JSON Response
```

#### Chi tiết:

1. **Trích xuất số điện thoại** (Regex):
   ```javascript
   const phoneNumberFromUser = extractPhoneNumber(messageFromUser);
   // Regex pattern để tìm SĐT Việt Nam
   ```

2. **Lấy tên hiển thị người dùng**:
   ```javascript
   const latestMessageFromUID = await extractDisplayNameFromMessage(UID, accessToken);
   ```

3. **Xây dựng Prompt cho AI**:
   - Bao gồm: Lịch sử hội thoại + tin nhắn mới + thông tin đã biết
   - AI được yêu cầu trả lại JSON với cấu trúc:
     ```json
     {
       "nhuCau": "Hỏi về giá sản phẩm",
       "tenKhachHang": "Anh Minh",
       "soDienThoai": "0912345678",
       "mucDoQuanTam": "Cao",
       "daDuThongTin": true,
       "lyDo": ""
     }
     ```

4. **Lưu trữ Attachments**:
   - **Hình ảnh**: Regex tìm `[Hình ảnh X]: <URL>` → lưu vào `imageCache`
   - **File**: Regex tìm `[File X]: <name> (<size>) - <URL>` → lưu vào `imageCache`

5. **Gọi AI (với Retry)**:
   - Max attempts: **8 lần**
   - Chuyển key nếu quota exceeded (Error 429)
   - Ném lỗi nếu lỗi mạng (Error 503)

#### ✅ Ưu Điểm:
- Phân tích thông minh dựa trên context
- Hỗ trợ multiple attachments
- Retry với key rotation

#### ⚠️ Vấn Đề & Cải Thiện:

| Vấn Đề | Mức Độ | Giải Pháp |
|--------|--------|----------|
| **Lịch sử hội thoại bị mất khi restart** | 🔴 Cao | **Ưu Tiên 1**: Persist conversations vào DB |
| Max 30 messages trong lịch sử | 🟠 Trung Bình | Config dynamic hoặc per-conversation |
| Regex phone number có thể miss SĐT nước ngoài | 🟡 Thấp | Thêm regex cho international format |
| AI prompt không tối ưu cho context dài | 🟠 Trung Bình | Summarize lịch sử thay vì full history |
| Không validate JSON response từ AI | 🟠 Trung Bình | Thêm try-catch + schema validation |

---

### **Giai Đoàn 5: Quyết Định & Gửi Lead / Response**
**File:** `worker.js`

```
Analyze Result → Check Phone Duplicate → Send Lead/Sheet → Send AI Response → Setup Reminder
```

#### Chi tiết:

1. **Kiểm tra dữ liệu đủ**: 
   ```javascript
   if (jsonData && jsonData.soDienThoai && jsonData.nhuCau)
   ```

2. **Kiểm tra SĐT đã gửi trước**:
   ```javascript
   const previouslySentPhone = conversationService.getSentLeadPhone(UID);
   if (previouslySentPhone === jsonData.soDienThoai) {
       // Bỏ qua, không gửi lại
   } else {
       // Gửi thông tin lead
   }
   ```

3. **Gửi Lead** (nếu SĐT mới):
   - Ghi vào **Google Sheet**: `appendJsonToSheet("data-from-chatbox-ai", jsonData)`
   - Thông báo cho **Admin** qua Zalo: 
     ```
     🔔 THÔNG TIN KHÁCH HÀNG MỚI
     👤 Tên khách hàng: ...
     📞 Số điện thoại: ...
     💼 Nhu cầu: ...
     ⭐ Mức độ quan tâm: ...
     ```
   - Đánh dấu vào Redis: `has-phone-${UID} = "true"`

4. **Gọi AI để trả lời**:
   ```javascript
   const messageFromAI = await handleChatService(messageFromUser, UID, accessToken);
   ```

5. **Gửi phản hồi AI về Zalo**:
   ```javascript
   await sendZaloMessage(UID, messageFromAI, accessToken);
   ```

6. **Thiết lập Reminder** (chỉ nếu chưa có phone):
   ```javascript
   const hasPhone = await redisClient.get(`has-phone-${UID}`);
   if (hasPhone !== "true") {
       await setupReminderJob(redisClient, UID, zaloChatQueue);
   }
   ```

#### ✅ Ưu Điểm:
- Logic rõ ràng: Lead → Response → Reminder
- Tránh gửi duplicate lead cho cùng 1 phone
- Sheet integration để track leads

#### ⚠️ Vấn Đề & Cải Thiện:

| Vấn Đề | Mức Độ | Giải Pháp |
|--------|--------|----------|
| **Phone duplicate tracking bị mất khi restart** | 🔴 Cao | **Ưu Tiên 1**: Persist `sentLeadsPhone` vào Redis |
| Google Sheet error không block flow | 🟠 Trung Bình | Thêm retry/fallback DB nếu sheet fail |
| Không có tracking sent vs delivered | 🟠 Trung Bình | Thêm delivery tracking |
| Reminder logic ẩu nơi riêng | 🟡 Thấp | Document `reminder.service.js` logic |

---

## 🎯 Quy Trình Hoàn Chỉnh (Flow Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│ 1️⃣ WEBHOOK ZALO RECEIVES MESSAGE                           │
│    (webhook.controller.js)                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2️⃣ VALIDATE & FILTER                                       │
│    ✓ Check UID is ALLOWED_UID                              │
│    ✓ Check eventName is valid                              │
│    ✓ Build message (text + images + files)                 │
│    ✓ Save to Redis                                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3️⃣ DEBOUNCE & QUEUE (20 seconds)                           │
│    ✓ Remove old job for UID                                │
│    ✓ Create new delayed job (20s)                          │
│    ✓ If new message comes → remove old, create new         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
       ┌─────────────────┐
       │   WAIT 20 SECS  │
       └────────┬────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│ 4️⃣ WORKER PICKS UP JOB FROM QUEUE                          │
│    ✓ Get all messages from Redis                           │
│    ✓ Update last received time                             │
│    ✓ Add to conversation history                           │
│    ✓ Get valid Zalo access token                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5️⃣ AI ANALYZE MESSAGE (analyze.service.js)                │
│    ✓ Extract phone number (regex)                          │
│    ✓ Get customer display name                             │
│    ✓ Build AI prompt with context                          │
│    ✓ Call Gemini AI (max 8 attempts)                       │
│    ✓ Parse JSON response                                   │
│    ✓ Store attachments (images/files)                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Has Phone & Intent? │
        └──┬──────────────┬──┘
       YES│              │NO
          ▼              ▼
    ┌──────────────┐  ┌──────────────┐
    │  CHECK       │  │ Set Flag:    │
    │  DUPLICATE?  │  │ has-phone=NO │
    └──┬──────┬───┘  └──────────────┘
     YES│      │NO
        ▼      ▼
    SKIP    SEND LEAD
            ▼
        ┌──────────────────────┐
        │ • Append to Sheet    │
        │ • Send to Admin      │
        │ • Mark Redis flag    │
        │ • Store phone number │
        └──────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────┐
    │ 6️⃣ AI RESPONSE (chatbox.service.js)   │
    │    ✓ Get/Create chat session          │
    │    ✓ Call Gemini with user message    │
    │    ✓ Handle quota/network errors      │
    │    ✓ Return response                  │
    └──────────────┬──────────────────────────┘
                   │
                   ▼
    ┌────────────────────────────────────────┐
    │ 7️⃣ SEND RESPONSE BACK TO USER          │
    │    ✓ Send message via Zalo API        │
    │    ✓ Add to conversation history      │
    │    ✓ Log completion                   │
    └──────────────┬──────────────────────────┘
                   │
                   ▼
    ┌────────────────────────────────────────┐
    │ 8️⃣ SETUP REMINDER (if no phone)       │
    │    ✓ Check has-phone flag             │
    │    ✓ If NO: schedule reminder job     │
    │    ✓ If YES: skip reminder            │
    └────────────────────────────────────────┘
```

---

## 📊 Các Thực Thể Dữ Liệu Chính

### **1. Message Workflow**
```
User Message → Redis List (pending-msgs-${UID})
              → Combine into single string
              → AI Analysis
              → Extract: [phone, name, intent, interest]
              → Decision: Send Lead or Skip
```

### **2. Data Storage Tạm Thời (RAM - NGUY HIỂM!)**
```javascript
// Lưu trong conversation.js
conversations = new Map({
  [UID]: [
    { role: "user", message: "...", timestamp: "..." },
    { role: "model", message: "...", timestamp: "..." }
  ]
})

sentLeadsPhone = new Map({
  [UID]: "0912345678"  // Phone of last sent lead
})

// chatbox.service.js
chatSessions = new Map({
  [UID]: { session: chatSession, api_key: "...", model: "..." }
})
```

### **3. Data Storage Redis (Tốt hơn)**
```
pending-msgs-${UID}    → List[string]      (messages chờ xử lý)
has-phone-${UID}       → "true" | "false"  (đã trích xuất phone?)
debounce-job-${UID}    → BullMQ Job        (job delay 20s)
```

### **4. Data Storage Google Sheet**
```
data-from-chatbox-ai → {
  tenKhachHang,
  soDienThoai,
  nhuCau,
  mucDoQuanTam,
  daDuThongTin,
  lyDo
}
```

---

## 🚨 Những Vấn Đề Quan Trọng Nhất

### **🔴 CRITICAL - Phải Sửa:**

1. **Conversation History Bị Mất Khi Restart**
   - Vị trí: `src/utils/conversation.js`
   - Hiện tại: Lưu trong Map (RAM)
   - **Ảnh hưởng**: Toàn bộ context mất → AI không có context cũ
   - **Giải pháp**: 
     ```javascript
     // Thay vì Map, lưu vào Redis hoặc Database
     const conversationKey = `conversation:${UID}`;
     await redisClient.lpush(conversationKey, JSON.stringify(message));
     ```

2. **Phone Duplicate Tracking Bị Mất**
   - Vị trí: `src/utils/conversation.js` (Map `sentLeadsPhone`)
   - Hiện tại: Lưu RAM
   - **Ảnh hưởng**: Gửi lại lead cho cùng số điện thoại
   - **Giải pháp**: 
     ```javascript
     // Lưu vào Redis
     await redisClient.set(`sent-lead-phone:${UID}`, phoneNumber, 'EX', 86400);
     ```

3. **Chat Session Bị Mất**
   - Vị trí: `src/chats/chatbox.service.js` (Map `chatSessions`)
   - Hiện tại: Lưu RAM
   - **Ảnh hưởng**: Bị reset context từ Gemini
   - **Giải pháp**: Có thể chấp nhận (context mới tạo), nhưng nên log để aware

### **🟠 HIGH - Nên Sửa:**

4. **Whitelist UID Cứng Trong Code**
   ```javascript
   const ALLOWED_UID = ["7365147034329534561"]; // ❌ Cứng!
   ```
   - Giải pháp: Lưu vào database, thêm API để manage

5. **Không Có Timeout cho AI Calls**
   ```javascript
   const responseFromAI = await chatSession.sendMessage({...});
   // Có thể hang vô thời hạn
   ```
   - Giải pháp:
     ```javascript
     const timeout = Promise.race([
       chatSession.sendMessage({...}),
       new Promise((_, reject) => 
         setTimeout(() => reject(new Error('Timeout')), 30000)
       )
     ]);
     ```

6. **Error Handling Không Đầy Đủ**
   - Google Sheet error không block, nhưng cũng không retry
   - Admin notification có thể fail âm thầm
   - Giải pháp: Add fallback mechanism

### **🟡 MEDIUM - Có Thể Cải Thiện:**

7. **Debounce Delay Cứng (20s)**
   - Giải pháp: Config từ .env

8. **Max history 30 messages**
   - Giải pháp: Dynamic config hoặc per-conversation

9. **Không có Circuit Breaker**
   - Nếu AI service down, vẫn gửi requests liên tục
   - Giải pháp: Thêm circuit breaker pattern

---

## 💡 Khuyến Cáo Tối Ưu Hóa

### **Priority 1: Data Persistence**
```
RAM (nguy hiểm) → Redis (tốt) → Database (tốt nhất)

conversation.js:
  - conversations Map → Redis sorted sets
  - sentLeadsPhone Map → Redis string keys
  - chatSessions Map → OK ở RAM (session tạo mới nhanh)

Time: 2-3 hours | Impact: Very High
```

### **Priority 2: Add Monitoring & Logging**
```
Current: Info/Warn/Error logs
Better: + metrics (processing time, error rate, queue depth)
        + alerts (if queue depth > X, if error rate > Y%)

Time: 1-2 hours | Impact: High
```

### **Priority 3: Configuration Externalize**
```
Current: Hardcoded values (DEBOUNCE_DELAY, ALLOWED_UID, retry times)
Better: All in .env or config file

Time: 30 mins | Impact: Medium
```

### **Priority 4: Error Handling**
```
Add for:
- AI calls timeout handling
- Google Sheet write failure fallback
- Admin notification retry
- Graceful degradation

Time: 2 hours | Impact: High
```

---

## 📈 Performance Metrics Để Monitor

| Metric | Target | Alert |
|--------|--------|-------|
| Message Processing Time | < 30s | > 60s |
| AI Response Time | < 20s | > 40s |
| Queue Depth | < 100 | > 500 |
| Error Rate | < 1% | > 5% |
| Redis Connection | Healthy | Disconnected |
| Gemini API Quota | < 80% | > 90% |

---

## 🎓 Kết Luận

**Hệ thống này tốt về:**
- ✅ Architecture (webhook → queue → worker)
- ✅ Error handling (retry logic, key rotation)
- ✅ User experience (debounce, async processing)

**Nhưng nguy hiểm ở:**
- ❌ **Data persistence** (toàn bộ lịch sử mất khi restart)
- ❌ **Configuration** (hardcoded values)
- ❌ **Monitoring** (không biết service health)

**Khuyến cáo hành động:**
1. **Ngay lập tức**: Migrate conversation history to Redis
2. **Trong vòng 1-2 tuần**: Add comprehensive monitoring
3. **Trong vòng 1 tháng**: Externalize all config, improve error handling

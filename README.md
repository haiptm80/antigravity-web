---
description: 
---

# 🛡️ FPT QA Agent — Offline Data Cleaning Web App (V8.0 Ultimate Master)

**Phiên bản:** V8.0 (Bản Hoàn Thiện - Tích hợp Đối soát Tọa độ Liên cấp)
**Mô hình:** Client-side Web Application (HTML/JS/CSS)
**Công nghệ lõi:** SheetJS, Danfo.js, TailwindCSS
READ ME.md
Phần mềm tiện ích dạng Offline Web App (xử lý cục bộ 100% trên RAM trình duyệt) được định hình như một "Kỹ sư phần mềm kiêm Chuyên gia QA". Công cụ giúp tự động hóa quy trình làm sạch dữ liệu, phân loại khối lớp, quy đổi giờ giảng và đối soát chéo lịch dạy thay/đổi tiết đa cấp học một cách chính xác tuyệt đối theo chuẩn ISO của FPT Education.

---

## 📂 1. TỔ CHỨC DỮ LIỆU (DIRECTORY STRUCTURE)
Công cụ được thiết kế gói gọn theo nguyên tắc **Single File Application**, đảm bảo tính bảo mật và vận hành khép kín (The FPT Education Cleanroom):

[Dự_Án_Agent_Gio_Giang]/
├── 01_Inputs/          # Nơi thả các file thô (⚠️ Tuyệt đối không sửa format gốc)
│   ├── FSCHNA_GG_TH.xlsx
│   ├── FSCHNA_GG_THCS_THPT.xlsx
│   └── Doi tiet_Day thay.xlsx
├── 02_Process/         # Chứa lõi Web App
│   └── index.html      # File chạy duy nhất chứa toàn bộ Logic (Danfo.js) & UI (Tailwind)
├── 03_Outputs/         # Nơi lưu các file Báo cáo tổng hợp tải về từ Web App
└── start_agent.bat     # Click 1 lần để tự động mở index.html trên trình duyệt

---

## 🛠️ 2. TÍNH NĂNG CÔNG NGHỆ ĐỘC QUYỀN
* **Xử lý Liên Cấp (Cross-Level Merging):** Tự động gộp dữ liệu Tiểu học và Trung học thành Dataframe hệ thống duy nhất trước khi xử lý, đảm bảo không bỏ sót quỹ giờ của GV dạy liên cấp.
* **Smart Class Splitting:** Tự động bóc tách các lớp ghép (VD: `4A1, 4A2`) thành từng dòng riêng biệt, giúp hệ thống mapping chính xác 100% tọa độ tiết học.
* **Class-Based Regex:** Khả năng nhận diện giờ Câu lạc bộ, Đội tuyển trực tiếp từ chuỗi "Lớp" thay vì "Môn học", giải quyết triệt để lỗi nhập liệu.
* **Deep Cross-Check Tọa độ:** Truy xuất tọa độ theo khóa phức hợp `(Ngày + Tiết + Lớp)` và đối chiếu từ vựng chuẩn `Account GV theo TKB` để phát hiện lỗi cập nhật hệ thống FSP.
* **Cô Lập Định Mức (Quota Isolation):** Cảnh báo quỹ giờ >110h CHỈ áp dụng cho số giờ dạy chính khóa, bảo vệ quyền lợi cho GV cày thêm giờ CLB/HSG.

---

## 🔄 3. WORKFLOW: LUỒNG HOẠT ĐỘNG CỦA HỆ THỐNG
*(Hệ thống mô phỏng pipeline của Pandas nhưng thực thi hoàn toàn trên môi trường Web Offline)*

**[BƯỚC 1: DATA INGESTION & VALIDATION] 📥**
* 👤 Kéo thả các file FSCHNA_GG_*.xlsx và Doi tiet_Day thay.xlsx vào giao diện.
* ⚙️ **SheetJS** đọc và gộp toàn bộ dữ liệu thành Dataframe FSP Tổng ngay tại RAM.
* 🪓 **Explode:** Tách các chuỗi lớp ghép để đảm bảo ánh xạ chuẩn 1-1.
* 🔍 Kiểm tra toàn vẹn: Đảm bảo file đủ các cột bắt buộc. 🛑 Nếu thiếu, dừng và bật cảnh báo UI.

**[BƯỚC 2: DATA CLEANING & CLASSIFICATION (BẢNG 1)] 🧹**
* 🧼 Làm sạch: Trim khoảng trắng, viết hoa toàn bộ Account.
* 🗂️ Phân loại SỐ TIẾT (Dùng Regex quét trực tiếp trên cột Lớp):
  * Chứa "HSG" / "Học sinh giỏi" ➔ Cột 5.
  * Chứa "ĐT" / "Đội tuyển" ➔ Cột 6.
  * Chứa "PD" / "Phụ đạo" ➔ Cột 7.
  * Chứa "CLB" / "Câu lạc bộ" ➔ Cột 8.
  * *Còn lại (Chính khóa):* Dựa vào số trên tên lớp ➔ Gán vào Cột 3 (TH) hoặc Cột 4 (THCS/THPT).

**[BƯỚC 3: HOURS CONVERSION (QUY ĐỔI GIỜ)] 🧮**
* ⚡ Áp dụng Hệ số & Tính Giờ (Ghi vào Cột 9 -> Cột 14):
  * [Cột 9] Chính khóa Tiểu học: Cột 3 * 0.583.
  * [Cột 10] Chính khóa THCS/THPT: Cột 4 * 0.75.
  * [Cột 11/12/13] Giờ HSG/ĐT/PD: Tiết * 0.75.
  * [Cột 14] Giờ CLB: Cột 8 * 1.25.

**[BƯỚC 4: CROSS-VALIDATION (ĐỐI SOÁT TỌA ĐỘ ĐỔI TIẾT)] 🕵️‍♂️**
* 🔗 Kết nối dữ liệu Đổi tiết với FSP Tổng qua bộ khóa: `(Ngày + Tiết + Lớp)`.
* ⚠️ Rẽ nhánh Logic Cảnh báo (Bảng 4):
  * Không thấy tọa độ / Sai Account Dạy thay ➔ 🔴 **[LỖI ĐỎ]** FSP chưa cập nhật tiết cho GV dạy thay.
  * FSP vẫn ghi Account GV theo TKB ➔ 🟡 **[CẢNH BÁO VÀNG]** FSP quên xóa tiết của GV gốc.
  * Khớp hoàn toàn ➔ 🟢 **[HỢP LỆ XANH]**.

**[BƯỚC 5: AGGREGATION & QUOTA CHECK (BẢNG 2)] ⚖️**
* 🔄 **GroupBy(Username):** Nhóm dữ liệu tổng hợp theo từng giáo viên đa cấp học.
* 💰 **Tổng Giờ Trả Lương:** Cộng toàn bộ Cột 9 đến Cột 14.
* 🚨 **Kiểm tra định mức (Cô lập Quota):** CHỈ cộng (Cột 9 + Cột 10).
  * Tổng > 110 ➔ Gắn cờ `"canh_bao_vuot_gio": true`.
  * Tổng <= 110 ➔ Gắn cờ `"canh_bao_vuot_gio": false`.

**[BƯỚC 6: OUTPUT & INTEGRATION] 🚀**
* 💾 **Export Local:** Tải xuống file Excel (.xlsx) gồm 3 Sheet: Bảng 1 (Chi tiết), Bảng 2 (Tổng hợp Định mức), Bảng 4 (Log Cảnh báo Đổi tiết).
* 🌐 **Webhook Make.com:** Nén dữ liệu Log lỗi thành cục JSON (không chứa PII - Dữ liệu cá nhân) bắn lên Slack hoặc Looker Studio để theo dõi.

---

## 📜 4. RULES (LUẬT LỆ & RÀNG BUỘC)
Hệ thống được thiết kế tuân thủ nghiêm ngặt 6 quy tắc chuẩn QA:
* 🔒 **R01 - Data Privacy (Bảo mật cục bộ):** Xử lý 100% trên Client-side. Không có bất kỳ hàm API nào gửi file Excel thô ra ngoài internet.
* 📌 **R02 - Immutable Names (Định danh chuẩn mực):** Giữ nguyên định dạng cột `Account GV theo TKB` và `Account GV dạy thay`. Không tự ý cắt bỏ hay viết thường.
* ⚠️ **R03 - Explicit Missing Data (Minh bạch dữ kiện):** Nếu ô "Lớp" trống, Agent không được phép đoán. Hệ thống báo đỏ "Thiếu dữ kiện" yêu cầu user rà soát.
* 🛡️ **R04 - Quota Isolation (Cô lập định mức):** Đảm bảo tuyệt đối các Cột giờ đặc thù (11->14) KHÔNG được cộng vào logic kiểm tra vượt định mức (> 110 giờ).
* 🧩 **R05 - Single File Application:** Toàn bộ UI và Logic được đóng gói duy nhất trong file `index.html`.
* 🔗 **R06 - Cross-Level Pre-requisite:** Thuật toán đối soát chỉ chạy SAU KHI đã hoàn tất việc gộp toàn bộ file TH và THCS/THPT.

---

## 🛠️ 5. SKILLS (KỸ NĂNG XỬ LÝ CỦA HỆ THỐNG)
* **Data Parsing:** Tự động nhận diện và chuyển đổi Excel thành Dataframe trên RAM nhờ SheetJS.
* **Regex Pattern Matching:** Kỹ thuật bóc tách từ khóa "HSG", "ĐT", "CLB" thông minh từ chuỗi hỗn hợp, bỏ qua các lỗi gõ sai khoảng trắng.
* **Smart Coordinate Look-up:** Kỹ năng truy vấn và đối khớp chéo tọa độ `(Ngày, Tiết, Lớp)` với độ phức tạp cao.
* **Data Grouping & Aggregation:** Cơ chế nhóm dữ liệu siêu tốc bằng Danfo.js (tương đương `pd.groupby` của Python).
* **JSON Formatting:** Cấu trúc dữ liệu theo chuẩn `snake_case` tối ưu hóa cho hệ thống tự động hóa.

---

## 🧠 6. KNOWLEDGE BASE (CƠ SỞ TRI THỨC CỐ ĐỊNH)
*Hệ thống sử dụng các bộ "Từ điển" (Dictionary) được hard-code làm chuẩn mực tính toán. Không thay đổi trừ khi có văn bản từ Ban Nhân sự.*

**Dictionary 1: Ánh xạ Khối Lớp (Level Mapping)**
* Chứa ["1", "2", "3", "4", "5"] ➔ Khối Tiểu Học ➔ Nhân hệ số: `0.583`
* Chứa ["6", "7", "8", "9", "10", "11", "12"] ➔ Khối THCS_THPT ➔ Nhân hệ số: `0.75`

**Dictionary 2: Ánh xạ Môn học Đặc thù (Subject Mapping)**
* ["HSG", "Học sinh giỏi"] ➔ Hệ số: `0.75`
* ["ĐT", "Đội tuyển"] ➔ Hệ số: `0.75`
* ["PD", "Phụ đạo"] ➔ Hệ số: `0.75`
* ["CLB", "Câu lạc bộ"] ➔ Hệ số: `1.25`

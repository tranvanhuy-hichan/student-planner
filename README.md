# Student Planner

<p align="center"><img src="assets/logo.png" width="120" alt="Student Planner" /></p>

Ứng dụng trợ lý sinh viên viết bằng **React Native (Expo)**: lưu thời khóa biểu, nhắc lịch học, quản lý deadline, ghi chú bài học, Pomodoro và tự tính GPA. Giao diện tiếng Việt, hỗ trợ chế độ sáng/tối, dữ liệu lưu ngay trên thiết bị.

## Tính năng

**Hôm nay**
- Tổng quan trong ngày: tiết đang học / sắp học (kèm đếm ngược), deadline cần chú ý, thời gian tập trung.
- Hiển thị họ tên, trường, lớp và học kỳ đang dùng.

**Học kỳ & hồ sơ**
- Nhiều học kỳ: môn học, lịch, deadline và ghi chú tách riêng theo kỳ; có thể lưu trữ kỳ cũ.
- GPA từng kỳ và GPA tích lũy toàn khóa.
- Hồ sơ sinh viên (họ tên, MSSV, trường, lớp); app nhắc điền khi mở lần đầu.

**Lịch học**
- Thời khóa biểu theo thứ, báo trùng giờ, nhắc trước giờ học (lặp hằng tuần).
- Lịch tháng xem deadline và tiết học theo ngày.

**Môn học & điểm**
- Mỗi môn có màu, giảng viên, số tín chỉ và **các cột điểm có hệ số** (mẫu 20·20·60, 30·20·50, 20·30·50, 30·70 hoặc tự định nghĩa).
- Điểm môn = Σ(điểm × hệ số) ÷ Σ hệ số, quy đổi thang 4 (A/B/C/D), cho biết **điểm cần đạt** ở các cột còn lại.
- GPA chỉ tính môn đã đủ điểm; môn mới có một phần điểm được ghi là tạm tính.

**Deadline**
- Loại (bài tập, thi, dự án), mức ưu tiên, mô tả, hạn nộp; nhắc trước hạn.
- Gom nhóm theo thời gian (quá hạn, hôm nay, ngày mai, tuần này...), lọc theo môn.

**Ghi chú**
- Gắn môn học, ghim, tìm kiếm.
- Checklist việc cần làm, **ảnh đính kèm** (chụp bảng, tài liệu hoặc chọn từ thư viện) và **tệp đính kèm** (PDF, Word, Excel, slide... tối đa 50 MB mỗi tệp); chạm vào tệp để mở hoặc chia sẻ sang app khác.

**Lịch thi**
- Mỗi kỳ thi có môn, loại (giữa kỳ / cuối kỳ), ngày giờ, thời lượng, phòng thi, số báo danh, hình thức và danh sách đồ **mang theo** (thẻ sinh viên, máy tính...).
- Đếm ngược theo từng học kỳ; nhắc tối hôm trước thi (kèm các món chưa chuẩn bị) và trước giờ thi 2 tiếng; tóm tắt buổi sáng có cả kỳ thi trong ngày.

**Trợ lý AI (Google Gemini)**
- Tóm tắt ghi chú: đoạn tóm tắt, ý chính, từ khóa.
- Tạo câu hỏi ôn tập (trắc nghiệm và câu hỏi ngắn) và **làm bài chấm điểm**, nhớ điểm cao nhất.
- Lập kế hoạch ôn thi từ lịch thi và các ghi chú của môn, lưu thành ghi chú có checklist.
- Dùng khóa API của bạn (có gói miễn phí tại [Google AI Studio](https://aistudio.google.com/apikey)), nhập trong Cài đặt. Khóa lưu mã hóa trên máy, không nằm trong bản sao lưu. Chỉ nội dung bạn chọn gửi đi mới được gửi tới Gemini.

**Điểm danh**
- Mỗi môn đặt số buổi được vắng tối đa; bấm "Có mặt / Vắng" ngay trên trang Hôm nay hoặc trong chi tiết tiết học (xem lại 6 buổi gần nhất).
- Đồng hồ buổi vắng đổi màu xanh → vàng → đỏ, và gửi thông báo khi còn 1 buổi hoặc đã chạm giới hạn.

**Pomodoro**
- Tập trung, nghỉ ngắn, nghỉ dài; thời lượng tùy chỉnh; báo khi hết giờ kể cả lúc app chạy nền.
- Ghi nhận thời gian học **theo từng môn**, thống kê 7 ngày và **chuỗi ngày học liên tiếp**.

**Tổng kết tuần**
- Thời gian tập trung theo ngày, so với tuần trước (±%), số phiên, số ngày có học.
- Deadline đến hạn trong tuần đã hoàn thành bao nhiêu, thời gian học theo môn, số buổi vắng; xem lại được các tuần trước.

**Thông báo**
- Nhắc giờ học, hạn nộp và **tóm tắt buổi sáng** ("Hôm nay có 3 tiết, 2 deadline...") với giờ gửi tùy chỉnh.

**Cài đặt & dữ liệu**
- Giao diện sáng / tối / theo hệ thống, thời gian nhắc, thời lượng Pomodoro.
- Xuất và khôi phục bản sao lưu (JSON), xóa toàn bộ dữ liệu.

## Công nghệ

| Mảng | Thư viện |
|---|---|
| Nền tảng | Expo SDK 58, React Native 0.88, React 19, TypeScript |
| Điều hướng | React Navigation (bottom tabs + native stack) |
| Trạng thái & lưu trữ | Zustand + `persist` trên AsyncStorage |
| Thông báo | `expo-notifications` |
| AI | Google Gemini API (gọi trực tiếp REST), khóa lưu bằng `expo-secure-store` |
| Ảnh | `expo-image-picker`, `expo-file-system` |
| Giao diện | `@expo/vector-icons` (Ionicons), `react-native-svg`, `@react-native-community/datetimepicker` |

## Chạy dự án

Yêu cầu: Node.js 20+ và ứng dụng **Expo Go** trên điện thoại (hoặc giả lập Android / iOS).

```bash
git clone https://github.com/tranvanhuy-hichan/student-planner.git
cd student-planner
npm install
npx expo start
```

Quét mã QR bằng Expo Go. Một số lệnh hữu ích:

```bash
npx expo start --web     # xem nhanh trên trình duyệt
npx expo start --tunnel  # khi điện thoại và máy tính không cùng Wi-Fi
npx tsc --noEmit         # kiểm tra kiểu TypeScript
npx expo-doctor          # kiểm tra cấu hình và phiên bản thư viện
```

> Nếu Expo Go báo "signed in to Expo Go but not signed in to Expo CLI", chạy `npx expo login` bằng cùng tài khoản.

## Lưu ý

- **Thông báo hẹn giờ** hoạt động đầy đủ trên thiết bị thật; trên Android, Expo Go bị hạn chế nên cần build bản cài đặt (development build hoặc APK) để dùng ổn định.
- **Camera và thư viện ảnh** cần chạy trên điện thoại thật. Trên bản web, ảnh được lưu dạng nhúng nên không bền bằng trên điện thoại.
- Date picker không chạy trên bản web.
- Dữ liệu chỉ nằm trên thiết bị. **Bản sao lưu hiện chỉ gồm dữ liệu dạng chữ, chưa gồm ảnh và tệp đính kèm** — chuyển sang máy khác thì ghi chú còn nhưng ảnh và tệp sẽ mất.
- Trên bản web, tệp đính kèm tối đa 1,5 MB và lưu trong bộ nhớ trình duyệt.

## Cấu trúc thư mục

```
App.tsx                      Điều hướng, nhắc điền hồ sơ, hẹn thông báo tóm tắt
src/
  store.ts                   Trạng thái toàn app (Zustand), học kỳ, thông báo, sao lưu
  types.ts                   Kiểu dữ liệu
  utils.ts                   Hằng số, định dạng thời gian, công thức điểm / GPA
  notifications.ts           Hẹn và hủy thông báo
  summary.ts                 Tóm tắt buổi sáng và bộ lên lịch tự động
  ai.ts                      Trợ lý AI (Gemini): khóa API, tóm tắt, câu hỏi ôn tập, kế hoạch ôn thi
  images.ts                  Chụp / chọn ảnh, chọn / mở tệp đính kèm và lưu bền trên máy
  dialog.ts                  Hộp thoại dùng chung cho điện thoại và web
  ui.tsx                     Bảng màu và các thành phần giao diện dùng chung
  DateTimeField.tsx          Ô chọn ngày giờ
  ImageViewer.tsx            Xem ảnh toàn màn hình
  screens/
    TodayScreen, ScheduleScreen, DeadlineScreen, NotesScreen, PomodoroScreen
    CalendarScreen, WeeklyReviewScreen, ExamListScreen, QuizScreen, SubjectListScreen, SemesterListScreen, SettingsScreen
    forms/                   Thêm / sửa môn học, tiết học, deadline, ghi chú, học kỳ, hồ sơ
    details/                 Chi tiết môn học, tiết học, deadline, ghi chú
```

## Hướng phát triển

- Widget màn hình chính hiện tiết sắp tới (cần build bản cài đặt riêng).
- Nhập thời khóa biểu hàng loạt từ cổng sinh viên (có bảng quy đổi tiết sang giờ).
- Nhập thời khóa biểu hàng loạt (CSV) và xuất lịch `.ics`.
- Việc con trong deadline, deadline lặp lại.
- Đồng bộ đám mây giữa nhiều thiết bị.

## Giấy phép

MIT, xem [LICENSE](LICENSE).

# Student Planner

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
- Checklist việc cần làm và **ảnh đính kèm** (chụp bảng, tài liệu hoặc chọn từ thư viện).

**Pomodoro**
- Tập trung, nghỉ ngắn, nghỉ dài; thời lượng tùy chỉnh; báo khi hết giờ kể cả lúc app chạy nền.
- Thống kê số phiên và phút tập trung 7 ngày gần nhất.

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
- Dữ liệu chỉ nằm trên thiết bị. Hãy dùng **Cài đặt → Dữ liệu → Xuất bản sao lưu** để chuyển sang máy khác hoặc phòng khi mất máy.

## Cấu trúc thư mục

```
App.tsx                      Điều hướng, nhắc điền hồ sơ, hẹn thông báo tóm tắt
src/
  store.ts                   Trạng thái toàn app (Zustand), học kỳ, thông báo, sao lưu
  types.ts                   Kiểu dữ liệu
  utils.ts                   Hằng số, định dạng thời gian, công thức điểm / GPA
  notifications.ts           Hẹn và hủy thông báo
  summary.ts                 Tóm tắt buổi sáng và bộ lên lịch tự động
  images.ts                  Chụp / chọn ảnh và lưu bền trên máy
  ui.tsx                     Bảng màu và các thành phần giao diện dùng chung
  DateTimeField.tsx          Ô chọn ngày giờ
  ImageViewer.tsx            Xem ảnh toàn màn hình
  screens/
    TodayScreen, ScheduleScreen, DeadlineScreen, NotesScreen, PomodoroScreen
    CalendarScreen, SubjectListScreen, SemesterListScreen, SettingsScreen
    forms/                   Thêm / sửa môn học, tiết học, deadline, ghi chú, học kỳ, hồ sơ
    details/                 Chi tiết môn học, tiết học, deadline, ghi chú
```

## Hướng phát triển

- Điểm danh và giới hạn số buổi vắng theo môn.
- Nhập thời khóa biểu hàng loạt (CSV) và xuất lịch `.ics`.
- Việc con trong deadline, deadline lặp lại.
- Đồng bộ đám mây giữa nhiều thiết bị.

## Giấy phép

MIT, xem [LICENSE](LICENSE).

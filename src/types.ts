import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Một cột điểm của môn học, ví dụ "Giữa kỳ" hệ số 30 */
export type GradeColumn = {
  id: string;
  name: string;
  weight: number; // hệ số / trọng số (tính theo tỉ lệ, 10-30-60 hay 1-2-3 đều được)
  score?: number; // thang 10, chưa nhập thì để trống
};

export type Semester = {
  id: string;
  name: string; // VD: "HK1 2025-2026"
  start?: string; // ISO
  end?: string; // ISO
  archived: boolean;
};

export type Profile = {
  name: string;
  studentId: string;
  school: string;
  className: string;
};

export type Subject = {
  id: string;
  semesterId: string;
  name: string;
  color: string;
  teacher: string;
  credits: number;
  grades: GradeColumn[];
  maxAbsent?: number; // số buổi được vắng tối đa; 0 hoặc trống = không theo dõi điểm danh
};

export type AttendanceStatus = 'present' | 'absent';

/** Một buổi học đã điểm danh (mỗi tiết học mỗi ngày tối đa một bản ghi) */
export type Attendance = {
  id: string;
  subjectId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
};

export type ClassItem = {
  id: string;
  subjectId: string;
  room: string;
  weekday: number; // 1 = Chủ nhật ... 7 = Thứ 7 (khớp expo-notifications)
  start: string; // HH:MM
  end: string;
  notifId?: string;
};

export type DeadlineType = 'assignment' | 'exam' | 'project';
export type Priority = 'low' | 'medium' | 'high';

export type Deadline = {
  id: string;
  semesterId: string;
  title: string;
  subjectId?: string;
  type: DeadlineType;
  priority: Priority;
  notes: string;
  due: string; // ISO
  done: boolean;
  notifId?: string;
};

export type ChecklistItem = { id: string; text: string; done: boolean };

/** Tệp đính kèm trong ghi chú (PDF, tài liệu...) đã được sao chép vào bộ nhớ của app */
export type NoteFile = { id: string; name: string; uri: string; size?: number; mime?: string };

export type Note = {
  id: string;
  semesterId: string;
  title: string;
  body: string;
  checklist: ChecklistItem[];
  images: string[]; // đường dẫn ảnh đã lưu trên máy
  files: NoteFile[];
  ai?: AiNote;
  subjectId?: string;
  pinned: boolean;
  updatedAt: string;
};

export type Settings = {
  theme: 'system' | 'light' | 'dark';
  notifications: boolean;
  classLeadMin: number;
  deadlineLeadHours: number;
  workMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longEvery: number;
  morningSummary: boolean;
  morningTime: string; // HH:MM
  aiModel: string; // mô hình Gemini dùng cho trợ lý AI
};

export type ExamKind = 'midterm' | 'final' | 'other';

export type Exam = {
  id: string;
  semesterId: string;
  subjectId?: string;
  kind: ExamKind;
  title: string; // tên tuỳ chọn; để trống thì hiển thị "Môn · Giữa kỳ"
  date: string; // ISO, giờ bắt đầu thi
  durationMin: number;
  room: string;
  seatNumber: string; // số báo danh
  format: string; // trắc nghiệm, tự luận...
  checklist: ChecklistItem[]; // đồ cần mang theo
  notes: string;
  notifIds?: string[];
};

/** Câu hỏi ôn tập do AI tạo. Trắc nghiệm: 4 phương án + answerIndex; câu hỏi ngắn: options rỗng, answerIndex = -1 */
export type QuizQuestion = {
  type: 'mcq' | 'short';
  question: string;
  options: string[];
  answerIndex: number;
  answer: string;
  explanation: string;
};

export type AiNote = {
  summary?: { text: string; points: string[]; keywords: string[]; model: string; at: string };
  quiz?: { questions: QuizQuestion[]; model: string; at: string; best?: { correct: number; total: number } };
};

export type FocusDay = { sessions: number; minutes: number; bySubject?: Record<string, number> }; // key '_' = chưa gắn môn

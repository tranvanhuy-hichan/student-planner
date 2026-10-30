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

export type Note = {
  id: string;
  semesterId: string;
  title: string;
  body: string;
  checklist: ChecklistItem[];
  images: string[]; // đường dẫn ảnh đã lưu trên máy
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
};

export type FocusDay = { sessions: number; minutes: number };

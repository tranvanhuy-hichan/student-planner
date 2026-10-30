import type { DeadlineType, GradeColumn, IconName, Priority, Subject } from './types';

export const DAYS = [
  { label: 'T2', full: 'Thứ hai', v: 2 },
  { label: 'T3', full: 'Thứ ba', v: 3 },
  { label: 'T4', full: 'Thứ tư', v: 4 },
  { label: 'T5', full: 'Thứ năm', v: 5 },
  { label: 'T6', full: 'Thứ sáu', v: 6 },
  { label: 'T7', full: 'Thứ bảy', v: 7 },
  { label: 'CN', full: 'Chủ nhật', v: 1 },
];

export const TYPES: Record<DeadlineType, string> = {
  assignment: 'Bài tập',
  exam: 'Thi / kiểm tra',
  project: 'Dự án',
};

export const TYPE_ICONS: Record<DeadlineType, IconName> = {
  assignment: 'document-text',
  exam: 'flask',
  project: 'cube',
};

export const PRIORITIES: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Thấp', color: '#10b981' },
  medium: { label: 'Vừa', color: '#f59e0b' },
  high: { label: 'Cao', color: '#ef4444' },
};

export const SUBJECT_COLORS = ['#f43f5e', '#fb923c', '#facc15', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const toHHMM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fromHHMM = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

export function timeLeft(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  const text = min < 60 ? `${min} phút` : abs < 86400_000 ? `${Math.round(abs / 3600000)} giờ` : `${Math.floor(abs / 86400000)} ngày`;
  return diff < 0 ? `quá hạn ${text}` : `còn ${text}`;
}

// Quy đổi điểm thang 10 sang thang 4 (hệ tín chỉ Việt Nam); làm tròn 1 chữ số trước khi quy đổi
export const round1 = (n: number) => Math.round(n * 10) / 10;

export function to4(score: number): number {
  const s = round1(score);
  if (s >= 8.5) return 4;
  if (s >= 7) return 3;
  if (s >= 5.5) return 2;
  if (s >= 4) return 1;
  return 0;
}

export function letter(score: number): string {
  const s = round1(score);
  return s >= 8.5 ? 'A' : s >= 7 ? 'B' : s >= 5.5 ? 'C' : s >= 4 ? 'D' : 'F';
}

/** Mẫu cột điểm hay dùng */
export const GRADE_TEMPLATES: { label: string; cols: { name: string; weight: number }[] }[] = [
  { label: '20 · 20 · 60', cols: [{ name: 'Chuyên cần', weight: 20 }, { name: 'Giữa kỳ', weight: 20 }, { name: 'Cuối kỳ', weight: 60 }] },
  { label: '30 · 20 · 50', cols: [{ name: 'Chuyên cần', weight: 30 }, { name: 'Giữa kỳ', weight: 20 }, { name: 'Cuối kỳ', weight: 50 }] },
  { label: '20 · 30 · 50', cols: [{ name: 'Chuyên cần', weight: 20 }, { name: 'Giữa kỳ', weight: 30 }, { name: 'Cuối kỳ', weight: 50 }] },
  { label: '30 · 70', cols: [{ name: 'Quá trình', weight: 30 }, { name: 'Cuối kỳ', weight: 70 }] },
];

export type SubjectResult = {
  score?: number; // điểm trung bình có trọng số của các cột đã có điểm
  complete: boolean; // đã nhập đủ mọi cột
  filled: number;
  total: number; // số cột
  progress: number; // tỉ lệ hệ số đã có điểm (0..1)
};

/** Điểm môn = Σ(điểm × hệ số) / Σ hệ số, chỉ tính các cột đã có điểm (tạm tính nếu chưa đủ) */
export function subjectResult(s: Pick<Subject, 'grades'>): SubjectResult {
  const cols = s.grades ?? [];
  const totalW = cols.reduce((a, g) => a + g.weight, 0);
  const filled = cols.filter((g) => g.score !== undefined);
  const fw = filled.reduce((a, g) => a + g.weight, 0);
  if (!filled.length || !fw) return { complete: false, filled: 0, total: cols.length, progress: 0 };
  return {
    score: filled.reduce((a, g) => a + g.score! * g.weight, 0) / fw,
    complete: filled.length === cols.length,
    filled: filled.length,
    total: cols.length,
    progress: totalW ? fw / totalW : 0,
  };
}

/** GPA tích lũy chỉ tính môn đã đủ điểm; GPA tạm tính gồm cả môn mới có một phần điểm */
export function computeGpa(subjects: Subject[]) {
  const calc = (list: { score: number; credits: number }[]) => {
    const cr = list.reduce((a, x) => a + x.credits, 0);
    return cr
      ? { credits: cr, gpa4: list.reduce((a, x) => a + to4(x.score) * x.credits, 0) / cr, avg10: list.reduce((a, x) => a + round1(x.score) * x.credits, 0) / cr, count: list.length }
      : { credits: 0, gpa4: 0, avg10: 0, count: 0 };
  };
  const rows = subjects
    .filter((s) => s.credits > 0)
    .map((s) => ({ ...subjectResult(s), credits: s.credits }))
    .filter((r) => r.score !== undefined) as { score: number; complete: boolean; credits: number }[];
  return { final: calc(rows.filter((r) => r.complete)), provisional: calc(rows), partial: rows.filter((r) => !r.complete).length };
}

/** Điểm trung bình cần đạt ở các cột còn lại để môn đạt mức `target`; undefined nếu không còn cột trống */
export function neededAverage(cols: GradeColumn[], target: number): number | undefined {
  const totalW = cols.reduce((a, g) => a + g.weight, 0);
  const empty = cols.filter((g) => g.score === undefined);
  const rw = empty.reduce((a, g) => a + g.weight, 0);
  if (!empty.length || !rw) return undefined;
  const got = cols.filter((g) => g.score !== undefined).reduce((a, g) => a + g.score! * g.weight, 0);
  return (target * totalW - got) / rw;
}

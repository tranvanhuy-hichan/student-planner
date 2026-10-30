import type { DeadlineType, Exam, ExamKind, GradeColumn, IconName, Priority, Subject } from './types';

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


/** Thứ hai đầu tuần của ngày `d`, lùi/tiến `offsetWeeks` tuần */
export function weekStart(d = new Date(), offsetWeeks = 0): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7) + offsetWeeks * 7);
  return x;
}

/** Chuỗi ngày liên tiếp có tập trung. Nếu hôm nay chưa học thì chuỗi vẫn tính đến hôm qua, tránh "mất chuỗi" giữa ngày */
export function focusStreak(focus: Record<string, { minutes: number }>) {
  const has = (d: Date) => (focus[dayKey(d)]?.minutes ?? 0) > 0;
  const d = new Date();
  if (!has(d)) d.setDate(d.getDate() - 1);
  let current = 0;
  while (has(d)) { current++; d.setDate(d.getDate() - 1); }

  const days = Object.keys(focus).filter((k) => focus[k].minutes > 0).sort();
  let best = 0, run = 0, prev: number | undefined;
  for (const k of days) {
    const [y, m, dd] = k.split('-').map(Number);
    const ts = new Date(y, m - 1, dd).getTime();
    run = prev !== undefined && Math.round((ts - prev) / 86400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = ts;
  }
  return { current, best };
}

/** "5 giờ 20 phút" / "45 phút" */
export const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}` : `${m} phút`);


/** "850 KB", "2,4 MB" */
export function fmtSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** Icon theo loại tệp (dựa vào đuôi file, rồi tới mime) */
export function fileIcon(name: string, mime?: string): IconName {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  if (ext === 'pdf' || mime === 'application/pdf') return 'document-text';
  if (['doc', 'docx', 'txt', 'rtf', 'odt', 'md'].includes(ext)) return 'document-text';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'grid';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'easel';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(ext) || mime?.startsWith('image/')) return 'image';
  if (['mp3', 'wav', 'm4a', 'aac'].includes(ext) || mime?.startsWith('audio/')) return 'musical-notes';
  if (['mp4', 'mov', 'mkv', 'avi'].includes(ext) || mime?.startsWith('video/')) return 'videocam';
  return 'document';
}


export const EXAM_KINDS: Record<ExamKind, string> = { midterm: 'Giữa kỳ', final: 'Cuối kỳ', other: 'Khác' };
export const EXAM_FORMATS = ['Trắc nghiệm', 'Tự luận', 'Vấn đáp', 'Thực hành'];
export const EXAM_DURATIONS = [45, 60, 90, 120, 150, 180];
/** Đồ dùng mang theo mặc định khi tạo kỳ thi mới */
export const DEFAULT_EXAM_ITEMS = ['Thẻ sinh viên', 'CCCD / giấy tờ tùy thân', 'Bút (xanh / đen)', 'Máy tính cầm tay', 'Nước uống'];

export const examName = (e: Pick<Exam, 'title' | 'kind' | 'subjectId'>, subjects: Pick<Subject, 'id' | 'name'>[]) =>
  e.title.trim() || `${subjects.find((s) => s.id === e.subjectId)?.name ?? 'Kỳ thi'} · ${EXAM_KINDS[e.kind]}`;

/** "5 ngày 3 giờ" / "3 giờ 20 phút" / "20 phút" / "Đang thi" cho khoảng thời gian tới giờ thi */
export function fmtCountdown(ms: number, durationMin = 0): string {
  if (ms <= 0) return ms > -durationMin * 60000 ? 'Đang diễn ra' : 'Đã thi';
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d > 0) return `${d} ngày${h ? ` ${h} giờ` : ''}`;
  if (h > 0) return `${h} giờ${m ? ` ${m} phút` : ''}`;
  return `${Math.max(m, 1)} phút`;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deleteFile, deleteImage } from './images';
import { cancelNotif, notifyNow, scheduleAt, scheduleClass, scheduleDeadline } from './notifications';
import type { AiNote, Attendance, AttendanceStatus, ChecklistItem, ClassItem, Deadline, Exam, FocusDay, GradeColumn, Note, Profile, Semester, Settings, Subject } from './types';
import { dayKey, EXAM_KINDS } from './utils';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const defaultSettings: Settings = {
  theme: 'system',
  notifications: true,
  classLeadMin: 15,
  deadlineLeadHours: 24,
  workMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longEvery: 4,
  morningSummary: true,
  morningTime: '06:30',
  aiModel: 'gemini-3.8-flash',
};

export const emptyProfile: Profile = { name: '', studentId: '', school: '', className: '' };
/** Hồ sơ coi là đã lưu khi có tên trường và lớp */
export const profileComplete = (p: Profile) => !!p.school.trim() && !!p.className.trim();

const newSemester = (name = 'Học kỳ hiện tại'): Semester => ({ id: uid(), name, archived: false });

/** Đưa dữ liệu cũ (hoặc từ bản sao lưu cũ) về cấu trúc hiện tại: học kỳ, cột điểm, checklist, ảnh */
function normalizeData(d: any) {
  const semesters: Semester[] = Array.isArray(d?.semesters) && d.semesters.length ? d.semesters : [newSemester()];
  const cur = semesters.find((s) => s.id === d?.currentSemesterId)?.id ?? semesters.find((s) => !s.archived)?.id ?? semesters[0].id;
  const arr = (x: any) => (Array.isArray(x) ? x : []);
  const subjects: Subject[] = arr(d?.subjects).map((s: any) => {
    const { score, ...rest } = s ?? {};
    const grades: GradeColumn[] = Array.isArray(rest.grades)
      ? rest.grades
      : typeof score === 'number'
        ? [{ id: uid(), name: 'Tổng kết', weight: 1, score }] // dữ liệu cũ chỉ có một điểm
        : [];
    return { ...rest, grades, semesterId: rest.semesterId ?? cur };
  });
  return {
    semesters,
    currentSemesterId: cur,
    subjects,
    classes: arr(d?.classes) as ClassItem[],
    deadlines: arr(d?.deadlines).map((x: any) => ({ ...x, semesterId: x.semesterId ?? cur })) as Deadline[],
    notes: arr(d?.notes).map((n: any) => ({ ...n, semesterId: n.semesterId ?? cur, checklist: arr(n.checklist), images: arr(n.images), files: arr(n.files) })) as Note[],
    attendance: arr(d?.attendance) as Attendance[],
    exams: arr(d?.exams).map((x: any) => ({ ...x, semesterId: x.semesterId ?? cur, checklist: arr(x.checklist) })) as Exam[],
    focus: (d?.focus && typeof d.focus === 'object' ? d.focus : {}) as Record<string, FocusDay>,
    settings: { ...defaultSettings, ...(d?.settings ?? {}) } as Settings,
    profile: { ...emptyProfile, ...(d?.profile ?? {}) } as Profile,
  };
}

type NewClass = Omit<ClassItem, 'id' | 'notifId'>;
type NewDeadline = Omit<Deadline, 'id' | 'done' | 'notifId' | 'semesterId'>;
type NewExam = Omit<Exam, 'id' | 'semesterId' | 'notifIds'>;
type NoteInput = Pick<Note, 'title' | 'body' | 'subjectId' | 'checklist' | 'images' | 'files'> & { id?: string };

type Data = ReturnType<typeof normalizeData>;

type State = Data & {
  addSemester: (name: string, start?: string, end?: string) => Promise<string>;
  updateSemester: (id: string, p: Partial<Pick<Semester, 'name' | 'start' | 'end'>>) => void;
  setCurrentSemester: (id: string) => Promise<void>;
  archiveSemester: (id: string, archived: boolean) => Promise<void>;
  removeSemester: (id: string) => Promise<void>;
  saveProfile: (p: Profile) => void;

  addSubject: (s: Omit<Subject, 'id' | 'semesterId'>) => string;
  updateSubject: (id: string, s: Partial<Omit<Subject, 'id' | 'semesterId'>>) => Promise<void>;
  removeSubject: (id: string) => Promise<void>;

  addClass: (c: NewClass) => Promise<void>;
  updateClass: (id: string, c: NewClass) => Promise<void>;
  removeClass: (id: string) => Promise<void>;

  addDeadline: (d: NewDeadline) => Promise<void>;
  updateDeadline: (id: string, d: NewDeadline) => Promise<void>;
  toggleDeadline: (id: string) => Promise<void>;
  removeDeadline: (id: string) => Promise<void>;
  clearDoneDeadlines: () => void;

  saveNote: (n: NoteInput) => void;
  toggleNoteItem: (noteId: string, itemId: string) => void;
  togglePin: (id: string) => void;
  removeNote: (id: string) => void;

  addExam: (e: NewExam) => Promise<string>;
  updateExam: (id: string, e: NewExam) => Promise<void>;
  removeExam: (id: string) => Promise<void>;
  toggleExamItem: (examId: string, itemId: string) => Promise<void>;
  setNoteAi: (noteId: string, ai: AiNote) => void;

  setAttendance: (classId: string, subjectId: string, date: string, status?: AttendanceStatus) => void;
  addFocus: (minutes: number, subjectId?: string) => void;
  setSettings: (p: Partial<Settings>) => Promise<void>;
  rescheduleAll: () => Promise<void>;
  exportData: () => string;
  importData: (json: string) => Promise<string | null>; // trả về lỗi nếu có
  resetAll: () => Promise<void>;
};

const initialSemester = newSemester();

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Học kỳ đang dùng và chưa lưu trữ: chỉ dữ liệu của kỳ này mới được hẹn thông báo */
      const activeSemester = () => {
        const s = get();
        const sem = s.semesters.find((x) => x.id === s.currentSemesterId);
        return sem && !sem.archived ? sem.id : undefined;
      };
      const subjectName = (id?: string) => get().subjects.find((s) => s.id === id)?.name ?? 'Môn học';
      const classNotif = async (c: NewClass) => {
        const sem = get().subjects.find((s) => s.id === c.subjectId)?.semesterId;
        return get().settings.notifications && sem && sem === activeSemester()
          ? scheduleClass(subjectName(c.subjectId), c.room, c.weekday, c.start, get().settings.classLeadMin)
          : undefined;
      };
      const deadlineNotif = async (d: { title: string; due: string; done?: boolean; semesterId: string }) =>
        get().settings.notifications && !d.done && d.semesterId === activeSemester()
          ? scheduleDeadline(d.title, new Date(d.due), get().settings.deadlineLeadHours)
          : undefined;

      /** Nhắc tối hôm trước (20:00) kèm đồ chưa chuẩn bị, và nhắc trước giờ thi 2 tiếng */
      const examNotifs = async (e: { date: string; room: string; seatNumber: string; title: string; kind: Exam['kind']; subjectId?: string; checklist: ChecklistItem[]; semesterId: string }) => {
        if (!get().settings.notifications || e.semesterId !== activeSemester()) return [];
        const name = e.title.trim() || `${subjectName(e.subjectId)} · ${EXAM_KINDS[e.kind]}`;
        const at = new Date(e.date);
        const hhmm = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
        const where = [e.room && `Phòng ${e.room}`, e.seatNumber && `SBD ${e.seatNumber}`].filter(Boolean).join(' · ');
        const todo = e.checklist.filter((i) => !i.done).map((i) => i.text);
        const evening = new Date(at); evening.setDate(evening.getDate() - 1); evening.setHours(20, 0, 0, 0);
        const before = new Date(at.getTime() - 2 * 3600_000);
        const ids = await Promise.all([
          scheduleAt(`Mai thi ${name}`, [`${hhmm}${where ? ` · ${where}` : ''}`, todo.length ? `Nhớ mang: ${todo.join(', ')}` : 'Đã chuẩn bị đủ đồ dùng'].join('\n'), evening),
          scheduleAt(`Sắp thi ${name}`, `Còn 2 giờ${where ? ` · ${where}` : ''}`, before),
        ]);
        return ids.filter((x): x is string => !!x);
      };

      const first = initialSemester;
      return {
        semesters: [first],
        currentSemesterId: first.id,
        profile: emptyProfile,
        subjects: [],
        classes: [],
        deadlines: [],
        notes: [],
        focus: {},
        attendance: [],
        exams: [],
        settings: defaultSettings,

        addSemester: async (name, start, end) => {
          const sem: Semester = { id: uid(), name, start, end, archived: false };
          set((s) => ({ semesters: [...s.semesters, sem] }));
          await get().setCurrentSemester(sem.id); // học kỳ mới được chọn luôn
          return sem.id;
        },
        updateSemester: (id, p) => set((s) => ({ semesters: s.semesters.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
        setCurrentSemester: async (id) => {
          set({ currentSemesterId: id });
          await get().rescheduleAll();
        },
        archiveSemester: async (id, archived) => {
          set((s) => ({ semesters: s.semesters.map((x) => (x.id === id ? { ...x, archived } : x)) }));
          const st = get();
          if (archived && st.currentSemesterId === id) {
            const other = st.semesters.find((x) => x.id !== id && !x.archived);
            if (other) set({ currentSemesterId: other.id });
          }
          await get().rescheduleAll();
        },
        removeSemester: async (id) => {
          const st = get();
          if (st.semesters.length <= 1) return;
          const subIds = new Set(st.subjects.filter((x) => x.semesterId === id).map((x) => x.id));
          const gone = [...st.classes.filter((c) => subIds.has(c.subjectId)), ...st.deadlines.filter((d) => d.semesterId === id)];
          await Promise.all(gone.map((x) => cancelNotif(x.notifId)));
          await Promise.all(st.exams.filter((x) => x.semesterId === id).flatMap((x) => x.notifIds ?? []).map(cancelNotif));
          st.notes.filter((n) => n.semesterId === id).forEach((n) => { n.images.forEach(deleteImage); n.files.forEach(deleteFile); });
          const rest = st.semesters.filter((x) => x.id !== id);
          set({
            semesters: rest,
            currentSemesterId: st.currentSemesterId === id ? (rest.find((x) => !x.archived) ?? rest[0]).id : st.currentSemesterId,
            subjects: st.subjects.filter((x) => x.semesterId !== id),
            classes: st.classes.filter((c) => !subIds.has(c.subjectId)),
            deadlines: st.deadlines.filter((d) => d.semesterId !== id),
            notes: st.notes.filter((n) => n.semesterId !== id),
            attendance: st.attendance.filter((a) => !subIds.has(a.subjectId)),
            exams: st.exams.filter((x) => x.semesterId !== id),
          });
          await get().rescheduleAll();
        },
        saveProfile: (p) => set({ profile: { name: p.name.trim(), studentId: p.studentId.trim(), school: p.school.trim(), className: p.className.trim() } }),

        addSubject: (s) => {
          const id = uid();
          set((st) => ({ subjects: [...st.subjects, { ...s, id, semesterId: st.currentSemesterId }] }));
          return id;
        },
        updateSubject: async (id, patch) => {
          set((st) => ({ subjects: st.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
          if (patch.name !== undefined) await get().rescheduleAll(); // tên môn nằm trong nội dung nhắc
        },
        removeSubject: async (id) => {
          await Promise.all(get().classes.filter((c) => c.subjectId === id).map((c) => cancelNotif(c.notifId)));
          set((st) => ({
            subjects: st.subjects.filter((s) => s.id !== id),
            classes: st.classes.filter((c) => c.subjectId !== id),
            deadlines: st.deadlines.map((d) => (d.subjectId === id ? { ...d, subjectId: undefined } : d)),
            notes: st.notes.map((n) => (n.subjectId === id ? { ...n, subjectId: undefined } : n)),
            exams: st.exams.map((x) => (x.subjectId === id ? { ...x, subjectId: undefined } : x)),
            attendance: st.attendance.filter((a) => a.subjectId !== id),
          }));
        },

        addClass: async (c) => {
          const notifId = await classNotif(c);
          set((s) => ({ classes: [...s.classes, { ...c, id: uid(), notifId }] }));
        },
        updateClass: async (id, c) => {
          await cancelNotif(get().classes.find((x) => x.id === id)?.notifId);
          const notifId = await classNotif(c);
          set((s) => ({ classes: s.classes.map((x) => (x.id === id ? { ...x, ...c, notifId } : x)) }));
        },
        removeClass: async (id) => {
          await cancelNotif(get().classes.find((c) => c.id === id)?.notifId);
          set((s) => ({ classes: s.classes.filter((c) => c.id !== id) }));
        },

        addDeadline: async (d) => {
          const semesterId = get().currentSemesterId;
          const notifId = await deadlineNotif({ ...d, semesterId });
          set((s) => ({ deadlines: [...s.deadlines, { ...d, id: uid(), semesterId, done: false, notifId }] }));
        },
        updateDeadline: async (id, d) => {
          const old = get().deadlines.find((x) => x.id === id);
          await cancelNotif(old?.notifId);
          const notifId = await deadlineNotif({ ...d, done: old?.done, semesterId: old?.semesterId ?? get().currentSemesterId });
          set((s) => ({ deadlines: s.deadlines.map((x) => (x.id === id ? { ...x, ...d, notifId } : x)) }));
        },
        toggleDeadline: async (id) => {
          const d = get().deadlines.find((x) => x.id === id);
          if (!d) return;
          const done = !d.done;
          await cancelNotif(d.notifId);
          const notifId = await deadlineNotif({ ...d, done });
          set((s) => ({ deadlines: s.deadlines.map((x) => (x.id === id ? { ...x, done, notifId } : x)) }));
        },
        removeDeadline: async (id) => {
          await cancelNotif(get().deadlines.find((d) => d.id === id)?.notifId);
          set((s) => ({ deadlines: s.deadlines.filter((d) => d.id !== id) }));
        },
        clearDoneDeadlines: () => set((s) => ({ deadlines: s.deadlines.filter((d) => !d.done) })),

        saveNote: (n) => {
          const updatedAt = new Date().toISOString();
          if (n.id) {
            const old = get().notes.find((x) => x.id === n.id);
            old?.images.filter((u) => !n.images.includes(u)).forEach(deleteImage); // ảnh bị gỡ khỏi ghi chú
            old?.files.filter((f) => !n.files.some((x) => x.id === f.id)).forEach(deleteFile); // tệp bị gỡ
            set((s) => ({ notes: s.notes.map((x) => (x.id === n.id ? { ...x, ...n, updatedAt } : x)) }));
          } else {
            set((s) => ({ notes: [{ ...n, id: uid(), semesterId: s.currentSemesterId, pinned: false, updatedAt }, ...s.notes] }));
          }
        },
        toggleNoteItem: (noteId, itemId) =>
          set((s) => ({
            notes: s.notes.map((n) =>
              n.id === noteId ? { ...n, checklist: n.checklist.map((i: ChecklistItem) => (i.id === itemId ? { ...i, done: !i.done } : i)) } : n,
            ),
          })),
        togglePin: (id) => set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)) })),
        removeNote: (id) => {
          const gone = get().notes.find((n) => n.id === id);
          gone?.images.forEach(deleteImage);
          gone?.files.forEach(deleteFile);
          set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
        },

        addExam: async (e) => {
          const id = uid();
          const semesterId = get().currentSemesterId;
          const notifIds = await examNotifs({ ...e, semesterId });
          set((s) => ({ exams: [...s.exams, { ...e, id, semesterId, notifIds }] }));
          return id;
        },
        updateExam: async (id, e) => {
          const old = get().exams.find((x) => x.id === id);
          await Promise.all((old?.notifIds ?? []).map(cancelNotif));
          const notifIds = await examNotifs({ ...e, semesterId: old?.semesterId ?? get().currentSemesterId });
          set((s) => ({ exams: s.exams.map((x) => (x.id === id ? { ...x, ...e, notifIds } : x)) }));
        },
        removeExam: async (id) => {
          await Promise.all((get().exams.find((x) => x.id === id)?.notifIds ?? []).map(cancelNotif));
          set((s) => ({ exams: s.exams.filter((x) => x.id !== id) }));
        },
        toggleExamItem: async (examId, itemId) => {
          set((s) => ({ exams: s.exams.map((x) => (x.id === examId ? { ...x, checklist: x.checklist.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) } : x)) }));
          const e = get().exams.find((x) => x.id === examId);
          if (!e) return;
          await Promise.all((e.notifIds ?? []).map(cancelNotif)); // nội dung nhắc có danh sách đồ chưa chuẩn bị nên hẹn lại
          const notifIds = await examNotifs(e);
          set((s) => ({ exams: s.exams.map((x) => (x.id === examId ? { ...x, notifIds } : x)) }));
        },
        setNoteAi: (noteId, ai) => set((s) => ({ notes: s.notes.map((n) => (n.id === noteId ? { ...n, ai: { ...n.ai, ...ai } } : n)) })),

        setAttendance: (classId, subjectId, date, status) => {
          set((s) => {
            const rest = s.attendance.filter((x) => !(x.classId === classId && x.date === date));
            return { attendance: status ? [...rest, { id: uid(), subjectId, classId, date, status }] : rest };
          });
          // Cảnh báo khi sắp / đã chạm giới hạn buổi vắng
          const sub = get().subjects.find((x) => x.id === subjectId);
          const max = sub?.maxAbsent ?? 0;
          if (status !== 'absent' || !sub || max <= 0) return;
          const absent = get().attendance.filter((x) => x.subjectId === subjectId && x.status === 'absent').length;
          if (absent >= max) notifyNow('Đã chạm giới hạn buổi vắng', `${sub.name}: đã vắng ${absent}/${max} buổi. Hãy cẩn thận!`).catch(() => {});
          else if (absent === max - 1) notifyNow('Sắp hết số buổi được vắng', `${sub.name}: đã vắng ${absent}/${max} buổi, chỉ còn 1 buổi.`).catch(() => {});
        },

        addFocus: (minutes, subjectId) =>
          set((s) => {
            const k = dayKey();
            const cur = s.focus[k] ?? { sessions: 0, minutes: 0 };
            const key = subjectId ?? '_';
            const by = { ...(cur.bySubject ?? {}) };
            by[key] = (by[key] ?? 0) + minutes;
            return { focus: { ...s.focus, [k]: { sessions: cur.sessions + 1, minutes: cur.minutes + minutes, bySubject: by } } };
          }),

        setSettings: async (p) => {
          set((s) => ({ settings: { ...s.settings, ...p } }));
          if ('notifications' in p || 'classLeadMin' in p || 'deadlineLeadHours' in p) await get().rescheduleAll();
        },
        rescheduleAll: async () => {
          const { classes, deadlines, exams } = get();
          await Promise.all([...classes, ...deadlines].map((x) => cancelNotif(x.notifId)));
          await Promise.all(exams.flatMap((x) => x.notifIds ?? []).map(cancelNotif));
          const nc = await Promise.all(classes.map(async (c) => ({ ...c, notifId: await classNotif(c) })));
          const nd = await Promise.all(deadlines.map(async (d) => ({ ...d, notifId: await deadlineNotif(d) })));
          const ne = await Promise.all(exams.map(async (x) => ({ ...x, notifIds: await examNotifs(x) })));
          set({ classes: nc, deadlines: nd, exams: ne });
        },

        exportData: () => {
          const { semesters, currentSemesterId, profile, subjects, classes, deadlines, notes, attendance, exams, focus, settings } = get();
          return JSON.stringify({ app: 'student-planner', version: 7, semesters, currentSemesterId, profile, subjects, classes, deadlines, notes, attendance, exams, focus, settings });
        },
        importData: async (json) => {
          let d: any;
          try {
            d = JSON.parse(json);
          } catch {
            return 'Dữ liệu không phải JSON hợp lệ';
          }
          if (d?.app !== 'student-planner') return 'Đây không phải bản sao lưu của Student Planner';
          await Promise.all([...get().classes, ...get().deadlines].map((x) => cancelNotif(x.notifId)));
          await Promise.all(get().exams.flatMap((x) => x.notifIds ?? []).map(cancelNotif));
          const n = normalizeData(d);
          set({
            ...n,
            classes: n.classes.map((c) => ({ ...c, notifId: undefined })),
            deadlines: n.deadlines.map((x) => ({ ...x, notifId: undefined })),
            exams: n.exams.map((x) => ({ ...x, notifIds: undefined })),
          });
          await get().rescheduleAll();
          return null;
        },
        resetAll: async () => {
          const st = get();
          await Promise.all([...st.classes, ...st.deadlines].map((x) => cancelNotif(x.notifId)));
          await Promise.all(st.exams.flatMap((x) => x.notifIds ?? []).map(cancelNotif));
          st.notes.forEach((n) => { n.images.forEach(deleteImage); n.files.forEach(deleteFile); });
          const sem = newSemester();
          set({ semesters: [sem], currentSemesterId: sem.id, profile: emptyProfile, subjects: [], classes: [], deadlines: [], notes: [], attendance: [], exams: [], focus: {}, settings: defaultSettings });
        },
      };
    },
    {
      name: 'student-planner-v2',
      version: 7,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (state: any) => normalizeData(state) as any,
      // Luôn chuẩn hóa dữ liệu đã lưu khi mở app (không chỉ khi đổi version), nên thêm trường mới không làm hỏng dữ liệu cũ
      merge: (persisted: any, current) => (persisted ? { ...current, ...normalizeData(persisted) } : current),
    },
  ),
);

/** Dữ liệu của học kỳ đang chọn (tiết học lọc theo môn học của kỳ đó) */
export function useScoped() {
  const semesters = useStore((s) => s.semesters);
  const cur = useStore((s) => s.currentSemesterId);
  const subjects = useStore((s) => s.subjects);
  const classes = useStore((s) => s.classes);
  const deadlines = useStore((s) => s.deadlines);
  const notes = useStore((s) => s.notes);
  const exams = useStore((s) => s.exams);
  return useMemo(() => {
    const subs = subjects.filter((x) => x.semesterId === cur);
    const ids = new Set(subs.map((x) => x.id));
    return {
      semester: semesters.find((x) => x.id === cur) ?? semesters[0],
      subjects: subs,
      classes: classes.filter((c) => ids.has(c.subjectId)),
      deadlines: deadlines.filter((d) => d.semesterId === cur),
      notes: notes.filter((n) => n.semesterId === cur),
      exams: exams.filter((x) => x.semesterId === cur),
    };
  }, [semesters, cur, subjects, classes, deadlines, notes, exams]);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deleteImage } from './images';
import { cancelNotif, scheduleClass, scheduleDeadline } from './notifications';
import type { ChecklistItem, ClassItem, Deadline, FocusDay, GradeColumn, Note, Profile, Semester, Settings, Subject } from './types';
import { dayKey } from './utils';

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
    notes: arr(d?.notes).map((n: any) => ({ ...n, semesterId: n.semesterId ?? cur, checklist: arr(n.checklist), images: arr(n.images) })) as Note[],
    focus: (d?.focus && typeof d.focus === 'object' ? d.focus : {}) as Record<string, FocusDay>,
    settings: { ...defaultSettings, ...(d?.settings ?? {}) } as Settings,
    profile: { ...emptyProfile, ...(d?.profile ?? {}) } as Profile,
  };
}

type NewClass = Omit<ClassItem, 'id' | 'notifId'>;
type NewDeadline = Omit<Deadline, 'id' | 'done' | 'notifId' | 'semesterId'>;
type NoteInput = Pick<Note, 'title' | 'body' | 'subjectId' | 'checklist' | 'images'> & { id?: string };

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

  addFocus: (minutes: number) => void;
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
          st.notes.filter((n) => n.semesterId === id).forEach((n) => n.images.forEach(deleteImage));
          const rest = st.semesters.filter((x) => x.id !== id);
          set({
            semesters: rest,
            currentSemesterId: st.currentSemesterId === id ? (rest.find((x) => !x.archived) ?? rest[0]).id : st.currentSemesterId,
            subjects: st.subjects.filter((x) => x.semesterId !== id),
            classes: st.classes.filter((c) => !subIds.has(c.subjectId)),
            deadlines: st.deadlines.filter((d) => d.semesterId !== id),
            notes: st.notes.filter((n) => n.semesterId !== id),
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
          get().notes.find((n) => n.id === id)?.images.forEach(deleteImage);
          set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
        },

        addFocus: (minutes) =>
          set((s) => {
            const k = dayKey();
            const cur = s.focus[k] ?? { sessions: 0, minutes: 0 };
            return { focus: { ...s.focus, [k]: { sessions: cur.sessions + 1, minutes: cur.minutes + minutes } } };
          }),

        setSettings: async (p) => {
          set((s) => ({ settings: { ...s.settings, ...p } }));
          if ('notifications' in p || 'classLeadMin' in p || 'deadlineLeadHours' in p) await get().rescheduleAll();
        },
        rescheduleAll: async () => {
          const { classes, deadlines } = get();
          await Promise.all([...classes, ...deadlines].map((x) => cancelNotif(x.notifId)));
          const nc = await Promise.all(classes.map(async (c) => ({ ...c, notifId: await classNotif(c) })));
          const nd = await Promise.all(deadlines.map(async (d) => ({ ...d, notifId: await deadlineNotif(d) })));
          set({ classes: nc, deadlines: nd });
        },

        exportData: () => {
          const { semesters, currentSemesterId, profile, subjects, classes, deadlines, notes, focus, settings } = get();
          return JSON.stringify({ app: 'student-planner', version: 4, semesters, currentSemesterId, profile, subjects, classes, deadlines, notes, focus, settings });
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
          const n = normalizeData(d);
          set({
            ...n,
            classes: n.classes.map((c) => ({ ...c, notifId: undefined })),
            deadlines: n.deadlines.map((x) => ({ ...x, notifId: undefined })),
          });
          await get().rescheduleAll();
          return null;
        },
        resetAll: async () => {
          const st = get();
          await Promise.all([...st.classes, ...st.deadlines].map((x) => cancelNotif(x.notifId)));
          st.notes.forEach((n) => n.images.forEach(deleteImage));
          const sem = newSemester();
          set({ semesters: [sem], currentSemesterId: sem.id, profile: emptyProfile, subjects: [], classes: [], deadlines: [], notes: [], focus: {}, settings: defaultSettings });
        },
      };
    },
    {
      name: 'student-planner-v2',
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (state: any) => normalizeData(state) as any,
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
  return useMemo(() => {
    const subs = subjects.filter((x) => x.semesterId === cur);
    const ids = new Set(subs.map((x) => x.id));
    return {
      semester: semesters.find((x) => x.id === cur) ?? semesters[0],
      subjects: subs,
      classes: classes.filter((c) => ids.has(c.subjectId)),
      deadlines: deadlines.filter((d) => d.semesterId === cur),
      notes: notes.filter((n) => n.semesterId === cur),
    };
  }, [semesters, cur, subjects, classes, deadlines, notes]);
}

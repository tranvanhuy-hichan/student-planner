import { AppState } from 'react-native';
import { cancelSummaries, notifyNow, scheduleAt } from './notifications';
import { useStore } from './store';
import { pad } from './utils';

const HORIZON_DAYS = 10; // hẹn trước 10 ngày (iOS giới hạn 64 thông báo đang chờ)

/** Nội dung tóm tắt cho một ngày; undefined nếu ngày đó không có gì để nhắc */
export function buildSummary(date: Date): { title: string; body: string } | undefined {
  const st = useStore.getState();
  const sem = st.semesters.find((s) => s.id === st.currentSemesterId);
  if (!sem || sem.archived) return;

  const subs = new Map(st.subjects.filter((s) => s.semesterId === sem.id).map((s) => [s.id, s]));
  const classes = st.classes.filter((c) => subs.has(c.subjectId) && c.weekday === date.getDay() + 1).sort((a, b) => a.start.localeCompare(b.start));
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const open = st.deadlines.filter((d) => d.semesterId === sem.id && !d.done);
  const due = open.filter((d) => { const t = new Date(d.due).getTime(); return t >= from && t < from + 86400_000; }).sort((a, b) => a.due.localeCompare(b.due));
  const isToday = new Date().toDateString() === date.toDateString();
  const overdue = isToday ? open.filter((d) => new Date(d.due).getTime() < from).length : 0;
  if (!classes.length && !due.length && !overdue) return;

  const parts: string[] = [];
  if (classes.length) parts.push(`${classes.length} tiết`);
  if (due.length) parts.push(`${due.length} deadline`);
  const lines: string[] = [];
  if (classes.length) {
    const c = classes[0];
    lines.push(`Tiết đầu ${c.start} · ${subs.get(c.subjectId)?.name ?? 'Môn học'}${c.room ? ` · ${c.room}` : ''}`);
  }
  if (due.length) {
    const d = new Date(due[0].due);
    lines.push(`Hạn gần nhất: ${due[0].title} (${pad(d.getHours())}:${pad(d.getMinutes())})`);
  }
  if (overdue) lines.push(`${overdue} deadline đã quá hạn`);

  const first = st.profile.name.trim().split(/\s+/).pop();
  const head = parts.length ? `Hôm nay có ${parts.join(', ')}` : 'Bạn có deadline quá hạn';
  return { title: first ? `${first} ơi, ${head.charAt(0).toLowerCase()}${head.slice(1)}` : head, body: lines.join('\n') };
}

let running = false;
let again = false;

/** Hủy các bản tóm tắt cũ và hẹn lại cho những ngày tới theo dữ liệu hiện tại */
export async function rebuildSummaries() {
  if (running) { again = true; return; }
  running = true;
  try {
    await cancelSummaries();
    const { settings } = useStore.getState();
    if (!settings.notifications || !settings.morningSummary) return;
    const [h, m] = settings.morningTime.split(':').map(Number);
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const at = new Date();
      at.setDate(at.getDate() + i);
      at.setHours(h, m, 0, 0);
      if (at.getTime() <= Date.now()) continue;
      const s = buildSummary(at);
      if (s) await scheduleAt(s.title, s.body, at, { kind: 'summary' });
    }
  } catch {
    // nền tảng không hỗ trợ hẹn thông báo (ví dụ web) → bỏ qua
  } finally {
    running = false;
    if (again) { again = false; rebuildSummaries(); }
  }
}

/** Gửi thử ngay bản tóm tắt của hôm nay */
export async function sendTestSummary() {
  const s = buildSummary(new Date()) ?? { title: 'Hôm nay bạn rảnh', body: 'Không có tiết học hay deadline nào cần nhắc.' };
  await notifyNow(s.title, s.body);
}

/** Tự hẹn lại khi dữ liệu / cài đặt đổi và mỗi khi mở lại app, để cửa sổ 10 ngày luôn được kéo dài */
export function startSummaryScheduler() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const trigger = () => { clearTimeout(timer); timer = setTimeout(rebuildSummaries, 1500); };
  const unsub = useStore.subscribe((s, p) => {
    if (s.subjects !== p.subjects || s.classes !== p.classes || s.deadlines !== p.deadlines || s.settings !== p.settings || s.currentSemesterId !== p.currentSemesterId || s.semesters !== p.semesters || s.profile !== p.profile) trigger();
  });
  const app = AppState.addEventListener('change', (st) => { if (st === 'active') trigger(); });
  trigger();
  return () => { clearTimeout(timer); unsub(); app.remove(); };
}

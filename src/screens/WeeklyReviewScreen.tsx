import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useScoped, useStore } from '../store';
import { dayKey, fmtMinutes, focusStreak, weekStart } from '../utils';
import { Empty, Icon, IconButton, ListRow, Section, StatRow, useColors, useS } from '../ui';

const LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const fmtDay = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

/** Tổng phút và số phiên của 7 ngày bắt đầu từ `start` */
function weekFocus(focus: Record<string, { sessions: number; minutes: number; bySubject?: Record<string, number> }>, start: Date) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const f = focus[dayKey(d)];
    return { date: d, minutes: f?.minutes ?? 0, sessions: f?.sessions ?? 0, by: f?.bySubject ?? {} };
  });
  const by: Record<string, number> = {};
  days.forEach((d) => Object.entries(d.by).forEach(([k, v]) => { by[k] = (by[k] ?? 0) + v; }));
  return { days, minutes: days.reduce((a, d) => a + d.minutes, 0), sessions: days.reduce((a, d) => a + d.sessions, 0), by };
}

export default function WeeklyReviewScreen() {
  const nav = useNavigation<any>();
  const s = useS();
  const c = useColors();
  const { focus, attendance, subjects: allSubjects } = useStore();
  const { deadlines } = useScoped();
  const [offset, setOffset] = useState(0); // 0 = tuần này, -1 = tuần trước...

  const start = weekStart(new Date(), offset);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const cur = useMemo(() => weekFocus(focus, start), [focus, offset]);
  const prev = useMemo(() => weekFocus(focus, weekStart(new Date(), offset - 1)), [focus, offset]);
  const streak = focusStreak(focus);
  const activeDays = cur.days.filter((d) => d.minutes > 0).length;
  const max = Math.max(30, ...cur.days.map((d) => d.minutes));

  // Deadline có hạn trong tuần
  const from = start.getTime(), to = from + 7 * 86400_000;
  const due = deadlines.filter((d) => { const t = new Date(d.due).getTime(); return t >= from && t < to; });
  const done = due.filter((d) => d.done).length;
  const open = due.filter((d) => !d.done).sort((a, b) => a.due.localeCompare(b.due));

  // Điểm danh: số buổi vắng trong tuần theo môn
  const weekKeys = new Set(cur.days.map((d) => dayKey(d.date)));
  const absent: Record<string, number> = {};
  attendance.filter((a) => a.status === 'absent' && weekKeys.has(a.date)).forEach((a) => { absent[a.subjectId] = (absent[a.subjectId] ?? 0) + 1; });
  const absentRows = Object.entries(absent).map(([id, n]) => ({ id, n, name: allSubjects.find((x) => x.id === id)?.name ?? 'Môn đã xóa' }));

  const subRows = Object.entries(cur.by)
    .map(([id, min]) => {
      const sb = allSubjects.find((x) => x.id === id);
      return { id, min, name: id === '_' ? 'Chưa gắn môn' : sb?.name ?? 'Môn đã xóa', color: sb?.color ?? c.muted };
    })
    .sort((a, b) => b.min - a.min);
  const subMax = Math.max(1, ...subRows.map((r) => r.min));

  // So với tuần trước
  const diff = cur.minutes - prev.minutes;
  const pct = prev.minutes > 0 ? Math.round((diff / prev.minutes) * 100) : undefined;
  const title = offset === 0 ? 'Tuần này' : offset === -1 ? 'Tuần trước' : `${-offset} tuần trước`;
  const trend = diff > 0 ? { icon: 'trending-up' as const, color: c.success } : diff < 0 ? { icon: 'trending-down' as const, color: c.danger } : { icon: 'remove' as const, color: c.muted };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <View style={[s.row, { marginBottom: 6 }]}>
        <IconButton name="chevron-back" color={c.text} size={22} onPress={() => setOffset(offset - 1)} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>{title}</Text>
          <Text style={s.sub}>{fmtDay(start)} – {fmtDay(end)}</Text>
        </View>
        <View style={{ opacity: offset === 0 ? 0.25 : 1 }}>
          <IconButton name="chevron-forward" color={c.text} size={22} onPress={() => offset < 0 && setOffset(offset + 1)} />
        </View>
      </View>

      {/* Tập trung */}
      <Text style={s.kicker}>Thời gian tập trung</Text>
      <Text style={{ fontSize: 40, fontWeight: '800', letterSpacing: -1.2, color: cur.minutes ? c.primary : c.muted }}>{cur.minutes ? fmtMinutes(cur.minutes) : '0 phút'}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <Icon name={trend.icon} size={16} color={trend.color} />
        <Text style={{ color: trend.color, fontWeight: '700', fontSize: 13 }}>
          {pct !== undefined ? `${diff > 0 ? '+' : ''}${pct}%` : diff > 0 ? 'Mới' : '—'}
        </Text>
        <Text style={s.sub}>so với tuần trước ({fmtMinutes(prev.minutes)})</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 96, marginTop: 14, marginBottom: 12 }}>
        {cur.days.map((d, i) => {
          const isToday = dayKey(d.date) === dayKey();
          return (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: c.muted, fontSize: 10, marginBottom: 2 }}>{d.minutes || ''}</Text>
              <View style={{ width: 20, height: Math.max(4, (d.minutes / max) * 56), borderRadius: 3, backgroundColor: isToday ? c.primary : d.minutes ? c.primary + '88' : c.chip }} />
              <Text style={{ color: isToday ? c.primary : c.muted, fontSize: 11, marginTop: 6, fontWeight: '600' }}>{LABELS[i]}</Text>
            </View>
          );
        })}
      </View>

      <StatRow items={[
        { value: String(cur.sessions), label: 'Phiên' },
        { value: `${activeDays}/7`, label: 'Ngày có học' },
        { value: String(streak.current), label: 'Chuỗi ngày', color: streak.current > 0 ? c.primary : undefined },
      ]} />

      {/* Deadline */}
      <Section text="Deadline trong tuần" />
      {due.length === 0 ? (
        <Empty icon="checkmark-done-outline" text="Không có deadline nào đến hạn trong tuần này" />
      ) : (
        <>
          <View style={[s.row, { marginBottom: 6 }]}>
            <Text style={{ color: c.text, fontWeight: '700' }}>{done}/{due.length} đã hoàn thành</Text>
            <Text style={{ color: done === due.length ? c.success : c.muted, fontWeight: '800' }}>{Math.round((done / due.length) * 100)}%</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.chip, marginBottom: 6 }}>
            <View style={{ width: `${(done / due.length) * 100}%`, height: 6, borderRadius: 3, backgroundColor: c.success }} />
          </View>
          {open.map((d, i) => (
            <ListRow key={d.id} last={i === open.length - 1} onPress={() => nav.navigate('DeadlineDetail', { id: d.id })}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: new Date(d.due) < new Date() ? c.danger : c.warning, marginRight: 12 }} />
              <Text numberOfLines={1} style={[s.title, { flex: 1 }]}>{d.title}</Text>
              <Text style={{ color: c.muted, fontSize: 12 }}>{new Date(d.due).getDate()}/{new Date(d.due).getMonth() + 1}</Text>
            </ListRow>
          ))}
        </>
      )}

      {/* Theo môn */}
      <Section text="Tập trung theo môn học" />
      {subRows.length === 0 ? (
        <Empty icon="timer-outline" text="Chưa có phiên Pomodoro nào trong tuần này" action={{ label: 'Bắt đầu Pomodoro', onPress: () => nav.navigate('Main', { screen: 'Pomodoro' }) }} />
      ) : (
        subRows.map((r) => (
          <View key={r.id} style={{ marginBottom: 10 }}>
            <View style={[s.row, { marginBottom: 4 }]}>
              <Text numberOfLines={1} style={{ color: c.text, fontWeight: '600', flex: 1 }}>{r.name}</Text>
              <Text style={{ color: c.muted, fontWeight: '700' }}>{fmtMinutes(r.min)}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.chip }}>
              <View style={{ width: `${(r.min / subMax) * 100}%`, height: 6, borderRadius: 3, backgroundColor: r.color }} />
            </View>
          </View>
        ))
      )}

      {/* Điểm danh */}
      {absentRows.length > 0 && (
        <>
          <Section text="Buổi vắng trong tuần" />
          {absentRows.map((r, i) => (
            <ListRow key={r.id} last={i === absentRows.length - 1} onPress={() => nav.navigate('SubjectDetail', { id: r.id })}>
              <Icon name="close-circle-outline" size={20} color={c.danger} />
              <Text numberOfLines={1} style={[s.title, { flex: 1, marginLeft: 12 }]}>{r.name}</Text>
              <Text style={{ color: c.danger, fontWeight: '800' }}>{r.n} buổi</Text>
            </ListRow>
          ))}
        </>
      )}
    </ScrollView>
  );
}

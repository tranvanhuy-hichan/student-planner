import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { cancelNotif, scheduleAt } from '../notifications';
import { useStore } from '../store';
import type { IconName } from '../types';
import { dayKey, focusStreak, pad } from '../utils';
import { useNavigation } from '@react-navigation/native';
import { Button, Icon, ListRow, Section, StatRow, SubjectPicker, TextTabs, useColors, useS } from '../ui';

type Mode = 'work' | 'short' | 'long';
const LABEL: Record<Mode, { text: string; icon: IconName }> = {
  work: { text: 'Tập trung', icon: 'flame' },
  short: { text: 'Nghỉ ngắn', icon: 'cafe' },
  long: { text: 'Nghỉ dài', icon: 'leaf' },
};

const KeepAwake = () => { useKeepAwake(); return null; };

function Ring({ progress, size = 216, stroke = 6, children }: { progress: number; size?: number; stroke?: number; children: React.ReactNode }) {
  const c = useColors();
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.primary} />
            <Stop offset="1" stopColor={c.primary} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.chip} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="url(#g)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - progress)} />
      </Svg>
      {children}
    </View>
  );
}

export default function PomodoroScreen() {
  const { settings, focus, subjects, addFocus } = useStore();
  const nav = useNavigation<any>();
  const s = useS();
  const c = useColors();
  const minutesOf = (m: Mode) => (m === 'work' ? settings.workMin : m === 'short' ? settings.shortBreakMin : settings.longBreakMin);

  const [mode, setMode] = useState<Mode>('work');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(minutesOf('work') * 60);
  const [cycle, setCycle] = useState(0); // số phiên tập trung đã xong
  const [subjectId, setSubjectId] = useState<string>();
  const endAt = useRef(0);
  const notifId = useRef<string | undefined>(undefined);

  // Đổi thời lượng trong Cài đặt thì cập nhật đồng hồ khi chưa chạy
  useEffect(() => {
    if (!running) setRemaining(minutesOf(mode) * 60);
  }, [settings.workMin, settings.shortBreakMin, settings.longBreakMin, mode]);

  const stopAlarm = async () => { await cancelNotif(notifId.current); notifId.current = undefined; };

  const start = async () => {
    endAt.current = Date.now() + remaining * 1000;
    const name = subjects.find((x) => x.id === subjectId)?.name;
    notifId.current = await scheduleAt(
      mode === 'work' ? 'Hết giờ tập trung!' : 'Hết giờ nghỉ',
      mode === 'work' ? (name ? `Bạn đã học ${name} xong một phiên` : 'Nghỉ ngơi một chút nhé') : 'Quay lại học thôi',
      new Date(endAt.current),
    );
    setRunning(true);
  };
  const pause = async () => { await stopAlarm(); setRunning(false); };
  const switchTo = async (m: Mode) => { await stopAlarm(); setRunning(false); setMode(m); setRemaining(minutesOf(m) * 60); };

  const finish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRunning(false);
    notifId.current = undefined; // thông báo đã tự bắn
    if (mode === 'work') {
      addFocus(settings.workMin, subjectId); // ghi nhận thời gian học theo môn đang chọn
      const n = cycle + 1;
      const isLong = n % settings.longEvery === 0;
      setCycle(n);
      setMode(isLong ? 'long' : 'short');
      setRemaining(minutesOf(isLong ? 'long' : 'short') * 60);
    } else {
      setMode('work');
      setRemaining(settings.workMin * 60);
    }
  };

  // Tính theo mốc thời gian thực nên không lệch khi app bị tạm ngưng
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) finish();
    }, 500);
    return () => clearInterval(id);
  }, [running, mode, cycle]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()], minutes: focus[dayKey(d)]?.minutes ?? 0 };
  });
  const max = Math.max(60, ...days.map((d) => d.minutes));
  const today = focus[dayKey()] ?? { sessions: 0, minutes: 0 };
  const totalMin = Object.values(focus).reduce((a, x) => a + x.minutes, 0);
  const streak = focusStreak(focus);

  // Phút học theo môn trong 7 ngày gần nhất
  const bySub: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    Object.entries(focus[dayKey(d)]?.bySubject ?? {}).forEach(([k, v]) => { bySub[k] = (bySub[k] ?? 0) + v; });
  }
  const subRows = Object.entries(bySub)
    .map(([id, min]) => {
      const sb = subjects.find((x) => x.id === id);
      return { id, min, name: id === '_' ? 'Chưa gắn môn' : sb?.name ?? 'Môn đã xóa', color: sb?.color ?? c.muted };
    })
    .sort((a, b) => b.min - a.min);
  const subMax = Math.max(1, ...subRows.map((r) => r.min));
  const total = minutesOf(mode) * 60;
  const progress = total ? 1 - remaining / total : 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { alignItems: 'center' }]}>
      {running && <KeepAwake />}
      <View style={{ alignSelf: 'stretch' }}>
        <TextTabs<Mode> value={mode} onChange={switchTo} options={(['work', 'short', 'long'] as Mode[]).map((m) => ({ key: m, label: LABEL[m].text }))} />
      </View>

      <View style={{ marginTop: 4, marginBottom: 16 }}>
        <Ring progress={progress}>
          <Text style={{ fontSize: 54, fontWeight: '300', color: c.text, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
            {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
          </Text>
          <Text style={[s.kicker, { marginTop: 4 }]}>Phiên {(cycle % settings.longEvery) + (mode === 'work' ? 1 : 0)}/{settings.longEvery}</Text>
        </Ring>
      </View>

      <View style={{ width: '100%' }}>
        {mode === 'work' && !running && <SubjectPicker value={subjectId} onChange={setSubjectId} />}
        <View style={{ height: 6 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2 }}><Button icon={running ? 'pause' : 'play'} title={running ? 'Tạm dừng' : 'Bắt đầu'} onPress={running ? pause : start} /></View>
          <View style={{ flex: 1 }}><Button icon="refresh" title="Đặt lại" color={c.muted} onPress={() => switchTo(mode)} /></View>
          {running && <View style={{ flex: 1 }}><Button icon="play-skip-forward" title="Bỏ qua" color={c.warning} onPress={() => switchTo(mode === 'work' ? 'short' : 'work')} /></View>}
        </View>

        <Section text="Thống kê" />
        <StatRow items={[
          { value: String(today.sessions), label: 'Phiên nay' },
          { value: `${today.minutes}′`, label: 'Phút nay' },
          { value: `${(totalMin / 60).toFixed(1)}h`, label: 'Tổng giờ' },
          { value: String(streak.current), label: 'Chuỗi ngày', color: streak.current > 0 ? c.primary : undefined },
        ]} />
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 92, marginTop: 14 }}>
            {days.map((d, i) => (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: c.muted, fontSize: 10, marginBottom: 2 }}>{d.minutes || ''}</Text>
                <View style={{ width: 20, height: Math.max(4, (d.minutes / max) * 52), borderRadius: 3, backgroundColor: i === 6 ? c.primary : c.chip }} />
                <Text style={{ color: i === 6 ? c.primary : c.muted, fontSize: 11, marginTop: 6, fontWeight: '600' }}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {subRows.length > 0 && (
          <>
            <Section text="Theo môn học · 7 ngày" />
            {subRows.map((r) => (
              <View key={r.id} style={{ marginBottom: 10 }}>
                <View style={[s.row, { marginBottom: 4 }]}>
                  <Text numberOfLines={1} style={{ color: c.text, fontWeight: '600', flex: 1 }}>{r.name}</Text>
                  <Text style={{ color: c.muted, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{r.min} phút</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: c.chip }}>
                  <View style={{ width: `${(r.min / subMax) * 100}%`, height: 6, borderRadius: 3, backgroundColor: r.color }} />
                </View>
              </View>
            ))}
          </>
        )}
        {streak.best > 0 && <Text style={[s.sub, { marginTop: 4 }]}>Chuỗi dài nhất: {streak.best} ngày</Text>}

        <ListRow last onPress={() => nav.navigate('WeeklyReview')}>
          <Icon name="stats-chart-outline" size={20} color={c.primary} />
          <Text style={[s.title, { flex: 1, marginLeft: 12 }]}>Xem tổng kết tuần</Text>
          <Icon name="chevron-forward" size={18} color={c.muted} />
        </ListRow>
      </View>
    </ScrollView>
  );
}

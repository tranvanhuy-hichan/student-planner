import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useScoped } from '../store';
import { EXAM_KINDS, examName, fmtCountdown } from '../utils';
import { Empty, FAB, Icon, ListRow, Pill, TextTabs, useColors, useS } from '../ui';

type Filter = 'upcoming' | 'past' | 'all';

export default function ExamListScreen() {
  const nav = useNavigation<any>();
  const s = useS();
  const c = useColors();
  const { exams, subjects, semester } = useScoped();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);

  const end = (e: { date: string; durationMin: number }) => new Date(e.date).getTime() + e.durationMin * 60000;
  const upcoming = useMemo(() => exams.filter((e) => end(e) > now).sort((a, b) => a.date.localeCompare(b.date)), [exams, now]);
  const past = useMemo(() => exams.filter((e) => end(e) <= now).sort((a, b) => b.date.localeCompare(a.date)), [exams, now]);
  const shown = filter === 'upcoming' ? upcoming : filter === 'past' ? past : [...upcoming, ...past];
  const next = upcoming[0];

  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad}
        data={shown}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={
          <>
            <Text style={s.kicker}>{semester?.name ?? 'Kỳ thi'}</Text>
            {next ? (
              <Pressable2 onPress={() => nav.navigate('ExamDetail', { id: next.id })}>
                <Text style={{ fontSize: 36, fontWeight: '800', letterSpacing: -1, color: c.primary, marginTop: 2 }}>
                  {fmtCountdown(new Date(next.date).getTime() - now, next.durationMin)}
                </Text>
                <Text style={[s.sub, { marginBottom: 14 }]}>đến {examName(next, subjects)} · {new Date(next.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}</Text>
              </Pressable2>
            ) : (
              <Text style={[s.sub, { marginTop: 4, marginBottom: 14 }]}>{exams.length ? 'Bạn đã thi xong tất cả các môn trong học kỳ này.' : 'Chưa có lịch thi. Bấm + để thêm kỳ thi đầu tiên.'}</Text>
            )}
            <TextTabs<Filter>
              value={filter}
              onChange={setFilter}
              options={[{ key: 'upcoming', label: `Sắp tới (${upcoming.length})` }, { key: 'past', label: `Đã thi (${past.length})` }, { key: 'all', label: 'Tất cả' }]}
            />
          </>
        }
        ListEmptyComponent={<Empty icon="school-outline" text={filter === 'past' ? 'Chưa có kỳ thi nào đã diễn ra' : 'Không có kỳ thi nào'} action={filter === 'past' ? undefined : { label: 'Thêm kỳ thi', onPress: () => nav.navigate('ExamForm', {}) }} />}
        renderItem={({ item: e, index }) => {
          const d = new Date(e.date);
          const done = end(e) <= now;
          const sub = subjects.find((x) => x.id === e.subjectId);
          const todo = e.checklist.filter((i) => !i.done).length;
          return (
            <ListRow last={index === shown.length - 1} onPress={() => nav.navigate('ExamDetail', { id: e.id })}>
              <View style={{ width: 52, alignItems: 'center', paddingVertical: 6, borderRadius: 10, backgroundColor: (sub?.color ?? c.primary) + '22', marginRight: 14 }}>
                <Text style={{ color: sub?.color ?? c.primary, fontSize: 20, fontWeight: '800', lineHeight: 24 }}>{d.getDate()}</Text>
                <Text style={{ color: c.muted, fontSize: 10, fontWeight: '800' }}>THG {d.getMonth() + 1}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, opacity: done ? 0.6 : 1 }}>
                <Text numberOfLines={1} style={s.title}>{examName(e, subjects)}</Text>
                <Text numberOfLines={1} style={s.sub}>
                  {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}{e.room ? ` · Phòng ${e.room}` : ''}{e.seatNumber ? ` · SBD ${e.seatNumber}` : ''}
                </Text>
                {!done && todo > 0 && <Text style={{ color: c.warning, fontSize: 12, fontWeight: '600', marginTop: 2 }}>Còn {todo} món chưa chuẩn bị</Text>}
              </View>
              {done ? <Pill text="Đã thi" color={c.muted} /> : <Pill text={fmtCountdown(d.getTime() - now, e.durationMin)} color={d.getTime() - now < 3 * 86400_000 ? c.danger : c.primary} />}
            </ListRow>
          );
        }}
      />
      <FAB bottom={28} onPress={() => nav.navigate('ExamForm', {})} />
    </View>
  );
}

// Vùng bấm đơn giản để mở chi tiết kỳ thi gần nhất
import { Pressable } from 'react-native';
const Pressable2 = ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => <Pressable onPress={onPress}>{children}</Pressable>;

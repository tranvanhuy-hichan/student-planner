import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useScoped } from '../store';
import { DAYS, dayKey, fmtDateTime, PRIORITIES } from '../utils';
import { Card, Empty, Icon, IconButton, ListRow, Section, useColors, useS } from '../ui';

export default function CalendarScreen() {
  const { classes, deadlines, subjects } = useScoped();
  const nav = useNavigation<any>();
  const s = useS();
  const c = useColors();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(new Date());

  const y = month.getFullYear(), m = month.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // tuần bắt đầu từ thứ hai
  const total = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const byDay: Record<string, typeof deadlines> = {};
  deadlines.forEach((d) => { (byDay[dayKey(new Date(d.due))] ??= []).push(d); });

  const selKey = dayKey(selected);
  const selDeadlines = (byDay[selKey] ?? []).sort((a, b) => a.due.localeCompare(b.due));
  const selClasses = classes.filter((x) => x.weekday === selected.getDay() + 1).sort((a, b) => a.start.localeCompare(b.start));
  const todayKey = dayKey();

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <View style={[s.row, { marginBottom: 8 }]}>
        <IconButton name="chevron-back" color={c.text} size={24} onPress={() => setMonth(new Date(y, m - 1, 1))} />
        <Pressable onPress={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelected(d); }} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[s.h1, { fontSize: 22 }]}>Tháng {m + 1}/{y}</Text>
          <Icon name="today-outline" size={18} color={c.primary} />
        </Pressable>
        <IconButton name="chevron-forward" color={c.text} size={24} onPress={() => setMonth(new Date(y, m + 1, 1))} />
      </View>

      <Card>
        <View style={{ flexDirection: 'row' }}>
          {DAYS.map((d) => <Text key={d.v} style={{ width: '14.285%', textAlign: 'center', color: c.muted, fontWeight: '600' }}>{d.label}</Text>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
          {cells.map((day, i) => {
            if (!day) return <View key={i} style={{ width: '14.285%', height: 42 }} />;
            const date = new Date(y, m, day);
            const k = dayKey(date);
            const items = byDay[k] ?? [];
            const isSel = k === selKey;
            return (
              <Pressable key={i} onPress={() => setSelected(date)} style={{ width: '14.285%', height: 42, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: isSel ? c.primary : 'transparent', borderWidth: k === todayKey && !isSel ? 1 : 0, borderColor: c.primary }}>
                  <Text style={{ color: isSel ? c.onPrimary : c.text }}>{day}</Text>
                </View>
                <View style={{ flexDirection: 'row', height: 6, gap: 2 }}>
                  {items.slice(0, 3).map((d) => <View key={d.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: d.done ? c.muted : PRIORITIES[d.priority].color }} />)}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>
 
      <Section text={`Deadline ngày ${selected.toLocaleDateString('vi-VN')}`} />
      {selDeadlines.length === 0 && <Empty text="Không có deadline" />}
      {selDeadlines.map((d, i) => (
        <ListRow key={d.id} last={i === selDeadlines.length - 1} onPress={() => nav.navigate('DeadlineDetail', { id: d.id })}>
          <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 12, backgroundColor: subjects.find((x) => x.id === d.subjectId)?.color ?? c.border }} />
          <View style={{ flex: 1 }}>
            <Text style={[s.title, d.done && { textDecorationLine: 'line-through', color: c.muted }]}>{d.title}</Text>
            <Text style={s.sub}>{subjects.find((x) => x.id === d.subjectId)?.name ?? 'Chưa gắn môn'} · {fmtDateTime(d.due)}</Text>
          </View>
        </ListRow>
      ))}

      <Section text={`Lịch học (${DAYS.find((d) => d.v === selected.getDay() + 1)?.full})`} />
      {selClasses.length === 0 && <Empty text="Không có tiết học" />}
      {selClasses.map((x, i) => {
        const sub = subjects.find((q) => q.id === x.subjectId);
        return (
          <ListRow key={x.id} last={i === selClasses.length - 1} onPress={() => nav.navigate('ClassDetail', { id: x.id })}>
            <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 12, backgroundColor: sub?.color ?? c.border }} />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{sub?.name ?? 'Môn học'}</Text>
              <Text style={s.sub}>{x.start} – {x.end} · {x.room || 'Chưa có phòng'}</Text>
            </View>
          </ListRow>
        );
      })}
    </ScrollView>
  );
}

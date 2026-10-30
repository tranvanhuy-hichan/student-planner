import { useNavigation, useRoute } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useStore } from '../../store';
import type { GradeColumn } from '../../types';
import { DAYS, letter, neededAverage, PRIORITIES, subjectResult, timeLeft, to4 } from '../../utils';
import { Button, confirm, Empty, Header, Icon, IconButton, ListRow, Pill, Section, useColors, useS } from '../../ui';

/** Ô nhập điểm của một cột; lưu khi rời khỏi ô, để trống = chưa có điểm */
function ScoreInput({ value, onCommit }: { value?: number; onCommit: (v: number | undefined) => void }) {
  const c = useColors();
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [bad, setBad] = useState(false);
  const commit = () => {
    const raw = text.trim().replace(',', '.');
    if (raw === '') { setBad(false); return onCommit(undefined); }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 10) return setBad(true);
    setBad(false);
    onCommit(n);
  };
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onEndEditing={commit}
      onBlur={commit}
      keyboardType="decimal-pad"
      placeholder="–"
      placeholderTextColor={c.muted}
      style={{ width: 64, textAlign: 'center', fontSize: 17, fontWeight: '800', color: bad ? c.danger : c.text, borderWidth: 1, borderColor: bad ? c.danger : c.border, borderRadius: 8, paddingVertical: 8, backgroundColor: c.card }}
    />
  );
}

export default function SubjectDetail() {
  const { id } = useRoute().params as { id: string };
  const nav = useNavigation<any>();
  const { subjects, classes, deadlines, notes, removeSubject, updateSubject } = useStore();
  const s = useS();
  const c = useColors();
  const sub = subjects.find((x) => x.id === id);

  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <IconButton name="create-outline" color={c.text} size={22} onPress={() => nav.navigate('SubjectForm', { id })} /> });
  }, [nav, id, c]);

  if (!sub) return null;
  const myClasses = classes.filter((x) => x.subjectId === id).sort((a, b) => DAYS.findIndex((d) => d.v === a.weekday) - DAYS.findIndex((d) => d.v === b.weekday) || a.start.localeCompare(b.start));
  const myDeadlines = deadlines.filter((x) => x.subjectId === id && !x.done).sort((a, b) => a.due.localeCompare(b.due));
  const myNotes = notes.filter((x) => x.subjectId === id);
  const res = subjectResult(sub);
  const totalW = sub.grades.reduce((a, g) => a + g.weight, 0);
  const setScore = (gid: string, v: number | undefined) =>
    updateSubject(id, { grades: sub.grades.map((g: GradeColumn) => (g.id === gid ? { ...g, score: v } : g)) });
  const targets = [{ v: 8.5, l: 'A' }, { v: 7, l: 'B' }, { v: 5.5, l: 'C' }, { v: 4, l: 'D' }]
    .map((x) => ({ ...x, need: neededAverage(sub.grades, x.v) }))
    .filter((x) => x.need !== undefined && x.need <= 10);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Header kicker={`${sub.credits} tín chỉ`} title={sub.name} sub={sub.teacher || 'Chưa có giảng viên'} color={sub.color} />

      <Section text="Bảng điểm" />
      {sub.grades.length === 0 ? (
        <Empty icon="ribbon-outline" text="Chưa có cột điểm" action={{ label: 'Thiết lập cột điểm', onPress: () => nav.navigate('SubjectForm', { id }) }} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontSize: 40, fontWeight: '800', letterSpacing: -1.5, color: res.score === undefined ? c.muted : c.primary, fontVariant: ['tabular-nums'] }}>
              {res.score === undefined ? '–' : res.score.toFixed(2)}
            </Text>
            {res.score !== undefined && <Text style={{ color: c.muted, fontWeight: '600', fontSize: 16 }}>/ 10 · {letter(res.score)} · {to4(res.score).toFixed(1)} / 4</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {res.score === undefined ? <Pill text="Chưa có điểm" color={c.muted} /> : res.complete ? <Pill text="Đã đủ điểm" color={c.success} icon="checkmark" /> : <Pill text={`Tạm tính · ${res.filled}/${res.total} cột`} color={c.warning} />}
          </View>
          {sub.grades.map((g, i) => (
            <ListRow key={g.id} last={i === sub.grades.length - 1}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{g.name}</Text>
                <Text style={s.sub}>Hệ số {g.weight}{totalW ? ` · ${Math.round((g.weight / totalW) * 100)}%` : ''}</Text>
              </View>
              <ScoreInput key={`${g.id}-${g.score}`} value={g.score} onCommit={(v) => setScore(g.id, v)} />
            </ListRow>
          ))}
          {targets.length > 0 && res.filled > 0 && (
            <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
              <Text style={s.kicker}>Điểm cần đạt ở các cột còn lại</Text>
              {targets.map((x) => (
                <View key={x.l} style={[s.row, { marginTop: 8 }]}>
                  <Text style={{ color: c.text }}>Để đạt <Text style={{ fontWeight: '800' }}>{x.l}</Text> (≥ {x.v})</Text>
                  <Text style={{ color: c.primary, fontWeight: '800' }}>{x.need! <= 0 ? 'Đã đạt' : `TB ≥ ${x.need!.toFixed(2)}`}</Text>
                </View>
              ))}
            </View>
          )}
          <Button icon="create-outline" title="Sửa cột điểm" color={c.muted} onPress={() => nav.navigate('SubjectForm', { id })} />
        </>
      )}

      <Section text={`Lịch học · ${myClasses.length}`} />
      {myClasses.length === 0 && <Empty icon="calendar-outline" text="Chưa có tiết học" />}
      {myClasses.map((x, i) => (
        <ListRow key={x.id} last={i === myClasses.length - 1} onPress={() => nav.navigate('ClassDetail', { id: x.id })}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{DAYS.find((d) => d.v === x.weekday)?.full} · {x.start} – {x.end}</Text>
            <Text style={s.sub}>{x.room || 'Chưa có phòng'}</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={c.muted} />
        </ListRow>
      ))}
      <Button icon="add" title="Thêm tiết học" color={c.muted} onPress={() => nav.navigate('ClassForm', {})} />

      <Section text={`Deadline đang làm · ${myDeadlines.length}`} />
      {myDeadlines.length === 0 && <Empty icon="checkmark-done-outline" text="Không có deadline" />}
      {myDeadlines.map((d, i) => (
        <ListRow key={d.id} last={i === myDeadlines.length - 1} onPress={() => nav.navigate('DeadlineDetail', { id: d.id })}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: PRIORITIES[d.priority].color, marginRight: 14 }} />
          <Text numberOfLines={1} style={[s.title, { flex: 1 }]}>{d.title}</Text>
          <Text style={{ color: new Date(d.due) < new Date() ? c.danger : c.muted, fontWeight: '700', fontSize: 12 }}>{timeLeft(d.due)}</Text>
        </ListRow>
      ))}
      <Button icon="add" title="Thêm deadline" color={c.muted} onPress={() => nav.navigate('DeadlineForm', { subjectId: id })} />

      <Section text={`Ghi chú · ${myNotes.length}`} />
      {myNotes.length === 0 && <Empty icon="document-text-outline" text="Chưa có ghi chú" />}
      {myNotes.map((n, i) => (
        <ListRow key={n.id} last={i === myNotes.length - 1} onPress={() => nav.navigate('NoteDetail', { id: n.id })}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{n.title}</Text>
            {!!n.body && <Text numberOfLines={1} style={s.sub}>{n.body}</Text>}
          </View>
        </ListRow>
      ))}
      <Button icon="add" title="Thêm ghi chú" color={c.muted} onPress={() => nav.navigate('NoteForm', { subjectId: id })} />

      <View style={{ height: 16 }} />
      <Button icon="create-outline" title="Chỉnh sửa môn học" onPress={() => nav.navigate('SubjectForm', { id })} />
      <Button icon="trash-outline" title="Xóa môn học" color={c.danger}
        onPress={() => confirm(`Xóa môn “${sub.name}”? Các tiết học của môn này cũng sẽ bị xóa.`, async () => { nav.goBack(); await removeSubject(id); })} />
    </ScrollView>
  );
}

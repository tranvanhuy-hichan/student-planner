import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { describeAiError, planExam, useAiKey } from '../../ai';
import { showAlert } from '../../dialog';
import { useStore } from '../../store';
import { EXAM_KINDS, examName, fmtCountdown, fmtMinutes } from '../../utils';
import { Button, confirm, Header, Icon, IconButton, InfoRow, Section, useColors, useS } from '../../ui';

export default function ExamDetail() {
  const { id } = useRoute().params as { id: string };
  const nav = useNavigation<any>();
  const { exams, subjects, notes, semesters, toggleExamItem, removeExam, saveNote } = useStore();
  const hasKey = !!useAiKey((st) => st.key);
  const s = useS();
  const c = useColors();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const e = exams.find((x) => x.id === id);

  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <IconButton name="create-outline" color={c.text} size={22} onPress={() => nav.navigate('ExamForm', { id })} /> });
  }, [nav, id, c]);

  if (!e) return null;
  const sub = subjects.find((x) => x.id === e.subjectId);
  const start = new Date(e.date).getTime();
  const end = start + e.durationMin * 60000;
  const over = now >= end;
  const done = e.checklist.filter((i) => i.done).length;
  const hm = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const name = examName(e, subjects);
  const sem = semesters.find((x) => x.id === e.semesterId)?.name;

  const makePlan = async () => {
    setBusy(true);
    try {
      const related = notes.filter((n) => n.subjectId === e.subjectId && e.subjectId);
      const steps = await planExam(e, sub?.name, related, subjects);
      saveNote({
        title: `Kế hoạch ôn thi · ${name}`,
        subjectId: e.subjectId,
        body: `Kế hoạch ôn thi ${name}, ngày thi ${new Date(e.date).toLocaleDateString('vi-VN')} lúc ${hm(start)}. Do AI gợi ý dựa trên ${related.length} ghi chú của môn.`,
        checklist: steps.map((st) => ({ id: Math.random().toString(36).slice(2, 9), text: `${st.when}: ${st.task}`, done: false })),
        images: [],
        files: [],
      });
      const created = useStore.getState().notes[0];
      showAlert('Đã tạo kế hoạch ôn thi', 'Kế hoạch được lưu thành một ghi chú có checklist.', [{ text: 'Mở ghi chú', onPress: () => nav.navigate('NoteDetail', { id: created.id }) }]);
    } catch (err) {
      showAlert('Chưa lập được kế hoạch', describeAiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Header kicker={`${EXAM_KINDS[e.kind]}${sem ? ` · ${sem}` : ''}`} title={name} color={sub?.color} />

      {/* Đếm ngược */}
      <View style={{ paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border, marginBottom: 6 }}>
        <Text style={s.kicker}>{over ? 'Trạng thái' : start <= now ? 'Đang diễn ra' : 'Còn lại'}</Text>
        <Text style={{ fontSize: 40, fontWeight: '800', letterSpacing: -1.2, color: over ? c.muted : start - now < 3 * 86400_000 ? c.danger : c.primary, marginTop: 2 }}>
          {fmtCountdown(start - now, e.durationMin)}
        </Text>
      </View>

      <InfoRow icon="calendar" label="Ngày giờ thi" value={`${new Date(e.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })} · ${hm(start)} – ${hm(end)}`} color={sub?.color} />
      <InfoRow icon="hourglass" label="Thời gian làm bài" value={fmtMinutes(e.durationMin)} color={sub?.color} />
      <InfoRow icon="location" label="Phòng thi" value={e.room || 'Chưa có'} color={sub?.color} />
      <InfoRow icon="id-card" label="Số báo danh" value={e.seatNumber || 'Chưa có'} color={sub?.color} />
      {!!e.format && <InfoRow icon="document-text" label="Hình thức" value={e.format} color={sub?.color} />}
      {sub && <InfoRow icon="book" label="Môn học" value={sub.name} color={sub.color} />}

      {/* Mang theo */}
      <Section text={`Mang theo · ${done}/${e.checklist.length}`} />
      {e.checklist.length === 0 ? (
        <Text style={s.sub}>Chưa có đồ dùng nào. Thêm trong phần chỉnh sửa.</Text>
      ) : (
        <>
          <View style={{ height: 3, backgroundColor: c.chip, borderRadius: 2, marginBottom: 4 }}>
            <View style={{ width: `${(done / e.checklist.length) * 100}%`, height: 3, backgroundColor: c.success, borderRadius: 2 }} />
          </View>
          {e.checklist.map((it, i) => (
            <Pressable key={it.id} onPress={() => toggleExamItem(e.id, it.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: i === e.checklist.length - 1 ? 0 : 1, borderBottomColor: c.border }}>
              <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: it.done ? c.success : c.muted, backgroundColor: it.done ? c.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {it.done && <Icon name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={{ flex: 1, fontSize: 16, color: it.done ? c.muted : c.text, textDecorationLine: it.done ? 'line-through' : 'none' }}>{it.text}</Text>
            </Pressable>
          ))}
        </>
      )}

      {!!e.notes && (
        <>
          <Section text="Ghi chú" />
          <Text style={{ color: c.text, lineHeight: 22, fontSize: 15 }} selectable>{e.notes}</Text>
        </>
      )}

      {/* Trợ lý AI */}
      {!over && (
        <>
          <Section text="Trợ lý AI" />
          {hasKey ? (
            <>
              <Button icon="sparkles-outline" title={busy ? 'Đang lập kế hoạch...' : 'Lập kế hoạch ôn thi'} onPress={busy ? () => {} : makePlan} />
              {busy && <ActivityIndicator color={c.primary} style={{ marginBottom: 8 }} />}
              <Text style={s.sub}>AI dựa vào số ngày còn lại và các ghi chú của môn này để chia việc ôn, rồi lưu thành một ghi chú có checklist.</Text>
            </>
          ) : (
            <Button icon="key-outline" title="Thêm khóa API để dùng trợ lý AI" color={c.muted} onPress={() => nav.navigate('Cài đặt')} />
          )}
        </>
      )}

      <View style={{ height: 14 }} />
      <Button icon="create-outline" title="Chỉnh sửa kỳ thi" onPress={() => nav.navigate('ExamForm', { id })} />
      <Button icon="trash-outline" title="Xóa kỳ thi" color={c.danger} onPress={() => confirm('Xóa kỳ thi này?', async () => { nav.goBack(); await removeExam(id); })} />
    </ScrollView>
  );
}

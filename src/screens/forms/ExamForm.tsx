import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { DateTimeField } from '../../DateTimeField';
import { useStore } from '../../store';
import type { ChecklistItem, ExamKind } from '../../types';
import { DEFAULT_EXAM_ITEMS, EXAM_FORMATS, EXAM_KINDS, examName, fmtMinutes } from '../../utils';
import { Button, ErrorText, FormCard, Header, Icon, IconButton, Input, Segmented, SubjectSelect, useColors, useS } from '../../ui';

const rid = () => Math.random().toString(36).slice(2, 9);
const at = (days: number, h = 7, m = 30) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; };

export default function ExamForm() {
  const { id } = (useRoute().params ?? {}) as { id?: string };
  const nav = useNavigation<any>();
  const { exams, subjects, addExam, updateExam } = useStore();
  const s = useS();
  const c = useColors();
  const old = exams.find((x) => x.id === id);

  const [subjectId, setSubjectId] = useState(old?.subjectId);
  const [kind, setKind] = useState<ExamKind>(old?.kind ?? 'midterm');
  const [title, setTitle] = useState(old?.title ?? '');
  const [date, setDate] = useState(old ? new Date(old.date) : at(7));
  const [duration, setDuration] = useState(old?.durationMin ?? 90);
  const [room, setRoom] = useState(old?.room ?? '');
  const [seat, setSeat] = useState(old?.seatNumber ?? '');
  const [format, setFormat] = useState(old?.format ?? '');
  const [items, setItems] = useState<ChecklistItem[]>(old?.checklist ?? DEFAULT_EXAM_ITEMS.map((text) => ({ id: rid(), text, done: false })));
  const [newItem, setNewItem] = useState('');
  const [notes, setNotes] = useState(old?.notes ?? '');
  const [error, setError] = useState('');

  const setDatePart = (d: Date) => { const n = new Date(date); n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setDate(n); };
  const setTimePart = (d: Date) => { const n = new Date(date); n.setHours(d.getHours(), d.getMinutes(), 0, 0); setDate(n); };
  const addItem = () => { const t = newItem.trim(); if (!t) return; setItems((x) => [...x, { id: rid(), text: t, done: false }]); setNewItem(''); };

  const submit = async () => {
    if (!subjectId && !title.trim()) return setError('Hãy chọn môn học hoặc nhập tên kỳ thi');
    const pending = newItem.trim() ? [...items, { id: rid(), text: newItem.trim(), done: false }] : items;
    const data = { subjectId, kind, title: title.trim(), date: date.toISOString(), durationMin: duration, room: room.trim(), seatNumber: seat.trim(), format, checklist: pending.filter((i) => i.text.trim()), notes: notes.trim() };
    if (id) await updateExam(id, data);
    else await addExam(data);
    nav.goBack();
  };

  const auto = examName({ title: '', kind, subjectId }, subjects);
  const endTime = new Date(date.getTime() + duration * 60000);
  const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Header
        kicker={id ? 'Sửa kỳ thi' : 'Kỳ thi mới'}
        title={examName({ title, kind, subjectId }, subjects)}
        sub={`${date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })} · ${hm(date)} – ${hm(endTime)}`}
        color={subjects.find((x) => x.id === subjectId)?.color}
      />

      <View style={{ height: 8 }} />
      <FormCard icon="book" title="Môn học">
        <SubjectSelect value={subjectId} onChange={setSubjectId} noneLabel="Chọn môn học" />
        <View style={{ height: 8 }} />
        <Input icon="create-outline" placeholder="Tên kỳ thi (không bắt buộc), VD: Thi giữa kỳ lần 2" value={title} onChangeText={setTitle} containerStyle={{ marginBottom: 0 }} />
      </FormCard>

      <FormCard icon="ribbon" title="Loại kỳ thi">
        <Segmented<ExamKind> value={kind} onChange={setKind} options={(Object.keys(EXAM_KINDS) as ExamKind[]).map((k) => ({ key: k, label: EXAM_KINDS[k] }))} />
      </FormCard>

      <FormCard icon="calendar" title="Ngày và giờ thi">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1.3 }}><DateTimeField mode="date" value={date} onChange={setDatePart} /></View>
          <View style={{ flex: 1 }}><DateTimeField mode="time" value={date} onChange={setTimePart} /></View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: c.text, fontWeight: '600' }}>Thời gian làm bài</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconButton name="remove-circle-outline" size={28} color={c.text} onPress={() => setDuration(Math.max(15, duration - 15))} />
            <Text style={{ color: c.text, fontWeight: '800', minWidth: 78, textAlign: 'center' }}>{fmtMinutes(duration)}</Text>
            <IconButton name="add-circle-outline" size={28} color={c.text} onPress={() => setDuration(Math.min(360, duration + 15))} />
          </View>
        </View>
      </FormCard>

      <FormCard icon="location" title="Phòng thi và số báo danh">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}><Input icon="location-outline" placeholder="Phòng thi" value={room} onChangeText={setRoom} containerStyle={{ marginBottom: 0 }} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><Input icon="id-card-outline" placeholder="Số báo danh" value={seat} onChangeText={setSeat} autoCapitalize="characters" containerStyle={{ marginBottom: 0 }} /></View>
        </View>
      </FormCard>

      <FormCard icon="document-text" title="Hình thức thi">
        <Segmented<string>
          value={format}
          onChange={(k) => setFormat(k === format ? '' : k)}
          options={EXAM_FORMATS.map((f) => ({ key: f, label: f }))}
        />
      </FormCard>

      <FormCard icon="bag-check" title={`Mang theo${items.length ? ` · ${items.length}` : ''}`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
          {items.map((it) => (
            <Pressable key={it.id} onPress={() => setItems((x) => x.filter((q) => q.id !== it.id))} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingLeft: 11, paddingRight: 8, borderRadius: 8, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, marginRight: 6, marginBottom: 6, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: c.text, fontSize: 13 }}>{it.text}</Text>
              <Icon name="close" size={14} color={c.muted} />
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Input icon="add" placeholder="Thêm đồ cần mang" value={newItem} onChangeText={setNewItem} onSubmitEditing={addItem} returnKeyType="done" blurOnSubmit={false} containerStyle={{ marginBottom: 0 }} />
          </View>
          <Pressable onPress={addItem} accessibilityLabel="Thêm đồ" style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : newItem.trim() ? 1 : 0.45 })}>
            <Icon name="add" size={24} color={c.onPrimary} />
          </Pressable>
        </View>
        <Text style={[s.sub, { marginTop: 8 }]}>Chạm vào một món để bỏ. App nhắc tối hôm trước và trước giờ thi 2 tiếng, kèm các món chưa chuẩn bị.</Text>
      </FormCard>

      <FormCard icon="reader" title="Ghi chú">
        <Input placeholder="Phạm vi ôn, tài liệu được mang vào phòng thi..." value={notes} onChangeText={setNotes} multiline style={{ minHeight: 80, textAlignVertical: 'top', marginBottom: 0 }} />
      </FormCard>

      <ErrorText text={error} />
      <Button icon="checkmark-circle" title={id ? 'Lưu thay đổi' : 'Thêm kỳ thi'} onPress={submit} />
      <Button icon="close" title="Hủy" color={c.muted} onPress={() => nav.goBack()} />
    </ScrollView>
  );
}

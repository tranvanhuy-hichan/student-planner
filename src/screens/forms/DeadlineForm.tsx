import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { DateTimeField } from '../../DateTimeField';
import { useStore } from '../../store';
import type { DeadlineType, Priority } from '../../types';
import { PRIORITIES, TYPES, TYPE_ICONS, timeLeft } from '../../utils';
import { BigInput, Button, Chip, Chips, ErrorText, FormCard, Icon, Input, Pill, Segmented, SubjectPicker, useColors, useS } from '../../ui';

const at = (days: number, h = 23, m = 59) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; };

export default function DeadlineForm() {
  const { id, subjectId: defSubject } = (useRoute().params ?? {}) as { id?: string; subjectId?: string };
  const nav = useNavigation<any>();
  const { deadlines, addDeadline, updateDeadline } = useStore();
  const s = useS();
  const c = useColors();
  const old = deadlines.find((x) => x.id === id);

  const [title, setTitle] = useState(old?.title ?? '');
  const [notes, setNotes] = useState(old?.notes ?? '');
  const [subjectId, setSubjectId] = useState(old?.subjectId ?? defSubject);
  const [type, setType] = useState<DeadlineType>(old?.type ?? 'assignment');
  const [priority, setPriority] = useState<Priority>(old?.priority ?? 'medium');
  const [due, setDue] = useState(old ? new Date(old.due) : at(1));
  const [error, setError] = useState('');

  const setDatePart = (d: Date) => { const n = new Date(due); n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setDue(n); };
  const setTimePart = (d: Date) => { const n = new Date(due); n.setHours(d.getHours(), d.getMinutes(), 0, 0); setDue(n); };

  const submit = async () => {
    if (!title.trim()) return setError('Vui lòng nhập tên bài tập / kỳ thi');
    const data = { title: title.trim(), notes: notes.trim(), subjectId, type, priority, due: due.toISOString() };
    if (id) await updateDeadline(id, data);
    else await addDeadline(data);
    nav.goBack();
  };

  const quick = [
    { label: 'Hôm nay', d: at(0) },
    { label: 'Ngày mai', d: at(1) },
    { label: '3 ngày', d: at(3) },
    { label: '1 tuần', d: at(7) },
  ];
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const pr = PRIORITIES[priority];

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={{ marginBottom: 20 }}>
        <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: pr.color, marginBottom: 10 }} />
        <BigInput value={title} onChangeText={setTitle} placeholder="Tên bài tập / kỳ thi" multiline />
        <Text style={s.sub}>
          {due.toLocaleString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })} · {timeLeft(due.toISOString())}
        </Text>
      </View>

      <FormCard icon="shapes" title="Loại">
        <Segmented<DeadlineType>
          value={type}
          onChange={setType}
          options={(Object.keys(TYPES) as DeadlineType[]).map((k) => ({ key: k, label: TYPES[k].split(' / ')[0], icon: TYPE_ICONS[k] }))}
        />
      </FormCard>

      <FormCard icon="book" title="Môn học">
        <SubjectPicker value={subjectId} onChange={setSubjectId} wrap />
      </FormCard>

      <FormCard icon="calendar" title="Hạn nộp">
        <Chips>{quick.map((q) => <Chip key={q.label} label={q.label} active={sameDay(due, q.d)} onPress={() => setDue(new Date(q.d.getFullYear(), q.d.getMonth(), q.d.getDate(), due.getHours(), due.getMinutes()))} />)}</Chips>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1.3 }}><DateTimeField mode="date" value={due} onChange={setDatePart} /></View>
          <View style={{ flex: 1 }}><DateTimeField mode="time" value={due} onChange={setTimePart} /></View>
        </View>
      </FormCard>

      <FormCard icon="flag" title="Mức ưu tiên">
        <Segmented<Priority>
          value={priority}
          onChange={setPriority}
          options={(Object.keys(PRIORITIES) as Priority[]).map((k) => ({ key: k, label: PRIORITIES[k].label, color: PRIORITIES[k].color, icon: 'flag' }))}
        />
      </FormCard>

      <FormCard icon="reader" title="Mô tả">
        <Input placeholder="Ghi chú thêm (không bắt buộc)" value={notes} onChangeText={setNotes} multiline style={{ minHeight: 90, textAlignVertical: 'top', marginBottom: 0 }} />
      </FormCard>

      <ErrorText text={error} />
      <Button icon="checkmark-circle" title={id ? 'Lưu thay đổi' : 'Thêm deadline'} onPress={submit} />
      <Button icon="close" title="Hủy" color={c.muted} onPress={() => nav.goBack()} />
    </ScrollView>
  );
}

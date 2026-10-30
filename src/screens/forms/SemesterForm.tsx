import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { DateTimeField } from '../../DateTimeField';
import { useStore } from '../../store';
import { BigInput, Button, Chip, Chips, confirm, ErrorText, FormCard, IconButton, useColors, useS } from '../../ui';

/** Gợi ý tên học kỳ theo năm học hiện tại (năm học bắt đầu từ tháng 8) */
function suggestions() {
  const now = new Date();
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return [`HK1 ${y}-${y + 1}`, `HK2 ${y}-${y + 1}`, `HK hè ${y}-${y + 1}`];
}

function OptionalDate({ label, value, onChange }: { label: string; value?: Date; onChange: (d?: Date) => void }) {
  const c = useColors();
  const s = useS();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.sub, { marginBottom: 6, marginTop: 0 }]}>{label}</Text>
      {value ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}><DateTimeField mode="date" value={value} onChange={onChange} /></View>
          <IconButton name="close" color={c.muted} onPress={() => onChange(undefined)} />
        </View>
      ) : (
        <Button icon="add" title="Chọn ngày" color={c.muted} onPress={() => onChange(new Date())} />
      )}
    </View>
  );
}

export default function SemesterForm() {
  const { id } = (useRoute().params ?? {}) as { id?: string };
  const nav = useNavigation<any>();
  const { semesters, currentSemesterId, subjects, addSemester, updateSemester, setCurrentSemester, archiveSemester, removeSemester } = useStore();
  const s = useS();
  const c = useColors();
  const old = semesters.find((x) => x.id === id);

  const [name, setName] = useState(old?.name ?? '');
  const [start, setStart] = useState<Date | undefined>(old?.start ? new Date(old.start) : undefined);
  const [end, setEnd] = useState<Date | undefined>(old?.end ? new Date(old.end) : undefined);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) return setError('Vui lòng nhập tên học kỳ');
    if (start && end && end < start) return setError('Ngày kết thúc phải sau ngày bắt đầu');
    const data = { name: name.trim(), start: start?.toISOString(), end: end?.toISOString() };
    if (id) updateSemester(id, data);
    else await addSemester(data.name, data.start, data.end);
    nav.goBack();
  };

  const isCurrent = id === currentSemesterId;
  const count = id ? subjects.filter((x) => x.semesterId === id).length : 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={{ marginBottom: 14 }}>
        <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: c.primary, marginBottom: 10 }} />
        <BigInput value={name} onChangeText={setName} placeholder="Tên học kỳ" />
        {!id && <Text style={s.sub}>Học kỳ mới sẽ được chọn làm học kỳ đang dùng.</Text>}
      </View>

      {!id && (
        <FormCard icon="flash" title="Gợi ý">
          <Chips>{suggestions().map((t) => <Chip key={t} label={t} active={name === t} onPress={() => setName(t)} />)}</Chips>
        </FormCard>
      )}

      <FormCard icon="calendar" title="Thời gian (không bắt buộc)">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <OptionalDate label="Bắt đầu" value={start} onChange={setStart} />
          <OptionalDate label="Kết thúc" value={end} onChange={setEnd} />
        </View>
      </FormCard>

      <ErrorText text={error} />
      <Button icon="checkmark-circle" title={id ? 'Lưu thay đổi' : 'Tạo học kỳ'} onPress={submit} />

      {old && (
        <View style={{ marginTop: 18 }}>
          <Text style={[s.kicker, { marginBottom: 10 }]}>Quản lý học kỳ</Text>
          {!isCurrent && !old.archived && <Button icon="swap-horizontal" title="Dùng học kỳ này" onPress={async () => { await setCurrentSemester(old.id); nav.goBack(); }} />}
          <Button
            icon={old.archived ? 'arrow-undo-outline' : 'archive-outline'}
            title={old.archived ? 'Bỏ lưu trữ' : 'Lưu trữ học kỳ'}
            color={c.muted}
            onPress={async () => { await archiveSemester(old.id, !old.archived); nav.goBack(); }}
          />
          {!old.archived && <Text style={[s.sub, { marginBottom: 12 }]}>Học kỳ lưu trữ vẫn giữ nguyên điểm để tính GPA tích lũy, nhưng không còn nhắc lịch học hay deadline.</Text>}
          {semesters.length > 1 && (
            <Button icon="trash-outline" title="Xóa học kỳ" color={c.danger}
              onPress={() => confirm(`Xóa “${old.name}”? ${count ? `${count} môn học cùng lịch, deadline và ghi chú của kỳ này sẽ bị xóa.` : ''}`, async () => { nav.goBack(); await removeSemester(old.id); })} />
          )}
        </View>
      )}
    </ScrollView>
  );
}

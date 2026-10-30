import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { showAlert } from '../../dialog';
import { DateTimeField } from '../../DateTimeField';
import { useStore } from '../../store';
import { DAYS, fromHHMM, toHHMM } from '../../utils';
import { Button, ErrorText, FormCard, Input, Pill, SubjectPicker, useColors, useS, Header } from '../../ui';

export default function ClassForm() {
  const { id, weekday: defDay } = (useRoute().params ?? {}) as { id?: string; weekday?: number };
  const nav = useNavigation<any>();
  const { classes, subjects, addClass, updateClass } = useStore();
  const s = useS();
  const c = useColors();
  const old = classes.find((x) => x.id === id);

  const [subjectId, setSubjectId] = useState(old?.subjectId);
  const [room, setRoom] = useState(old?.room ?? '');
  const [weekday, setWeekday] = useState(old?.weekday ?? defDay ?? new Date().getDay() + 1);
  const [start, setStart] = useState(fromHHMM(old?.start ?? '07:30'));
  const [end, setEnd] = useState(fromHHMM(old?.end ?? '09:00'));
  const [error, setError] = useState('');

  const sub = subjects.find((x) => x.id === subjectId);
  const color = sub?.color ?? '#6b7280';
  const mins = (end.getHours() * 60 + end.getMinutes()) - (start.getHours() * 60 + start.getMinutes());
  const durText = mins > 0 ? `${mins >= 60 ? `${Math.floor(mins / 60)} giờ ` : ''}${mins % 60 ? `${mins % 60} phút` : ''}`.trim() : '';

  const save = async (data: Parameters<typeof addClass>[0]) => {
    if (id) await updateClass(id, data);
    else await addClass(data);
    nav.goBack();
  };

  const submit = async () => {
    if (!subjectId) return setError('Vui lòng chọn môn học');
    if (mins <= 0) return setError('Giờ kết thúc phải sau giờ bắt đầu');
    const data = { subjectId, room: room.trim(), weekday, start: toHHMM(start), end: toHHMM(end) };
    const clash = classes.find((x) => x.id !== id && x.weekday === weekday && x.start < data.end && x.end > data.start);
    if (clash) {
      const name = subjects.find((x) => x.id === clash.subjectId)?.name ?? 'một môn khác';
      return showAlert('Trùng giờ học', `Trùng với ${name} (${clash.start}–${clash.end}).`, [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Vẫn lưu', onPress: () => save(data) },
      ]);
    }
    await save(data);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Header
        kicker={DAYS.find((d) => d.v === weekday)?.full}
        title={sub?.name ?? 'Chọn môn học'}
        sub={`${toHHMM(start)} – ${toHHMM(end)}${durText ? ` · ${durText}` : ''}${room.trim() ? ` · ${room.trim()}` : ''}`}
        color={color}
      />

      <FormCard icon="book" title="Môn học">
        <SubjectPicker value={subjectId} onChange={setSubjectId} allowNone={false} wrap />
        {subjects.length === 0 && <Button icon="add-circle" title="Thêm môn học" onPress={() => nav.navigate('SubjectForm')} />}
      </FormCard>

      <FormCard icon="calendar" title="Thứ trong tuần">
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DAYS.map((d) => {
            const active = weekday === d.v;
            return (
              <Pressable key={d.v} onPress={() => setWeekday(d.v)} style={{ flex: 1 }}>
                <View style={{ alignItems: 'center', paddingVertical: 12, borderRadius: 8, backgroundColor: active ? color : c.chip }}>
                  <Text style={{ color: active ? '#fff' : c.text, fontWeight: '800' }}>{d.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </FormCard>

      <FormCard icon="time" title="Thời gian">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[s.sub, { marginBottom: 6 }]}>Bắt đầu</Text>
            <DateTimeField mode="time" value={start} onChange={setStart} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.sub, { marginBottom: 6 }]}>Kết thúc</Text>
            <DateTimeField mode="time" value={end} onChange={setEnd} />
          </View>
        </View>
        {!!durText && <Pill text={`Thời lượng ${durText}`} color={color} icon="hourglass-outline" />}
      </FormCard>

      <FormCard icon="location" title="Phòng học">
        <Input icon="location-outline" placeholder="VD: A2-301" value={room} onChangeText={setRoom} style={{ marginBottom: 0 }} />
      </FormCard>

      <Text style={[s.sub, { textAlign: 'center', marginBottom: 10 }]}>Ứng dụng nhắc bạn trước giờ học và lặp lại hằng tuần.</Text>
      <ErrorText text={error} />
      <Button icon="checkmark-circle" title={id ? 'Lưu thay đổi' : 'Thêm tiết học'} onPress={submit} />
      <Button icon="close" title="Hủy" color={c.muted} onPress={() => nav.goBack()} />
    </ScrollView>
  );
}

import { useNavigation, useRoute } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useStore } from '../../store';
import { fmtDateTime, PRIORITIES, timeLeft, TYPES, TYPE_ICONS } from '../../utils';
import { Button, Card, confirm, IconBadge, IconButton, InfoRow, Section, useColors, useS, Header } from '../../ui';

export default function DeadlineDetail() {
  const { id } = useRoute().params as { id: string };
  const nav = useNavigation<any>();
  const { deadlines, subjects, settings, toggleDeadline, removeDeadline } = useStore();
  const s = useS();
  const c = useColors();
  const d = deadlines.find((x) => x.id === id);
  const sub = subjects.find((x) => x.id === d?.subjectId);

  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <IconButton name="create-outline" color={c.primary} size={24} onPress={() => nav.navigate('DeadlineForm', { id })} /> });
  }, [nav, id, c]);

  if (!d) return null;
  const overdue = !d.done && new Date(d.due) < new Date();
  const pr = PRIORITIES[d.priority];
  const tone = d.done ? c.success : overdue ? c.danger : pr.color;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Header
        kicker={d.done ? 'Đã hoàn thành' : overdue ? `Quá hạn · ${timeLeft(d.due).replace('quá hạn ', '')}` : timeLeft(d.due)}
        title={d.title}
        color={tone}
      />

      <View>
        <InfoRow icon="calendar" label="Hạn nộp" value={fmtDateTime(d.due)} />
        <InfoRow icon="book" label="Môn học" value={sub?.name ?? 'Chưa gắn môn'} color={sub?.color} />
        <InfoRow icon={TYPE_ICONS[d.type]} label="Loại" value={TYPES[d.type]} />
        <InfoRow icon="flag" label="Mức ưu tiên" value={pr.label} color={pr.color} />
        <InfoRow icon={settings.notifications ? 'notifications' : 'notifications-off'} label="Nhắc nhở" value={settings.notifications ? `Trước hạn ${settings.deadlineLeadHours} giờ` : 'Thông báo đang tắt'} />
      </View>

      {!!d.notes && (
        <>
          <Section text="Mô tả" />
          <Text style={{ color: c.text, lineHeight: 22, fontSize: 15 }} selectable>{d.notes}</Text>
        </>
      )}

      <View style={{ height: 14 }} />
      <Button icon={d.done ? 'refresh' : 'checkmark-circle'} title={d.done ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'} color={d.done ? c.muted : c.success} onPress={() => toggleDeadline(id)} />
      <Button icon="create" title="Chỉnh sửa" onPress={() => nav.navigate('DeadlineForm', { id })} />
      <Button icon="trash" title="Xóa deadline" color={c.danger} onPress={() => confirm('Xóa deadline này?', async () => { nav.goBack(); await removeDeadline(id); })} />
    </ScrollView>
  );
}

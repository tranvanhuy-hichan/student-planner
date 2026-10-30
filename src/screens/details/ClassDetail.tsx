import { useNavigation, useRoute } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useStore } from '../../store';
import { DAYS } from '../../utils';
import { Button, Card, confirm, IconBadge, IconButton, InfoRow, useColors, useS, Header } from '../../ui';

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

export default function ClassDetail() {
  const { id } = useRoute().params as { id: string };
  const nav = useNavigation<any>();
  const { classes, subjects, settings, removeClass } = useStore();
  const s = useS();
  const c = useColors();
  const cls = classes.find((x) => x.id === id);
  const sub = subjects.find((x) => x.id === cls?.subjectId);

  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <IconButton name="create-outline" color={c.primary} size={24} onPress={() => nav.navigate('ClassForm', { id })} /> });
  }, [nav, id, c]);

  if (!cls) return null;
  const color = sub?.color ?? '#6b7280';
  const dur = minutes(cls.end) - minutes(cls.start);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Header
        kicker={DAYS.find((d) => d.v === cls.weekday)?.full}
        title={sub?.name ?? 'Môn học'}
        sub={`${cls.start} – ${cls.end}`}
        color={color}
      />

      <View>
        <InfoRow icon="calendar" label="Thứ" value={`${DAYS.find((d) => d.v === cls.weekday)?.full} hằng tuần`} color={color} />
        <InfoRow icon="time" label="Thời gian" value={`${cls.start} – ${cls.end} (${Math.floor(dur / 60) ? `${Math.floor(dur / 60)} giờ ` : ''}${dur % 60 ? `${dur % 60} phút` : ''})`.replace(' )', ')')} color={color} />
        <InfoRow icon="location" label="Phòng học" value={cls.room || 'Chưa có phòng'} color={color} />
        <InfoRow icon="person" label="Giảng viên" value={sub?.teacher || 'Chưa có giảng viên'} color={color} />
        <InfoRow icon={settings.notifications ? 'notifications' : 'notifications-off'} label="Nhắc nhở" value={settings.notifications ? `Trước giờ học ${settings.classLeadMin} phút` : 'Thông báo đang tắt'} color={color} />
      </View>

      <View style={{ height: 14 }} />
      {sub && <Button icon="book" title="Xem môn học" color={color} onPress={() => nav.navigate('SubjectDetail', { id: sub.id })} />}
      <Button icon="create" title="Chỉnh sửa tiết học" onPress={() => nav.navigate('ClassForm', { id })} />
      <Button icon="trash" title="Xóa tiết học" color={c.danger} onPress={() => confirm('Xóa tiết học này?', async () => { nav.goBack(); await removeClass(id); })} />
    </ScrollView>
  );
}

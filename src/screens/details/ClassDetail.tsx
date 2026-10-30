import { useNavigation, useRoute } from '@react-navigation/native';
import { useLayoutEffect, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from '../../store';
import { dayKey } from '../../utils';
import { DAYS } from '../../utils';
import { AbsentMeter, AttBtn, Button, confirm, IconButton, InfoRow, Section, useColors, useS, Header } from '../../ui';

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

export default function ClassDetail() {
  const { id } = useRoute().params as { id: string };
  const nav = useNavigation<any>();
  const { classes, subjects, settings, removeClass, attendance, setAttendance } = useStore();
  const s = useS();
  const c = useColors();
  const cls = classes.find((x) => x.id === id);
  const sub = subjects.find((x) => x.id === cls?.subjectId);

  useLayoutEffect(() => {
    nav.setOptions({ headerRight: () => <IconButton name="create-outline" color={c.primary} size={24} onPress={() => nav.navigate('ClassForm', { id })} /> });
  }, [nav, id, c]);

  // 6 buổi gần nhất (tính cả hôm nay) rơi vào thứ của tiết học này
  const dates = useMemo(() => {
    const out: Date[] = [];
    const d = new Date();
    for (let i = 0; i < 70 && out.length < 6; i++) {
      if (cls && d.getDay() + 1 === cls.weekday) out.push(new Date(d));
      d.setDate(d.getDate() - 1);
    }
    return out;
  }, [cls?.weekday]);

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

      {/* Điểm danh */}
      <Section text="Điểm danh" />
      {sub && (sub.maxAbsent ?? 0) > 0 && (
        <AbsentMeter absent={attendance.filter((a) => a.subjectId === sub.id && a.status === 'absent').length} max={sub.maxAbsent!} />
      )}
      {dates.map((d, i) => {
        const key = dayKey(d);
        const rec = attendance.find((a) => a.classId === cls.id && a.date === key);
        const mark = (status: 'present' | 'absent') => setAttendance(cls.id, cls.subjectId, key, rec?.status === status ? undefined : status);
        return (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i === dates.length - 1 ? 0 : 1, borderBottomColor: c.border }}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{d.getDate()}/{d.getMonth() + 1}{key === dayKey() ? '  ·  Hôm nay' : ''}</Text>
              <Text style={s.sub}>{cls.start} – {cls.end}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <AttBtn label="Có mặt" icon="checkmark" tone={c.success} active={rec?.status === 'present'} onPress={() => mark('present')} />
              <AttBtn label="Vắng" icon="close" tone={c.danger} active={rec?.status === 'absent'} onPress={() => mark('absent')} />
            </View>
          </View>
        );
      })}
      <View style={{ height: 14 }} />
      {sub && <Button icon="book" title="Xem môn học" color={color} onPress={() => nav.navigate('SubjectDetail', { id: sub.id })} />}
      <Button icon="create" title="Chỉnh sửa tiết học" onPress={() => nav.navigate('ClassForm', { id })} />
      <Button icon="trash" title="Xóa tiết học" color={c.danger} onPress={() => confirm('Xóa tiết học này?', async () => { nav.goBack(); await removeClass(id); })} />
    </ScrollView>
  );
}

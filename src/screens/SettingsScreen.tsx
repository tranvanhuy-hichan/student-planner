import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DateTimeField } from '../DateTimeField';
import { sendTestSummary } from '../summary';
import { defaultSettings, profileComplete, useStore } from '../store';
import { fromHHMM, toHHMM } from '../utils';
import type { IconName } from '../types';
import { notifyNow } from '../notifications';
import { confirm, Icon, Input, Button, Segmented, useColors, useS } from '../ui';

/** Nhóm cài đặt: tiêu đề nhỏ + khung phẳng chứa các hàng */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const s = useS();
  const c = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[s.kicker, { marginBottom: 8, marginLeft: 2 }]}>{title}</Text>
      <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.card, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

/** Một hàng: icon, nhãn (+ mô tả), phần điều khiển bên phải */
function Row({ icon, label, hint, right, onPress, danger, last, dim }: {
  icon: IconName; label: string; hint?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean; last?: boolean; dim?: boolean;
}) {
  const c = useColors();
  const tone = danger ? c.danger : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 10, minHeight: 50, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border, opacity: dim ? 0.4 : pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={20} color={danger ? c.danger : c.muted} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: tone, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        {!!hint && <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{hint}</Text>}
      </View>
      {right ?? (onPress && !danger ? <Icon name="chevron-forward" size={18} color={c.muted} /> : null)}
    </Pressable>
  );
}

/** Nút −/+ gọn, số ở giữa */
function Stepper({ value, min, max, step = 1, unit, onChange }: { value: number; min: number; max: number; step?: number; unit: string; onChange: (n: number) => void }) {
  const c = useColors();
  const btn = (name: IconName, next: number, off: boolean) => (
    <Pressable onPress={() => onChange(next)} disabled={off} hitSlop={6} style={{ width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.35 : 1 }}>
      <Icon name={name} size={16} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {btn('remove', Math.max(min, value - step), value <= min)}
      <Text style={{ color: c.text, fontWeight: '800', minWidth: 62, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{value} {unit}</Text>
      {btn('add', Math.min(max, value + step), value >= max)}
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, setSettings, exportData, importData, resetAll, subjects, classes, deadlines, notes, profile, semesters, currentSemesterId } = useStore();
  const nav = useNavigation<any>();
  const semester = semesters.find((x) => x.id === currentSemesterId);
  const s = useS();
  const c = useColors();
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const off = !settings.notifications;

  const resetPomodoro = () =>
    setSettings({ workMin: defaultSettings.workMin, shortBreakMin: defaultSettings.shortBreakMin, longBreakMin: defaultSettings.longBreakMin, longEvery: defaultSettings.longEvery });

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Group title="Hồ sơ & học kỳ">
        <Row
          icon="person-circle-outline"
          label={profile.name.trim() || 'Hồ sơ sinh viên'}
          hint={profileComplete(profile) ? `${profile.school} · ${profile.className}${profile.studentId ? ` · ${profile.studentId}` : ''}` : 'Chưa lưu trường và lớp — bấm để thêm'}
          onPress={() => nav.navigate('Profile')}
          right={!profileComplete(profile) ? <Icon name="alert-circle" size={20} color={c.warning} /> : undefined}
        />
        <Row icon="school-outline" label="Học kỳ" hint={`${semester?.name ?? '—'} · ${semesters.length} học kỳ`} last onPress={() => nav.navigate('SemesterList')} />
      </Group>

      <Group title="Giao diện">
        <View style={{ padding: 14 }}>
          <Segmented<'system' | 'light' | 'dark'>
            value={settings.theme}
            onChange={(k) => setSettings({ theme: k })}
            options={[
              { key: 'system', label: 'Hệ thống', icon: 'phone-portrait-outline' },
              { key: 'light', label: 'Sáng', icon: 'sunny-outline' },
              { key: 'dark', label: 'Tối', icon: 'moon-outline' },
            ]}
          />
          <Text style={[s.sub, { marginTop: -2 }]}>Chọn “Hệ thống” để tự đổi theo chế độ sáng/tối của điện thoại.</Text>
        </View>
      </Group>

      <Group title="Thông báo">
        <Row
          icon={off ? 'notifications-off-outline' : 'notifications-outline'}
          label="Bật thông báo"
          hint="Nhắc giờ học, hạn nộp và hết giờ Pomodoro"
          right={<Switch value={settings.notifications} onValueChange={(v) => setSettings({ notifications: v })} trackColor={{ true: c.primary, false: c.chip }} />}
        />
        <View style={{ opacity: off ? 0.4 : 1, borderBottomWidth: 1, borderBottomColor: c.border }} pointerEvents={off ? 'none' : 'auto'}>
          <View style={{ padding: 14, paddingBottom: 4 }}>
            <View style={[s.row, { marginBottom: 10 }]}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>Nhắc trước giờ học</Text>
              <Text style={{ color: c.primary, fontWeight: '800' }}>{settings.classLeadMin} phút</Text>
            </View>
            <Segmented<string>
              value={String(settings.classLeadMin)}
              onChange={(k) => setSettings({ classLeadMin: Number(k) })}
              options={[5, 10, 15, 30, 60].map((n) => ({ key: String(n), label: `${n}′` }))}
            />
          </View>
          <View style={{ padding: 14, paddingTop: 4 }}>
            <View style={[s.row, { marginBottom: 10 }]}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>Nhắc trước hạn nộp</Text>
              <Text style={{ color: c.primary, fontWeight: '800' }}>{settings.deadlineLeadHours} giờ</Text>
            </View>
            <Segmented<string>
              value={String(settings.deadlineLeadHours)}
              onChange={(k) => setSettings({ deadlineLeadHours: Number(k) })}
              options={[1, 3, 12, 24, 48].map((n) => ({ key: String(n), label: `${n}h` }))}
            />
          </View>
        </View>
        <Row
          icon="sunny-outline"
          label="Tóm tắt buổi sáng"
          hint="Mỗi sáng: số tiết, deadline và tiết đầu tiên"
          dim={off}
          right={<Switch disabled={off} value={settings.morningSummary} onValueChange={(v) => setSettings({ morningSummary: v })} trackColor={{ true: c.primary, false: c.chip }} />}
        />
        {settings.morningSummary && (
          <Row
            icon="time-outline"
            label="Giờ gửi tóm tắt"
            dim={off}
            right={<View pointerEvents={off ? 'none' : 'auto'}><DateTimeField mode="time" value={fromHHMM(settings.morningTime)} onChange={(d) => setSettings({ morningTime: toHHMM(d) })} style={{ width: 96, marginBottom: 0 }} /></View>}
          />
        )}
        <Row icon="newspaper-outline" label="Xem thử bản tóm tắt hôm nay" dim={off} onPress={off ? undefined : sendTestSummary} />
        <Row icon="paper-plane-outline" label="Gửi thông báo thử" dim={off} last onPress={off ? undefined : () => notifyNow('Student Planner', 'Thông báo hoạt động bình thường')} />
      </Group>

      <Group title="Pomodoro">
        <Row icon="flame-outline" label="Tập trung" right={<Stepper value={settings.workMin} min={5} max={90} step={5} unit="phút" onChange={(n) => setSettings({ workMin: n })} />} />
        <Row icon="cafe-outline" label="Nghỉ ngắn" right={<Stepper value={settings.shortBreakMin} min={1} max={30} unit="phút" onChange={(n) => setSettings({ shortBreakMin: n })} />} />
        <Row icon="leaf-outline" label="Nghỉ dài" right={<Stepper value={settings.longBreakMin} min={5} max={60} step={5} unit="phút" onChange={(n) => setSettings({ longBreakMin: n })} />} />
        <Row icon="repeat-outline" label="Nghỉ dài sau" right={<Stepper value={settings.longEvery} min={2} max={8} unit="phiên" onChange={(n) => setSettings({ longEvery: n })} />} />
        <Row icon="refresh-outline" label="Khôi phục mặc định" last onPress={resetPomodoro} />
      </Group>

      <Group title="Dữ liệu">
        <Row
          icon="albums-outline"
          label="Đang lưu trên máy"
          hint={`${subjects.length} môn học · ${classes.length} tiết · ${deadlines.length} deadline · ${notes.length} ghi chú`}
        />
        <Row icon="share-outline" label="Xuất bản sao lưu" hint="Chia sẻ hoặc sao chép để lưu ở nơi khác" onPress={() => Share.share({ message: exportData() })} />
        <Row icon="cloud-download-outline" label="Khôi phục từ bản sao lưu" last={!showImport} onPress={() => setShowImport((v) => !v)}
          right={<Icon name={showImport ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />} />
        {showImport && (
          <View style={{ padding: 14, paddingTop: 4 }}>
            <Input placeholder="Dán nội dung bản sao lưu vào đây..." value={importText} onChangeText={setImportText} multiline style={{ minHeight: 90, textAlignVertical: 'top' }} />
            <Button
              icon="checkmark"
              title="Khôi phục"
              onPress={() =>
                confirm('Thay thế toàn bộ dữ liệu hiện tại?', async () => {
                  const err = await importData(importText.trim());
                  if (err) Alert.alert('Không khôi phục được', err);
                  else { setImportText(''); setShowImport(false); Alert.alert('Đã khôi phục dữ liệu'); }
                }, 'Khôi phục')
              }
            />
          </View>
        )}
      </Group>

      <Group title="Khu vực nguy hiểm">
        <Row icon="trash-outline" danger last label="Xóa toàn bộ dữ liệu" hint="Môn học, lịch học, deadline, ghi chú và thống kê"
          onPress={() => confirm('Xóa TOÀN BỘ dữ liệu? Không thể hoàn tác.', resetAll)} />
      </Group>

      <Text style={{ color: c.muted, textAlign: 'center', fontSize: 12 }}>Student Planner · Dữ liệu được lưu ngay trên thiết bị của bạn</Text>
    </ScrollView>
  );
}

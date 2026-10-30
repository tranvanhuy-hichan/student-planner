import { useIsFocused, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileComplete, useScoped, useStore } from '../store';
import type { IconName } from '../types';
import { dayKey, examName, fmtCountdown, fmtMinutes, focusStreak, PRIORITIES, timeLeft, toHHMM, weekStart } from '../utils';
import { Empty, Icon, IconButton, ListRow, Pill, Section, useColors, useS } from '../ui';

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const fmtDur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}` : `${Math.max(m, 1)} phút`);

export default function TodayScreen() {
  const { focus, profile, attendance, setAttendance } = useStore();
  const { classes, deadlines, subjects, semester, exams } = useScoped();
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const s = useS();
  const c = useColors();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(id); }, []);

  const hhmm = toHHMM(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayClasses = classes.filter((x) => x.weekday === now.getDay() + 1).sort((a, b) => a.start.localeCompare(b.start));
  const current = todayClasses.find((x) => x.start <= hhmm && hhmm < x.end);
  const next = current ?? todayClasses.find((x) => x.start > hhmm);
  const sub = (id: string) => subjects.find((x) => x.id === id);

  const pending = deadlines.filter((d) => !d.done);
  const overdue = pending.filter((d) => new Date(d.due) < now);
  const upcoming = pending
    .filter((d) => new Date(d.due) >= now && new Date(d.due).getTime() <= now.getTime() + 7 * 86400_000)
    .sort((a, b) => a.due.localeCompare(b.due));
  const today = focus[dayKey()] ?? { sessions: 0, minutes: 0 };
  const streak = focusStreak(focus);
  const nextExam = exams.filter((e) => new Date(e.date).getTime() + e.durationMin * 60000 > Date.now()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const weekMin = Array.from({ length: 7 }, (_, i) => { const d = weekStart(); d.setDate(d.getDate() + i); return focus[dayKey(d)]?.minutes ?? 0; }).reduce((a, b) => a + b, 0);
  const hour = now.getHours();
  const first = profile.name.trim().split(/\s+/).pop();
  const greet = `${hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'}${first ? `, ${first}` : ''}`;

  const links: { icon: IconName; label: string; to: string }[] = [
    { icon: 'calendar-outline', label: 'Lịch tháng', to: 'Lịch' },
    { icon: 'library-outline', label: 'Môn học', to: 'SubjectList' },
    { icon: 'settings-outline', label: 'Cài đặt', to: 'Cài đặt' },
  ];

  const on = c.onPrimary;
  const focused = useIsFocused();

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {focused && <StatusBar style={c.dark ? 'dark' : 'light'} />}

      {/* Khối đầu trang đặc màu chủ đạo, giữ gọn trong khoảng 1/4 màn hình */}
      <View style={{ backgroundColor: c.primary, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 58, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: on + '26' }}>
            <Text style={{ color: on, fontSize: 24, fontWeight: '800', lineHeight: 28, fontVariant: ['tabular-nums'] }}>{now.getDate()}</Text>
            <Text style={{ color: on, opacity: 0.85, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>THG {now.getMonth() + 1}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Pressable onPress={() => nav.navigate('SemesterList')} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text numberOfLines={1} style={{ color: on, opacity: 0.85, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', flexShrink: 1 }}>
                {now.toLocaleDateString('vi-VN', { weekday: 'long' })} · {semester?.name}
              </Text>
              <Icon name="chevron-forward" size={12} color={on} />
            </Pressable>
            <Text style={{ color: on, fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 }}>{greet}</Text>
          </View>
          <IconButton name="settings-outline" size={22} color={on} onPress={() => nav.navigate('Cài đặt')} />
        </View>

        {/* Hồ sơ: tối đa hai dòng, tự xuống dòng khi tên trường dài */}
        <Pressable onPress={() => nav.navigate('Profile')} hitSlop={6} style={{ marginTop: 18, gap: 8 }}>
          {profileComplete(profile) ? (
            <>
              {!!profile.name.trim() && (
                <Text numberOfLines={1} style={{ color: on, fontSize: 14, fontWeight: '800' }}>
                  {profile.name}{profile.studentId ? `  ·  ${profile.studentId}` : ''}
                </Text>
              )}
              <Text style={{ color: on, opacity: 0.9, fontSize: 13, fontWeight: '600', lineHeight: 19 }}>{profile.school} · {profile.className}</Text>
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="person-add-outline" size={15} color={on} />
              <Text style={{ color: on, fontSize: 13, fontWeight: '700', flex: 1 }}>Thêm tên, trường và lớp của bạn</Text>
              <Icon name="chevron-forward" size={14} color={on} />
            </View>
          )}
        </Pressable>

        {/* Tiết đang / sắp diễn ra */}
        <Pressable onPress={() => next && nav.navigate('ClassDetail', { id: next.id })} disabled={!next} style={{ backgroundColor: c.card, borderRadius: 12, padding: 14, marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {next ? (
            <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: sub(next.subjectId)?.color ?? c.primary }} />
          ) : (
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={todayClasses.length ? 'checkmark-done-outline' : 'cafe-outline'} size={20} color={c.primary} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            {next ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={[s.kicker, { color: c.primary }]}>{current ? 'Đang học' : 'Tiết tiếp theo'}</Text>
                  <Pill text={current ? `Còn ${fmtDur(toMin(next.end) - nowMin)}` : `Sau ${fmtDur(toMin(next.start) - nowMin)}`} color={current ? c.success : c.primary} />
                </View>
                <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '800', letterSpacing: -0.3, color: c.text, marginTop: 2 }}>{sub(next.subjectId)?.name ?? 'Môn học'}</Text>
                <Text numberOfLines={1} style={{ color: c.muted, fontSize: 13, marginTop: 2 }}>{next.start} – {next.end} · {next.room || 'Chưa có phòng'}</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 15, fontWeight: '800', color: c.text }}>{todayClasses.length ? 'Đã hết tiết hôm nay' : 'Không có tiết học hôm nay'}</Text>
                <Text style={{ color: c.muted, fontSize: 12, marginTop: 3 }}>{todayClasses.length ? 'Nghỉ ngơi hoặc ôn bài một chút nhé.' : 'Tận hưởng ngày rảnh hoặc ôn bài.'}</Text>
              </>
            )}
          </View>
          {next && <Icon name="chevron-forward" size={18} color={c.muted} />}
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        {/* Lưới 3 cột đều nhau: số liệu và lối tắt cùng một khung */}
        <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, overflow: 'hidden', backgroundColor: c.card }}>
          <View style={{ flexDirection: 'row' }}>
            {[
              { value: String(pending.length), label: 'Đang làm', color: undefined as string | undefined },
              { value: String(overdue.length), label: 'Quá hạn', color: overdue.length ? c.danger : undefined },
              { value: `${today.minutes}′`, label: 'Tập trung', color: undefined },
            ].map((x, i) => (
              <View key={x.label} style={{ flex: 1, height: 62, alignItems: 'center', justifyContent: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: c.border }}>
                <Text numberOfLines={1} style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: x.color ?? c.text, fontVariant: ['tabular-nums'] }}>{x.value}</Text>
                <Text numberOfLines={1} style={[s.sub, { marginTop: 0 }]}>{x.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border }}>
            {links.map((t, i) => (
              <Pressable key={t.to} onPress={() => nav.navigate(t.to)} style={{ flex: 1, height: 62, alignItems: 'center', justifyContent: 'center', gap: 4, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.border }}>
                <Icon name={t.icon} size={22} color={c.primary} />
                <Text numberOfLines={1} style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ListRow onPress={() => nav.navigate('WeeklyReview')}>
          <Icon name="stats-chart-outline" size={20} color={c.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.title}>Tổng kết tuần</Text>
            <Text style={s.sub}>{weekMin ? fmtMinutes(weekMin) : 'Chưa tập trung'} tuần này{streak.current > 0 ? ` · chuỗi ${streak.current} ngày` : ''}</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={c.muted} />
        </ListRow>

        <ListRow onPress={() => nav.navigate('ExamList')}>
          <Icon name="school-outline" size={20} color={c.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.title}>Lịch thi</Text>
            <Text numberOfLines={1} style={s.sub}>
              {nextExam ? `${examName(nextExam, subjects)} · còn ${fmtCountdown(new Date(nextExam.date).getTime() - Date.now(), nextExam.durationMin)}` : 'Chưa có kỳ thi sắp tới'}
            </Text>
          </View>
          <Icon name="chevron-forward" size={18} color={c.muted} />
        </ListRow>

        <Section text="Lịch học hôm nay" />
        {todayClasses.length === 0 && <Empty icon="cafe-outline" text="Không có tiết nào hôm nay" action={{ label: 'Thêm tiết học', onPress: () => nav.navigate('ClassForm', { weekday: now.getDay() + 1 }) }} />}
        {todayClasses.map((x, i) => {
          const sb = sub(x.subjectId);
          return (
            <ListRow key={x.id} last={i === todayClasses.length - 1} onPress={() => nav.navigate('ClassDetail', { id: x.id })}>
              <View style={{ width: 58 }}>
                <Text style={{ color: c.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{x.start}</Text>
                <Text style={{ color: c.muted, fontSize: 12, fontVariant: ['tabular-nums'] }}>{x.end}</Text>
              </View>
              <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 12, backgroundColor: sb?.color ?? c.border }} />
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{sb?.name ?? 'Môn học'}</Text>
                <Text style={s.sub}>{x.room || 'Chưa có phòng'}</Text>
              </View>
              {(sb?.maxAbsent ?? 0) > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8 }}>
                  {([['present', 'checkmark', c.success], ['absent', 'close', c.danger]] as const).map(([st, ic, tone]) => {
                    const rec = attendance.find((a) => a.classId === x.id && a.date === dayKey());
                    const on = rec?.status === st;
                    return (
                      <Pressable key={st} hitSlop={4} onPress={() => setAttendance(x.id, x.subjectId, dayKey(), on ? undefined : st)}
                        style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: on ? tone : c.border, backgroundColor: on ? tone : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={ic} size={16} color={on ? '#fff' : c.muted} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ListRow>
          );
        })}

        <Section text="Deadline cần chú ý" />
        {overdue.length + upcoming.length === 0 && <Empty icon="checkmark-done-outline" text="Không có deadline trong 7 ngày tới" action={{ label: 'Thêm deadline', onPress: () => nav.navigate('DeadlineForm', {}) }} />}
        {[...overdue, ...upcoming].map((d, i, arr) => {
          const late = new Date(d.due) < now;
          return (
            <ListRow key={d.id} last={i === arr.length - 1} onPress={() => nav.navigate('DeadlineDetail', { id: d.id })}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: PRIORITIES[d.priority].color, marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={s.title}>{d.title}</Text>
                <Text style={s.sub}>{sub(d.subjectId ?? '')?.name ?? 'Chưa gắn môn'}</Text>
              </View>
              <Text style={{ color: late ? c.danger : c.primary, fontWeight: '700', fontSize: 13 }}>{timeLeft(d.due)}</Text>
            </ListRow>
          );
        })}
      </View>
    </ScrollView>
  );
}

import { useNavigation } from '@react-navigation/native';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useStore } from '../store';
import { computeGpa } from '../utils';
import { Empty, FAB, Icon, ListRow, Pill, useColors, useS } from '../ui';

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' }) : undefined);

export default function SemesterListScreen() {
  const { semesters, currentSemesterId, subjects, setCurrentSemester } = useStore();
  const nav = useNavigation<any>();
  const s = useS();
  const c = useColors();

  const all = computeGpa(subjects);
  const cum = all.final.credits ? all.final : all.provisional;
  const sorted = [...semesters].sort((a, b) => Number(a.archived) - Number(b.archived) || (b.start ?? '').localeCompare(a.start ?? ''));

  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad}
        data={sorted}
        keyExtractor={(x) => x.id}
        ListHeaderComponent={
          <View style={{ marginBottom: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Text style={s.kicker}>GPA tích lũy toàn khóa</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
              {cum.credits ? (
                <>
                  <Text style={{ fontSize: 40, fontWeight: '800', letterSpacing: -1.5, color: c.primary, fontVariant: ['tabular-nums'] }}>{cum.gpa4.toFixed(2)}</Text>
                  <Text style={{ fontSize: 16, color: c.muted, fontWeight: '600' }}> / 4.0</Text>
                </>
              ) : (
                <Text style={[s.sub, { marginTop: 6 }]}>Nhập điểm cho các môn học để tính GPA.</Text>
              )}
            </View>
            <Text style={[s.sub, { marginTop: 2 }]}>{semesters.length} học kỳ · {subjects.length} môn · {cum.credits} tín chỉ có điểm</Text>
          </View>
        }
        ListEmptyComponent={<Empty icon="school-outline" text="Chưa có học kỳ nào" />}
        renderItem={({ item: x, index }) => {
          const subs = subjects.filter((q) => q.semesterId === x.id);
          const g = computeGpa(subs);
          const gpa = g.final.credits ? g.final : g.provisional;
          const isCur = x.id === currentSemesterId;
          const range = [fmt(x.start), fmt(x.end)].filter(Boolean).join(' – ');
          return (
            <ListRow last={index === sorted.length - 1} onPress={() => nav.navigate('SemesterForm', { id: x.id })}>
              <Pressable
                hitSlop={10}
                disabled={x.archived}
                onPress={() => !isCur && setCurrentSemester(x.id)}
                style={{ marginRight: 14 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isCur ? c.primary : c.border, alignItems: 'center', justifyContent: 'center', opacity: x.archived ? 0.4 : 1 }}>
                  {isCur && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.primary }} />}
                </View>
              </Pressable>
              <View style={{ flex: 1, opacity: x.archived ? 0.6 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={s.title}>{x.name}</Text>
                  {isCur && <Pill text="Đang dùng" color={c.primary} />}
                  {x.archived && <Pill text="Đã lưu trữ" color={c.muted} icon="archive-outline" />}
                </View>
                <Text style={s.sub}>{range || 'Chưa đặt thời gian'}</Text>
                <Text style={[s.sub, { fontSize: 12 }]}>{subs.length} môn học · {gpa.credits} tín chỉ có điểm</Text>
              </View>
              {gpa.credits > 0 && <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, marginRight: 8, fontVariant: ['tabular-nums'] }}>{gpa.gpa4.toFixed(2)}</Text>}
              <Icon name="chevron-forward" size={18} color={c.muted} />
            </ListRow>
          );
        }}
      />
      <FAB bottom={28} onPress={() => nav.navigate('SemesterForm', {})} />
    </View>
  );
}

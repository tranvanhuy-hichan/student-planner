import { useNavigation } from '@react-navigation/native';
import { FlatList, Text, View } from 'react-native';
import { useScoped, useStore } from '../store';
import { computeGpa, subjectResult } from '../utils';
import { Empty, FAB, Icon, ListRow, useColors, useS } from '../ui';

export default function SubjectListScreen() {
  const all = useStore((st) => st.subjects);
  const { subjects, classes, deadlines, semester } = useScoped();
  const nav = useNavigation<any>();
  const s = useS();
  const c = useColors();

  const g = computeGpa(subjects);
  const cumAll = computeGpa(all);
  const cum = cumAll.final.credits ? cumAll.final : cumAll.provisional;
  const hasFinal = g.final.credits > 0;
  const shown = hasFinal ? g.final : g.provisional;

  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad}
        data={subjects}
        keyExtractor={(x) => x.id}
        ListHeaderComponent={
          <View style={{ marginBottom: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Text style={s.kicker}>GPA {semester?.name ?? 'học kỳ'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
              {shown.credits ? (
                <>
                  <Text style={{ fontSize: 40, fontWeight: '800', letterSpacing: -1.5, color: c.primary, fontVariant: ['tabular-nums'] }}>{shown.gpa4.toFixed(2)}</Text>
                  <Text style={{ fontSize: 16, color: c.muted, fontWeight: '600' }}> / 4.0</Text>
                </>
              ) : (
                <Text style={[s.sub, { marginTop: 6 }]}>Nhập điểm vào cột điểm của môn học để tự tính GPA.</Text>
              )}
            </View>
            <Text style={[s.sub, { marginTop: 2 }]}>
              {subjects.length} môn · {subjects.reduce((a, x) => a + x.credits, 0)} tín chỉ{shown.credits ? ` · TB ${shown.avg10.toFixed(1)}/10` : ''}
              {all.length > subjects.length && cum.credits > 0 ? ` · Tích lũy ${cum.gpa4.toFixed(2)}` : ''}
            </Text>
            {g.partial > 0 && shown.credits > 0 && (
              <Text style={[s.sub, { fontSize: 12 }]}>
                {hasFinal ? `Chỉ tính môn đã đủ điểm; gồm ${g.partial} môn chưa đủ: ${g.provisional.gpa4.toFixed(2)} (tạm tính).` : 'Tạm tính từ các môn chưa đủ điểm.'}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={<Empty icon="library-outline" text="Chưa có môn học nào. Bấm + để thêm." />}
        renderItem={({ item: x, index }) => {
          const nClass = classes.filter((q) => q.subjectId === x.id).length;
          const r = subjectResult(x);
          const nDl = deadlines.filter((q) => q.subjectId === x.id && !q.done).length;
          return (
            <ListRow last={index === subjects.length - 1} onPress={() => nav.navigate('SubjectDetail', { id: x.id })}>
              <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: x.color, marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{x.name}</Text>
                <Text style={s.sub}>{x.teacher || 'Chưa có giảng viên'}</Text>
                <Text style={[s.sub, { fontSize: 12 }]}>{x.credits} tín chỉ · {nClass} tiết · {nDl} deadline</Text>
              </View>
              {r.score !== undefined && <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, marginRight: 8, fontVariant: ['tabular-nums'] }}>{r.score.toFixed(1)}{!r.complete ? '*' : ''}</Text>}
              <Icon name="chevron-forward" size={18} color={c.muted} />
            </ListRow>
          );
        }}
      />
      <FAB onPress={() => nav.navigate('SubjectForm', {})} />
    </View>
  );
}

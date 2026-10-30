import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { useScoped, useStore } from '../store';
import type { Deadline } from '../types';
import { PRIORITIES, TYPES, timeLeft } from '../utils';
import { ActiveSubjectFilter, confirm, Empty, FAB, Icon, ListRow, SubjectSelect, TextTabs, useColors, useS } from '../ui';

type Filter = 'todo' | 'done' | 'all';
const ORDER = ['Quá hạn', 'Hôm nay', 'Ngày mai', 'Tuần này', 'Sau này', 'Đã hoàn thành'] as const;
type Bucket = (typeof ORDER)[number];

function bucketOf(d: Deadline, now: Date): Bucket {
  if (d.done) return 'Đã hoàn thành';
  const due = new Date(d.due);
  if (due < now) return 'Quá hạn';
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const days = Math.round((b - a) / 86400_000);
  return days === 0 ? 'Hôm nay' : days === 1 ? 'Ngày mai' : days <= 7 ? 'Tuần này' : 'Sau này';
}

const fmtShort = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function DeadlineScreen() {
  const { toggleDeadline, clearDoneDeadlines } = useStore();
  const { deadlines, subjects } = useScoped();
  const nav = useNavigation<any>();
  const s = useS();
  const c = useColors();
  const [filter, setFilter] = useState<Filter>('todo');
  const [subjectFilter, setSubjectFilter] = useState<string>();
  const now = new Date();

  const count = useMemo(() => {
    const m: Record<string, number> = {};
    deadlines.forEach((d) => { const b = bucketOf(d, now); m[b] = (m[b] ?? 0) + 1; });
    return m;
  }, [deadlines]);
  const total = deadlines.length;
  const done = count['Đã hoàn thành'] ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const rank = { high: 0, medium: 1, low: 2 };
  const sections = useMemo(() => {
    const list = deadlines
      .filter((d) => (filter === 'all' ? true : filter === 'done' ? d.done : !d.done) && (!subjectFilter || d.subjectId === subjectFilter))
      .sort((a, b) => a.due.localeCompare(b.due) || rank[a.priority] - rank[b.priority]);
    return ORDER.map((title) => ({ title, data: list.filter((d) => bucketOf(d, now) === title) })).filter((x) => x.data.length);
  }, [deadlines, filter, subjectFilter]);

  const tone = (t: string) => (t === 'Quá hạn' ? c.danger : t === 'Hôm nay' ? c.primary : t === 'Đã hoàn thành' ? c.success : c.muted);

  return (
    <View style={s.screen}>
      <SectionList
        contentContainerStyle={s.pad}
        sections={sections}
        keyExtractor={(d) => d.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            {/* Tổng quan gọn trong một dòng + thanh tiến độ mỏng */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 16, marginBottom: 8 }}>
              {[
                { value: count['Quá hạn'] ?? 0, label: 'quá hạn', color: count['Quá hạn'] ? c.danger : c.text },
                { value: count['Hôm nay'] ?? 0, label: 'hôm nay', color: count['Hôm nay'] ? c.primary : c.text },
                { value: (count['Ngày mai'] ?? 0) + (count['Tuần này'] ?? 0) + (count['Sau này'] ?? 0), label: 'sắp tới', color: c.text },
              ].map((x) => (
                <View key={x.label} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: x.color, fontVariant: ['tabular-nums'] }}>{x.value}</Text>
                  <Text style={{ fontSize: 13, color: c.muted }}>{x.label}</Text>
                </View>
              ))}
              <Text style={{ marginLeft: 'auto', fontSize: 12, color: c.muted, fontWeight: '600' }}>{done}/{total} xong</Text>
            </View>
            <View style={{ height: 3, backgroundColor: c.chip, borderRadius: 2, marginBottom: 14 }}>
              <View style={{ width: `${pct}%`, height: 3, backgroundColor: c.primary, borderRadius: 2 }} />
            </View>
            <TextTabs<Filter>
              value={filter}
              onChange={setFilter}
              options={[{ key: 'todo', label: 'Đang làm' }, { key: 'done', label: 'Đã xong' }, { key: 'all', label: 'Tất cả' }]}
              right={subjects.length > 0 ? <SubjectSelect variant="filter" value={subjectFilter} onChange={setSubjectFilter} noneLabel="Tất cả các môn" title="Lọc theo môn học" /> : undefined}
            />
            <ActiveSubjectFilter id={subjectFilter} onClear={() => setSubjectFilter(undefined)} />
          </>
        }
        ListEmptyComponent={<Empty icon="checkmark-done-outline" text={total ? 'Không có deadline phù hợp' : 'Chưa có deadline. Bấm + để thêm.'} />}
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: tone(section.title) + '55' }}>
            <Text style={[s.kicker, { color: tone(section.title) }]}>{section.title} · {section.data.length}</Text>
            {section.title === 'Đã hoàn thành' && (
              <Pressable onPress={() => confirm(`Xóa ${section.data.length} deadline đã xong?`, clearDoneDeadlines)} hitSlop={8}>
                <Text style={{ color: c.muted, fontWeight: '700', fontSize: 12 }}>Dọn dẹp</Text>
              </Pressable>
            )}
          </View>
        )}
        renderItem={({ item, section, index }) => {
          const sub = subjects.find((x) => x.id === item.subjectId);
          const late = section.title === 'Quá hạn';
          return (
            <ListRow last={index === section.data.length - 1} onPress={() => nav.navigate('DeadlineDetail', { id: item.id })}>
              <Pressable onPress={() => toggleDeadline(item.id)} hitSlop={10} style={{ marginRight: 14 }}>
                <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: item.done ? c.success : PRIORITIES[item.priority].color, backgroundColor: item.done ? c.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {item.done && <Icon name="checkmark" size={16} color="#fff" />}
                </View>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={[s.title, item.done && { textDecorationLine: 'line-through', color: c.muted }]}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  {sub && <View style={[s.dot, { backgroundColor: sub.color, marginRight: 6 }]} />}
                  <Text numberOfLines={1} style={[s.sub, { marginTop: 0, flexShrink: 1 }]}>{sub ? `${sub.name} · ` : ''}{TYPES[item.type].split(' / ')[0]} · {fmtShort(item.due)}</Text>
                </View>
              </View>
              {!item.done && <Text style={{ color: late ? c.danger : c.muted, fontWeight: '700', fontSize: 12, marginLeft: 8 }}>{timeLeft(item.due).replace('quá hạn ', '−')}</Text>}
            </ListRow>
          );
        }}
      />
      <FAB onPress={() => nav.navigate('DeadlineForm', {})} />
    </View>
  );
}

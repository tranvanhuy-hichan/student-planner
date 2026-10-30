import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useScoped } from '../store';
import { DAYS } from '../utils';
import { Empty, FAB, Icon, ListRow, useColors, useS } from '../ui';

export default function ScheduleScreen() {
  const { classes, subjects } = useScoped();
  const nav = useNavigation<any>();
  const s = useS();
  const c = useColors();
  const today = new Date().getDay() + 1;
  const [day, setDay] = useState(today);

  const items = classes.filter((x) => x.weekday === day).sort((a, b) => a.start.localeCompare(b.start));
  const info = DAYS.find((d) => d.v === day)!;

  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad}
        data={items}
        keyExtractor={(x) => x.id}
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              {DAYS.map((d) => {
                const active = d.v === day;
                const has = classes.some((x) => x.weekday === d.v);
                return (
                  <Pressable key={d.v} onPress={() => setDay(d.v)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: active ? c.primary : 'transparent' }}>
                    <Text style={{ color: active ? c.onPrimary : d.v === today ? c.primary : c.muted, fontWeight: '800', fontSize: 14 }}>{d.label}</Text>
                    <View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 5, backgroundColor: has ? (active ? c.onPrimary : c.text) : 'transparent' }} />
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: c.text }}>{info.full}</Text>
              <Text style={[s.sub, { marginTop: 0 }]}>{items.length ? `${items.length} tiết học` : 'Không có tiết học'}{day === today ? ' · Hôm nay' : ''}</Text>
            </View>
          </>
        }
        ListEmptyComponent={<Empty icon="cafe-outline" text="Bấm + để thêm tiết học cho ngày này" />}
        renderItem={({ item: x, index }) => {
          const sub = subjects.find((q) => q.id === x.subjectId);
          return (
            <ListRow last={index === items.length - 1} onPress={() => nav.navigate('ClassDetail', { id: x.id })}>
              <View style={{ width: 58 }}>
                <Text style={{ color: c.text, fontWeight: '800', fontSize: 15, fontVariant: ['tabular-nums'] }}>{x.start}</Text>
                <Text style={{ color: c.muted, fontSize: 12, fontVariant: ['tabular-nums'] }}>{x.end}</Text>
              </View>
              <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 12, backgroundColor: sub?.color ?? c.border }} />
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{sub?.name ?? 'Môn học'}</Text>
                <Text style={s.sub}>{x.room || 'Chưa có phòng'}{sub?.teacher ? ` · ${sub.teacher}` : ''}</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={c.muted} />
            </ListRow>
          );
        }}
      />
      <FAB onPress={() => nav.navigate('ClassForm', { weekday: day })} />
    </View>
  );
}

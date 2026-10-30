import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { FlatList, Image, Text, View } from 'react-native';
import { useScoped } from '../store';
import { ActiveSubjectFilter, Empty, FAB, Icon, Input, ListRow, SubjectSelect, useColors, useS } from '../ui';

export default function NotesScreen() {
  const { notes, subjects } = useScoped();
  const nav = useNavigation<any>();
  const s = useS();
  const c = useColors();
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>();

  const q = query.toLowerCase();
  const shown = notes
    .filter((n) => (!subjectFilter || n.subjectId === subjectFilter) && `${n.title} ${n.body}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));

  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad}
        data={shown}
        keyExtractor={(n) => n.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Input icon="search" placeholder="Tìm ghi chú" value={query} onChangeText={setQuery} containerStyle={{ marginBottom: 0 }} />
              </View>
              {subjects.length > 0 && <SubjectSelect variant="filter" size={46} value={subjectFilter} onChange={setSubjectFilter} noneLabel="Tất cả các môn" title="Lọc theo môn học" />}
            </View>
            <ActiveSubjectFilter id={subjectFilter} onClear={() => setSubjectFilter(undefined)} />
          </>
        }
        ListEmptyComponent={<Empty icon="document-text-outline" text={notes.length ? 'Không tìm thấy ghi chú' : 'Chưa có ghi chú. Bấm + để thêm.'} />}
        renderItem={({ item, index }) => {
          const sub = subjects.find((x) => x.id === item.subjectId);
          return (
            <ListRow last={index === shown.length - 1} onPress={() => nav.navigate('NoteDetail', { id: item.id })}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.pinned && <Icon name="pin" size={14} color={c.primary} />}
                  <Text style={[s.title, { flex: 1 }]} numberOfLines={1}>{item.title}</Text>
                </View>
                {!!item.body && <Text numberOfLines={2} style={{ color: c.muted, marginTop: 3, lineHeight: 19 }}>{item.body}</Text>}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[s.dot, { backgroundColor: sub?.color ?? c.border, marginRight: 6 }]} />
                    <Text style={[s.sub, { marginTop: 0, fontSize: 12 }]}>{sub?.name ?? 'Chưa gắn môn'} · {new Date(item.updatedAt).toLocaleDateString('vi-VN')}</Text>
                  </View>
                  {item.checklist.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="checkbox-outline" size={13} color={c.muted} />
                      <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700' }}>{item.checklist.filter((i) => i.done).length}/{item.checklist.length}</Text>
                    </View>
                  )}
                  {item.files.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="attach-outline" size={14} color={c.muted} />
                      <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700' }}>{item.files.length}</Text>
                    </View>
                  )}
                  {item.images.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="image-outline" size={13} color={c.muted} />
                      <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700' }}>{item.images.length}</Text>
                    </View>
                  )}
                </View>
              </View>
              {item.images.length > 0 && <Image source={{ uri: item.images[0] }} style={{ width: 56, height: 56, borderRadius: 8, marginLeft: 12, backgroundColor: c.chip }} />}
            </ListRow>
          );
        }}
      />
      <FAB onPress={() => nav.navigate('NoteForm', {})} />
    </View>
  );
}

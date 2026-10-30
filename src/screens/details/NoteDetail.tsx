import { useNavigation, useRoute } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { ImageViewer } from '../../ImageViewer';
import { useStore } from '../../store';
import { Button, confirm, Header, Icon, IconButton, InfoRow, Section, useColors, useS } from '../../ui';

export default function NoteDetail() {
  const { id } = useRoute().params as { id: string };
  const nav = useNavigation<any>();
  const { notes, subjects, togglePin, toggleNoteItem, removeNote } = useStore();
  const s = useS();
  const c = useColors();
  const [viewer, setViewer] = useState<number | null>(null);
  const n = notes.find((x) => x.id === id);
  const sub = subjects.find((x) => x.id === n?.subjectId);

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <>
          <IconButton name={n?.pinned ? 'pin' : 'pin-outline'} color={c.primary} size={22} onPress={() => togglePin(id)} />
          <IconButton name="create-outline" color={c.text} size={22} onPress={() => nav.navigate('NoteForm', { id })} />
        </>
      ),
    });
  }, [nav, id, c, n?.pinned]);

  if (!n) return null;
  const doneCount = n.checklist.filter((i) => i.done).length;
  const text = [n.title, n.body, ...n.checklist.map((i) => `${i.done ? '☑' : '☐'} ${i.text}`)].filter(Boolean).join('\n\n');

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Header title={n.title} color={sub?.color} />
      <View>
        <InfoRow icon="book" label="Môn học" value={sub?.name ?? 'Chưa gắn môn'} color={sub?.color} />
        <InfoRow icon="time" label="Cập nhật lần cuối" value={new Date(n.updatedAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })} />
      </View>

      {!!n.body && <Text style={{ color: c.text, lineHeight: 25, fontSize: 16, marginTop: 18 }} selectable>{n.body}</Text>}

      {n.checklist.length > 0 && (
        <>
          <Section text={`Checklist · ${doneCount}/${n.checklist.length}`} />
          <View style={{ height: 3, backgroundColor: c.chip, borderRadius: 2, marginBottom: 6 }}>
            <View style={{ width: `${(doneCount / n.checklist.length) * 100}%`, height: 3, backgroundColor: c.success, borderRadius: 2 }} />
          </View>
          {n.checklist.map((it, i) => (
            <Pressable key={it.id} onPress={() => toggleNoteItem(n.id, it.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: i === n.checklist.length - 1 ? 0 : 1, borderBottomColor: c.border }}>
              <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: it.done ? c.success : c.muted, backgroundColor: it.done ? c.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {it.done && <Icon name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={{ flex: 1, fontSize: 16, color: it.done ? c.muted : c.text, textDecorationLine: it.done ? 'line-through' : 'none' }}>{it.text}</Text>
            </Pressable>
          ))}
        </>
      )}

      {n.images.length > 0 && (
        <>
          <Section text={`Ảnh · ${n.images.length}`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {n.images.map((u, i) => (
              <Pressable key={u} onPress={() => setViewer(i)} style={{ width: '31.5%', aspectRatio: 1 }}>
                <Image source={{ uri: u }} style={{ flex: 1, borderRadius: 8, backgroundColor: c.chip }} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      {!n.body && n.checklist.length === 0 && n.images.length === 0 && <Text style={[s.sub, { marginTop: 18 }]}>Ghi chú chưa có nội dung.</Text>}

      <View style={{ height: 20 }} />
      <Button icon="create-outline" title="Chỉnh sửa ghi chú" onPress={() => nav.navigate('NoteForm', { id })} />
      <Button icon="share-outline" title="Chia sẻ (văn bản)" color={c.muted} onPress={() => Share.share({ message: text })} />
      <Button icon="trash-outline" title="Xóa ghi chú" color={c.danger} onPress={() => confirm('Xóa ghi chú này?', async () => { nav.goBack(); removeNote(id); })} />
      <ImageViewer images={n.images} index={viewer} onClose={() => setViewer(null)} />
    </ScrollView>
  );
}

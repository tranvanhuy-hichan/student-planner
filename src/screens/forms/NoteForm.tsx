import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { deleteImage, pickImage } from '../../images';
import { ImageViewer } from '../../ImageViewer';
import { useStore } from '../../store';
import type { ChecklistItem } from '../../types';
import { BigInput, Button, ErrorText, FormCard, Icon, IconButton, Input, SubjectPicker, useColors, useS } from '../../ui';

const rid = () => Math.random().toString(36).slice(2, 9);

export default function NoteForm() {
  const { id, subjectId: defSubject } = (useRoute().params ?? {}) as { id?: string; subjectId?: string };
  const nav = useNavigation<any>();
  const { notes, saveNote } = useStore();
  const s = useS();
  const c = useColors();
  const old = notes.find((x) => x.id === id);

  const [title, setTitle] = useState(old?.title ?? '');
  const [subjectId, setSubjectId] = useState(old?.subjectId ?? defSubject);
  const [body, setBody] = useState(old?.body ?? '');
  const [items, setItems] = useState<ChecklistItem[]>(old?.checklist ?? []);
  const [newItem, setNewItem] = useState('');
  const [images, setImages] = useState<string[]>(old?.images ?? []);
  const [viewer, setViewer] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Ảnh thêm trong lần sửa này mà chưa lưu thì xóa đi khi thoát, tránh để file rác
  const added = useRef<string[]>([]);
  const saved = useRef(false);
  useEffect(() => () => { if (!saved.current) added.current.forEach(deleteImage); }, []);

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    setItems((x) => [...x, { id: rid(), text, done: false }]);
    setNewItem('');
  };

  const addImage = async (source: 'camera' | 'library') => {
    try {
      const r = await pickImage(source);
      if (r.denied) return Alert.alert('Chưa có quyền truy cập', source === 'camera' ? 'Hãy cho phép dùng camera trong cài đặt của điện thoại.' : 'Hãy cho phép truy cập ảnh trong cài đặt của điện thoại.');
      if (r.uri) { added.current.push(r.uri); setImages((x) => [...x, r.uri!]); }
    } catch {
      Alert.alert('Không thêm được ảnh', 'Vui lòng thử lại.');
    }
  };

  const removeImage = (uri: string) => {
    if (added.current.includes(uri)) { deleteImage(uri); added.current = added.current.filter((u) => u !== uri); }
    setImages((x) => x.filter((u) => u !== uri));
  };

  const submit = () => {
    if (!title.trim()) return setError('Vui lòng nhập tiêu đề');
    const pending = newItem.trim() ? [...items, { id: rid(), text: newItem.trim(), done: false }] : items; // không bỏ sót dòng đang gõ dở
    saved.current = true;
    saveNote({ id, title: title.trim(), subjectId, body, checklist: pending, images });
    nav.goBack();
  };

  const size = 96;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <BigInput value={title} onChangeText={setTitle} placeholder="Tiêu đề ghi chú" multiline style={{ marginBottom: 8 }} />

      <FormCard icon="book" title="Môn học"><SubjectPicker value={subjectId} onChange={setSubjectId} wrap /></FormCard>

      <FormCard icon="create" title="Nội dung">
        <Input placeholder="Ghi chú bài học..." value={body} onChangeText={setBody} multiline style={{ minHeight: 140, textAlignVertical: 'top', marginBottom: 0 }} />
      </FormCard>

      <FormCard icon="checkbox" title={`Checklist${items.length ? ` · ${items.filter((i) => i.done).length}/${items.length}` : ''}`}>
        {items.map((it) => (
          <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 4 }}>
            <Pressable hitSlop={8} onPress={() => setItems((x) => x.map((q) => (q.id === it.id ? { ...q, done: !q.done } : q)))}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: it.done ? c.success : c.muted, backgroundColor: it.done ? c.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {it.done && <Icon name="checkmark" size={14} color="#fff" />}
              </View>
            </Pressable>
            <TextInput
              value={it.text}
              onChangeText={(v) => setItems((x) => x.map((q) => (q.id === it.id ? { ...q, text: v } : q)))}
              style={{ flex: 1, minWidth: 0, color: it.done ? c.muted : c.text, textDecorationLine: it.done ? 'line-through' : 'none', paddingVertical: 8, fontSize: 15 }}
            />
            <IconButton name="close" color={c.muted} onPress={() => setItems((x) => x.filter((q) => q.id !== it.id))} />
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Input icon="add" placeholder="Thêm việc cần làm" value={newItem} onChangeText={setNewItem} onSubmitEditing={addItem} returnKeyType="done" blurOnSubmit={false} style={{ marginBottom: 0 }} />
          </View>
          <Button icon="add" title="Thêm" onPress={addItem} />
        </View>
      </FormCard>

      <FormCard icon="images" title={`Ảnh${images.length ? ` · ${images.length}` : ''}`}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Button icon="camera-outline" title="Chụp ảnh" color={c.muted} onPress={() => addImage('camera')} /></View>
          <View style={{ flex: 1 }}><Button icon="image-outline" title="Chọn từ thư viện" color={c.muted} onPress={() => addImage('library')} /></View>
        </View>
        {images.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {images.map((u, i) => (
              <View key={u}>
                <Pressable onPress={() => setViewer(i)}>
                  <Image source={{ uri: u }} style={{ width: size, height: size, borderRadius: 8, backgroundColor: c.chip }} />
                </Pressable>
                <Pressable onPress={() => removeImage(u)} hitSlop={8} style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {images.length === 0 && <Text style={s.sub}>Chụp bảng thầy viết hoặc tài liệu để đính kèm vào ghi chú.</Text>}
      </FormCard>

      <ErrorText text={error} />
      <Button icon="checkmark-circle" title={id ? 'Lưu thay đổi' : 'Lưu ghi chú'} onPress={submit} />
      <Button icon="close" title="Hủy" color={c.muted} onPress={() => nav.goBack()} />
      <ImageViewer images={images} index={viewer} onClose={() => setViewer(null)} />
    </ScrollView>
  );
}

import { useNavigation, useRoute } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { describeAiError, makeQuiz, summarizeNote, useAiKey } from '../../ai';
import { showAlert } from '../../dialog';
import { openFile } from '../../images';
import { ImageViewer } from '../../ImageViewer';
import { useStore } from '../../store';
import { fileIcon, fmtSize } from '../../utils';
import { Button, Chip, Chips, confirm, Header, Icon, IconButton, InfoRow, ListRow, Pill, Section, useColors, useS } from '../../ui';

export default function NoteDetail() {
  const { id } = useRoute().params as { id: string };
  const nav = useNavigation<any>();
  const { notes, subjects, togglePin, toggleNoteItem, removeNote, setNoteAi } = useStore();
  const hasKey = !!useAiKey((st) => st.key);
  const [busy, setBusy] = useState<'summary' | 'quiz' | null>(null);
  const [count, setCount] = useState(8);
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

  const run = async (kind: 'summary' | 'quiz') => {
    setBusy(kind);
    try {
      if (kind === 'summary') setNoteAi(n.id, { summary: await summarizeNote(n, sub?.name) });
      else setNoteAi(n.id, { quiz: await makeQuiz(n, count, sub?.name) });
    } catch (err) {
      showAlert('Trợ lý AI chưa thực hiện được', describeAiError(err));
    } finally {
      setBusy(null);
    }
  };
  const ai = n.ai;
  const when = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
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

      {/* Trợ lý AI */}
      <Section text="Trợ lý AI" />
      {!hasKey ? (
        <>
          <Text style={[s.sub, { marginBottom: 8 }]}>Tóm tắt ghi chú và tạo câu hỏi ôn tập bằng Gemini. Có gói miễn phí.</Text>
          <Button icon="key-outline" title="Thêm khóa API trong Cài đặt" color={c.muted} onPress={() => nav.navigate('Cài đặt')} />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button icon="sparkles-outline" title={busy === 'summary' ? 'Đang tóm tắt...' : ai?.summary ? 'Tóm tắt lại' : 'Tóm tắt'} color={c.muted} onPress={busy ? () => {} : () => run('summary')} /></View>
            <View style={{ flex: 1 }}><Button icon="help-circle-outline" title={busy === 'quiz' ? 'Đang tạo...' : 'Tạo câu hỏi'} color={c.muted} onPress={busy ? () => {} : () => run('quiz')} /></View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[s.sub, { marginTop: 0, marginBottom: 6 }]}>Số câu hỏi:</Text>
            <Chips>{[5, 8, 12].map((k) => <Chip key={k} label={String(k)} active={count === k} onPress={() => setCount(k)} />)}</Chips>
            {busy && <ActivityIndicator color={c.primary} style={{ marginBottom: 6 }} />}
          </View>
        </>
      )}

      {ai?.summary && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
          <View style={[s.row, { marginBottom: 6 }]}>
            <Text style={s.kicker}>Tóm tắt</Text>
            <Text style={[s.sub, { fontSize: 11 }]}>{when(ai.summary.at)} · {ai.summary.model}</Text>
          </View>
          <Text style={{ color: c.text, lineHeight: 23, fontSize: 15 }} selectable>{ai.summary.text}</Text>
          {ai.summary.points.map((p, k) => (
            <View key={k} style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Text style={{ color: c.primary, fontWeight: '800' }}>•</Text>
              <Text style={{ flex: 1, color: c.text, lineHeight: 21 }} selectable>{p}</Text>
            </View>
          ))}
          {ai.summary.keywords.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {ai.summary.keywords.map((k) => <Pill key={k} text={k} color={c.primary} />)}
            </View>
          )}
        </View>
      )}

      {ai?.quiz && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
          <View style={[s.row, { marginBottom: 6 }]}>
            <Text style={s.kicker}>Câu hỏi ôn tập</Text>
            <Text style={[s.sub, { fontSize: 11 }]}>{when(ai.quiz.at)} · {ai.quiz.model}</Text>
          </View>
          <Text style={{ color: c.text, fontWeight: '700', marginBottom: 8 }}>
            {ai.quiz.questions.length} câu{ai.quiz.best ? ` · điểm cao nhất ${ai.quiz.best.correct}/${ai.quiz.best.total}` : ' · chưa làm bài'}
          </Text>
          <Button icon="play" title="Làm bài ôn tập" onPress={() => nav.navigate('Quiz', { noteId: n.id })} />
        </View>
      )}

      {n.files.length > 0 && (
        <>
          <Section text={`Tệp đính kèm · ${n.files.length}`} />
          {n.files.map((f, i) => (
            <ListRow key={f.id} last={i === n.files.length - 1} onPress={() => openFile(f).catch(() => showAlert('Không mở được tệp', 'Máy của bạn chưa hỗ trợ chia sẻ hoặc mở tệp này.'))}>
              <Icon name={fileIcon(f.name, f.mime)} size={24} color={c.primary} />
              <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
                <Text numberOfLines={2} style={s.title}>{f.name}</Text>
                {!!f.size && <Text style={s.sub}>{fmtSize(f.size)}</Text>}
              </View>
              <Icon name="open-outline" size={20} color={c.muted} />
            </ListRow>
          ))}
          <Text style={[s.sub, { marginTop: 4 }]}>Chạm vào tệp để mở hoặc chia sẻ sang ứng dụng khác.</Text>
        </>
      )}

      {!n.body && n.checklist.length === 0 && n.images.length === 0 && n.files.length === 0 && <Text style={[s.sub, { marginTop: 18 }]}>Ghi chú chưa có nội dung.</Text>}

      <View style={{ height: 20 }} />
      <Button icon="create-outline" title="Chỉnh sửa ghi chú" onPress={() => nav.navigate('NoteForm', { id })} />
      <Button icon="share-outline" title="Chia sẻ (văn bản)" color={c.muted} onPress={() => Share.share({ message: text })} />
      <Button icon="trash-outline" title="Xóa ghi chú" color={c.danger} onPress={() => confirm('Xóa ghi chú này?', async () => { nav.goBack(); removeNote(id); })} />
      <ImageViewer images={n.images} index={viewer} onClose={() => setViewer(null)} />
    </ScrollView>
  );
}

import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from '../store';
import { Button, Icon, Pill, useColors, useS } from '../ui';

type Result = { picked?: number; correct: boolean };

/** Làm bài ôn tập: trắc nghiệm chấm ngay, câu hỏi ngắn tự đối chiếu đáp án mẫu */
export default function QuizScreen() {
  const { noteId } = useRoute().params as { noteId: string };
  const nav = useNavigation<any>();
  const { notes, setNoteAi } = useStore();
  const s = useS();
  const c = useColors();
  const quiz = notes.find((n) => n.id === noteId)?.ai?.quiz;
  const [prevBest] = useState(quiz?.best); // điểm cao nhất trước lần làm này, để biết lần này có phá kỷ lục không
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | undefined>();
  const [shown, setShown] = useState(false); // đã hiện đáp án
  const [results, setResults] = useState<Result[]>([]);

  if (!quiz) return null;
  const qs = quiz.questions;
  const finished = results.length === qs.length;

  const restart = () => { setI(0); setPicked(undefined); setShown(false); setResults([]); };

  if (finished) {
    const correct = results.filter((r) => r.correct).length;
    const pct = Math.round((correct / qs.length) * 100);
    const wrong = qs.map((q, k) => ({ q, k })).filter(({ k }) => !results[k].correct);
    const isBest = !prevBest || correct / qs.length > prevBest.correct / prevBest.total;
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.pad}>
        <Text style={s.kicker}>Kết quả</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
          <Text style={{ fontSize: 56, fontWeight: '800', letterSpacing: -2, color: pct >= 70 ? c.success : pct >= 40 ? c.warning : c.danger }}>{correct}/{qs.length}</Text>
          <Text style={{ fontSize: 20, color: c.muted, fontWeight: '700' }}>  {pct}%</Text>
        </View>
        <Text style={[s.sub, { marginBottom: 12 }]}>
          {pct >= 80 ? 'Rất tốt! Bạn nắm khá chắc bài này.' : pct >= 50 ? 'Khá ổn, ôn lại các câu sai bên dưới nhé.' : 'Cần ôn thêm. Đọc lại ghi chú và làm lại bài.'}
        </Text>
        {isBest && <Pill text="Điểm cao nhất mới" color={c.success} icon="trophy" />}

        {wrong.length > 0 && <Text style={s.section}>Ôn lại {wrong.length} câu sai</Text>}
        {wrong.map(({ q, k }) => (
          <View key={k} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Text style={s.title}>{q.question}</Text>
            <Text style={{ color: c.success, fontWeight: '700', marginTop: 6 }}>Đáp án: {q.answer}</Text>
            {results[k].picked !== undefined && q.type === 'mcq' && <Text style={{ color: c.danger, marginTop: 2 }}>Bạn chọn: {q.options[results[k].picked!]}</Text>}
            <Text style={[s.sub, { marginTop: 4 }]}>{q.explanation}</Text>
          </View>
        ))}

        <View style={{ height: 16 }} />
        <Button icon="refresh" title="Làm lại" onPress={() => { restart(); }} />
        <Button icon="checkmark" title="Xong" color={c.muted} onPress={() => nav.goBack()} />
      </ScrollView>
    );
  }

  const q = qs[i];
  const record = (correct: boolean, p?: number) => {
    const next = [...results, { picked: p, correct }];
    setResults(next);
    setPicked(undefined);
    setShown(false);
    setI(i + 1);
    if (next.length === qs.length) {
      const score = next.filter((r) => r.correct).length;
      const prev = quiz.best;
      if (!prev || score / qs.length > prev.correct / prev.total) setNoteAi(noteId, { quiz: { ...quiz, best: { correct: score, total: qs.length } } });
    }
  };

  const choose = (k: number) => { if (shown) return; setPicked(k); setShown(true); };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <View style={[s.row, { marginBottom: 8 }]}>
        <Text style={s.kicker}>Câu {i + 1} / {qs.length}</Text>
        <Text style={{ color: c.success, fontWeight: '700', fontSize: 12 }}>{results.filter((r) => r.correct).length} đúng</Text>
      </View>
      <View style={{ height: 4, backgroundColor: c.chip, borderRadius: 2, marginBottom: 18 }}>
        <View style={{ width: `${(i / qs.length) * 100}%`, height: 4, backgroundColor: c.primary, borderRadius: 2 }} />
      </View>

      <Text style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.3, color: c.text, lineHeight: 27, marginBottom: 16 }}>{q.question}</Text>

      {q.type === 'mcq' ? (
        q.options.map((o, k) => {
          const isAnswer = k === q.answerIndex;
          const isPicked = k === picked;
          const tone = !shown ? c.border : isAnswer ? c.success : isPicked ? c.danger : c.border;
          return (
            <Pressable key={k} onPress={() => choose(k)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10, borderRadius: 12, borderWidth: shown && (isAnswer || isPicked) ? 2 : 1, borderColor: tone, backgroundColor: shown && isAnswer ? c.success + '18' : shown && isPicked ? c.danger + '18' : c.card, opacity: pressed ? 0.8 : 1 })}>
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: shown && isAnswer ? c.success : shown && isPicked ? c.danger : c.muted, alignItems: 'center', justifyContent: 'center' }}>
                {shown && isAnswer ? <Icon name="checkmark" size={16} color={c.success} /> : shown && isPicked ? <Icon name="close" size={16} color={c.danger} /> : <Text style={{ color: c.muted, fontWeight: '800', fontSize: 12 }}>{String.fromCharCode(65 + k)}</Text>}
              </View>
              <Text style={{ flex: 1, color: c.text, fontSize: 15, lineHeight: 21 }}>{o}</Text>
            </Pressable>
          );
        })
      ) : (
        !shown && <Button icon="eye-outline" title="Hiện đáp án" onPress={() => setShown(true)} />
      )}

      {shown && (
        <View style={{ marginTop: 6, padding: 14, borderRadius: 12, backgroundColor: c.primarySoft }}>
          {q.type === 'short' && <Text style={{ color: c.text, fontWeight: '800', marginBottom: 4 }}>Đáp án mẫu: {q.answer}</Text>}
          <Text style={{ color: c.text, lineHeight: 21 }}>{q.explanation}</Text>
        </View>
      )}

      {shown && (
        <View style={{ marginTop: 16 }}>
          {q.type === 'mcq' ? (
            <Button icon={i + 1 === qs.length ? 'flag' : 'arrow-forward'} title={i + 1 === qs.length ? 'Xem kết quả' : 'Câu tiếp theo'} onPress={() => record(picked === q.answerIndex, picked)} />
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Button icon="close" title="Chưa đúng" color={c.danger} onPress={() => record(false)} /></View>
              <View style={{ flex: 1 }}><Button icon="checkmark" title="Mình trả lời đúng" color={c.success} onPress={() => record(true)} /></View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from '../../store';
import type { GradeColumn } from '../../types';
import { GRADE_TEMPLATES, letter, subjectResult, SUBJECT_COLORS, to4 } from '../../utils';
import { BigInput, Button, Chip, Chips, ErrorText, FormCard, Icon, IconButton, Input, Pill, useColors, useS } from '../../ui';

type Row = { id: string; name: string; weight: string; score: string };
const rid = () => Math.random().toString(36).slice(2, 9);
const num = (s: string) => Number(s.trim().replace(',', '.'));
const toRow = (g: GradeColumn): Row => ({ id: g.id, name: g.name, weight: String(g.weight), score: g.score === undefined ? '' : String(g.score) });

export default function SubjectForm() {
  const { id } = (useRoute().params ?? {}) as { id?: string };
  const nav = useNavigation<any>();
  const { subjects, addSubject, updateSubject } = useStore();
  const s = useS();
  const c = useColors();
  const old = subjects.find((x) => x.id === id);

  const [name, setName] = useState(old?.name ?? '');
  const [teacher, setTeacher] = useState(old?.teacher ?? '');
  const [credits, setCredits] = useState(old?.credits ?? 3);
  const [color, setColor] = useState(old?.color ?? SUBJECT_COLORS[(subjects.length + 5) % SUBJECT_COLORS.length]);
  const [rows, setRows] = useState<Row[]>((old?.grades ?? []).map(toRow));
  const [error, setError] = useState('');

  const setRow = (rowId: string, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.id === rowId ? { ...x, ...patch } : x)));

  const applyTemplate = (cols: { name: string; weight: number }[]) => {
    const apply = () => setRows(cols.map((x) => ({ id: rid(), name: x.name, weight: String(x.weight), score: '' })));
    if (rows.some((r) => r.score.trim())) Alert.alert('Thay các cột điểm hiện tại?', 'Các điểm đã nhập sẽ bị xóa.', [{ text: 'Hủy', style: 'cancel' }, { text: 'Thay', style: 'destructive', onPress: apply }]);
    else apply();
  };

  // Chuyển các dòng đang nhập thành cột điểm; bỏ qua dòng chưa hợp lệ khi chỉ xem trước
  const parse = (strict: boolean): GradeColumn[] | string => {
    const out: GradeColumn[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const w = num(r.weight);
      const sc = r.score.trim() === '' ? undefined : num(r.score);
      const okW = Number.isFinite(w) && w > 0;
      const okS = sc === undefined || (Number.isFinite(sc) && sc >= 0 && sc <= 10);
      if (!okW || !okS) {
        if (strict) return !okW ? `Cột ${i + 1}: hệ số phải là số lớn hơn 0` : `Cột ${i + 1}: điểm phải từ 0 đến 10`;
        continue;
      }
      out.push({ id: r.id, name: r.name.trim() || `Cột ${i + 1}`, weight: w, score: sc });
    }
    return out;
  };

  const preview = subjectResult({ grades: parse(false) as GradeColumn[] });
  const totalWeight = rows.reduce((a, r) => a + (Number.isFinite(num(r.weight)) ? num(r.weight) : 0), 0);

  const submit = async () => {
    if (!name.trim()) return setError('Vui lòng nhập tên môn học');
    const grades = parse(true);
    if (typeof grades === 'string') return setError(grades);
    const data = { name: name.trim(), teacher: teacher.trim(), credits, color, grades };
    if (id) await updateSubject(id, data);
    else addSubject(data);
    nav.goBack();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={{ marginBottom: 14 }}>
        <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: color, marginBottom: 10 }} />
        <BigInput value={name} onChangeText={setName} placeholder="Tên môn học" />
        <Text style={s.sub}>{teacher.trim() || 'Giảng viên'} · {credits} tín chỉ</Text>
      </View>

      <FormCard icon="person" title="Giảng viên">
        <Input icon="person-outline" placeholder="VD: TS. Nguyễn Văn A" value={teacher} onChangeText={setTeacher} style={{ marginBottom: 0 }} />
      </FormCard>

      <FormCard icon="color-palette" title="Màu sắc">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {SUBJECT_COLORS.map((col) => (
            <Pressable key={col} onPress={() => setColor(col)} style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: col, alignItems: 'center', justifyContent: 'center' }}>
              {color === col && <Icon name="checkmark" size={22} color="#fff" />}
            </Pressable>
          ))}
        </View>
      </FormCard>

      <FormCard icon="layers" title="Số tín chỉ">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <IconButton name="remove-circle-outline" size={30} color={c.text} onPress={() => setCredits(Math.max(0, credits - 1))} />
          <Text style={{ color: c.text, fontSize: 24, fontWeight: '800', minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{credits}</Text>
          <IconButton name="add-circle-outline" size={30} color={c.text} onPress={() => setCredits(Math.min(20, credits + 1))} />
        </View>
      </FormCard>

      <FormCard icon="ribbon" title="Cột điểm">
        <Text style={[s.sub, { marginBottom: 10, marginTop: 0 }]}>
          Mỗi cột có một hệ số. Điểm môn = tổng (điểm × hệ số) ÷ tổng hệ số, bạn nhập 10 · 30 · 60 hay 1 · 2 · 3 đều được.
        </Text>
        <Chips>
          {GRADE_TEMPLATES.map((t) => <Chip key={t.label} icon="flash-outline" label={`Mẫu ${t.label}`} onPress={() => applyTemplate(t.cols)} />)}
        </Chips>

        {rows.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 6 }}>
            <Text style={[s.kicker, { flex: 2.2, minWidth: 0 }]}>Tên cột</Text>
            <Text style={[s.kicker, { flex: 1, minWidth: 0 }]}>Hệ số</Text>
            <Text style={[s.kicker, { flex: 1, minWidth: 0 }]}>Điểm</Text>
            <View style={{ width: 36 }} />
          </View>
        )}
        {rows.map((r) => (
          <View key={r.id} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            {/* minWidth: 0 để ô nhập co lại được trong hàng, không tràn ra ngoài màn hình */}
            <View style={{ flex: 2.2, minWidth: 0 }}>
              <Input style={{ marginBottom: 0 }} placeholder="VD: Giữa kỳ" value={r.name} onChangeText={(v) => setRow(r.id, { name: v })} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Input style={{ marginBottom: 0 }} keyboardType="decimal-pad" placeholder="30" value={r.weight} onChangeText={(v) => setRow(r.id, { weight: v })} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Input style={{ marginBottom: 0 }} keyboardType="decimal-pad" placeholder="–" value={r.score} onChangeText={(v) => setRow(r.id, { score: v })} />
            </View>
            <View style={{ width: 36, alignItems: 'center' }}>
              <IconButton name="close" color={c.muted} onPress={() => setRows((x) => x.filter((q) => q.id !== r.id))} />
            </View>
          </View>
        ))}
        <Button icon="add" title="Thêm cột điểm" color={c.muted} onPress={() => setRows((x) => [...x, { id: rid(), name: '', weight: '', score: '' }])} />

        {rows.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, marginTop: 4 }}>
            <Text style={s.kicker}>Kết quả hiện tại</Text>
            {preview.score !== undefined ? (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <Text style={{ fontSize: 40, fontWeight: '800', letterSpacing: -1.5, color: c.primary }}>{preview.score.toFixed(2)}</Text>
                <Text style={{ color: c.muted, fontWeight: '600' }}>/ 10 · {letter(preview.score)} · {to4(preview.score).toFixed(1)}/4</Text>
              </View>
            ) : (
              <Text style={s.sub}>Nhập điểm vào các cột để xem kết quả.</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Pill text={`Tổng hệ số ${totalWeight}`} color={c.muted} />
              {preview.score !== undefined && (preview.complete ? <Pill text="Đã đủ điểm" color={c.success} icon="checkmark" /> : <Pill text={`Tạm tính · ${preview.filled}/${preview.total} cột`} color={c.warning} />)}
            </View>
          </View>
        )}
      </FormCard>

      <ErrorText text={error} />
      <Button icon="checkmark-circle" title={id ? 'Lưu thay đổi' : 'Thêm môn học'} onPress={submit} />
      <Button icon="close" title="Hủy" color={c.muted} onPress={() => nav.goBack()} />
    </ScrollView>
  );
}

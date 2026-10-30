import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ReactNode, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, useColorScheme } from 'react-native';
import { showAlert } from './dialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScoped, useStore } from './store';
import type { IconName } from './types';

// Một màu chủ đạo (cobalt) trên nền giấy; các màu khác chỉ dùng cho ngữ nghĩa
// (đỏ = xóa/quá hạn, xanh lá = hoàn thành) và dữ liệu (màu môn học, mức ưu tiên).
const light = {
  bg: '#f7f6f2', card: '#ffffff', text: '#16150f', muted: '#77746a', primary: '#2447f5', primarySoft: '#2447f514',
  accent: '#d98a00', onPrimary: '#ffffff', danger: '#d92d20', success: '#1f9d55', warning: '#d98a00',
  border: '#e7e4dc', chip: '#efede6', grad: ['#2447f5', '#2447f5'] as [string, string], dark: false,
};
const dark: typeof light = {
  bg: '#0f0f0e', card: '#181816', text: '#f2f0ea', muted: '#98958b', primary: '#6f8cff', primarySoft: '#6f8cff1f',
  accent: '#fbbf24', onPrimary: '#0f0f0e', danger: '#f87171', success: '#4ade80', warning: '#fbbf24',
  border: '#2a2a26', chip: '#222220', grad: ['#6f8cff', '#6f8cff'] as [string, string], dark: true,
};
export type Colors = typeof light;

export function useColors(): Colors {
  const scheme = useColorScheme();
  const theme = useStore((s) => s.settings.theme);
  return (theme === 'system' ? scheme === 'dark' : theme === 'dark') ? dark : light;
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    pad: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
    input: {
      backgroundColor: c.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10,
      color: c.text, borderWidth: 1, borderColor: c.border, fontSize: 15,
    },
    card: { backgroundColor: c.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
    title: { fontSize: 16, fontWeight: '600', color: c.text },
    h1: { fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.6 },
    sub: { color: c.muted, marginTop: 2, fontSize: 13 },
    kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: c.muted, textTransform: 'uppercase' },
    section: { color: c.muted, fontWeight: '800', marginTop: 18, marginBottom: 4, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
    empty: { textAlign: 'center', color: c.muted, marginVertical: 18 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: c.border, marginRight: 6, marginBottom: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    hair: { borderBottomWidth: 1, borderBottomColor: c.border },
  });

export function useS() {
  const c = useColors();
  return useMemo(() => makeStyles(c), [c]);
}

export const Icon = ({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) => {
  const c = useColors();
  return <Ionicons name={name} size={size} color={color ?? c.text} />;
};

export const IconBadge = ({ name, color, size = 36 }: { name: IconName; color: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: 9, backgroundColor: color + '1f', alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={name} size={size * 0.52} color={color} />
  </View>
);

export const IconButton = ({ name, onPress, color, size = 20 }: { name: IconName; onPress: () => void; color?: string; size?: number }) => {
  const c = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => ({ padding: 8, borderRadius: 8, backgroundColor: pressed ? c.chip : 'transparent' })}>
      <Ionicons name={name} size={size} color={color ?? c.muted} />
    </Pressable>
  );
};

/** Khối nền đặc (giữ tên cũ); màu mặc định là màu chủ đạo */
export const Gradient = ({ children, style, colors }: { children: ReactNode; style?: object; colors?: [string, string] }) => {
  const c = useColors();
  return <View style={[{ backgroundColor: colors?.[0] ?? c.primary }, style]}>{children}</View>;
};

export const Input = ({ icon, containerStyle, ...p }: TextInputProps & { icon?: IconName; containerStyle?: object }) => {
  const s = useS();
  const c = useColors();
  if (!icon) return <TextInput placeholderTextColor={c.muted} {...p} style={[s.input, p.style]} />;
  return (
    <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 0 }, containerStyle]}>
      <Ionicons name={icon} size={17} color={c.muted} />
      <TextInput placeholderTextColor={c.muted} {...p} style={[{ flex: 1, color: c.text, paddingVertical: 12, fontSize: 15 }, p.style]} />
    </View>
  );
};

type Variant = 'primary' | 'secondary' | 'danger' | 'success';

/**
 * Chỉ nút hành động chính (không truyền color) mới đặc màu chủ đạo;
 * color = muted/warning/khác → nút phụ viền mảnh, danger → viền đỏ, success → nền xanh lá.
 */
export const Button = ({ title, onPress, color, icon, variant }: { title: string; onPress: () => void; color?: string; icon?: IconName; variant?: Variant }) => {
  const c = useColors();
  const v: Variant = variant ?? (color === c.danger ? 'danger' : color === c.success ? 'success' : color ? 'secondary' : 'primary');
  const look = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    secondary: { bg: 'transparent', fg: c.text, border: c.border },
    danger: { bg: 'transparent', fg: c.danger, border: c.danger + '55' },
    success: { bg: c.success, fg: '#ffffff', border: c.success },
  }[v];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ marginBottom: 8, opacity: pressed ? 0.8 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 10, backgroundColor: look.bg, borderWidth: 1, borderColor: look.border }}>
        {icon && <Ionicons name={icon} size={16} color={look.fg} />}
        <Text style={{ color: look.fg, fontWeight: '700', fontSize: 14 }}>{title}</Text>
      </View>
    </Pressable>
  );
};

export const Card = ({ children, style, onPress }: { children: ReactNode; style?: object; onPress?: () => void }) => {
  const s = useS();
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.8 }]}>
      {children}
    </Pressable>
  );
};

/** Hàng danh sách phẳng, ngăn cách bằng đường kẻ mảnh */
export const ListRow = ({ children, onPress, last }: { children: ReactNode; onPress?: () => void; last?: boolean }) => {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border, opacity: pressed ? 0.6 : 1 })}>
      {children}
    </Pressable>
  );
};

/** Nút "+" nổi */
export const FAB = ({ onPress, bottom = 20, icon = 'add' }: { onPress: () => void; bottom?: number; icon?: IconName }) => {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ position: 'absolute', right: 20, bottom, width: 56, height: 56, borderRadius: 16, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
      <Ionicons name={icon} size={28} color={c.onPrimary} />
    </Pressable>
  );
};

/** Nhãn + nội dung của một trường trong biểu mẫu */
export const Field = ({ label, children }: { label: string; children: ReactNode }) => {
  const s = useS();
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={[s.kicker, { marginBottom: 6 }]}>{label}</Text>
      {children}
    </View>
  );
};

export const ErrorText = ({ text }: { text?: string }) => {
  const c = useColors();
  return text ? <Text style={{ color: c.danger, marginBottom: 10, fontWeight: '600' }}>{text}</Text> : null;
};

/** Một dòng thông tin trong trang chi tiết */
export const InfoRow = ({ icon, label, value, color }: { icon: IconName; label: string; value: string; color?: string }) => {
  const s = useS();
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <Ionicons name={icon} size={20} color={color ?? c.muted} />
      <View style={{ flex: 1 }}>
        <Text style={s.kicker}>{label}</Text>
        <Text style={[s.title, { marginTop: 2 }]}>{value}</Text>
      </View>
    </View>
  );
};

export const Empty = ({ text, icon = 'sparkles-outline', action }: { text: string; icon?: IconName; action?: { label: string; onPress: () => void } }) => {
  const s = useS();
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', marginVertical: 8, paddingVertical: 16, paddingHorizontal: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: c.border, borderRadius: 12 }}>
      <Ionicons name={icon} size={26} color={c.muted} />
      <Text style={[s.empty, { marginVertical: 6 }]}>{text}</Text>
      {action && (
        <Pressable onPress={action.onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: c.primarySoft }}>
          <Ionicons name="add" size={16} color={c.primary} />
          <Text style={{ color: c.primary, fontWeight: '700', fontSize: 13 }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
};
export const Section = ({ text }: { text: string }) => <Text style={useS().section}>{text}</Text>;

export const Chip = ({ label, active, onPress, color, icon }: { label: string; active?: boolean; onPress: () => void; color?: string; icon?: IconName }) => {
  const s = useS();
  const c = useColors();
  const tone = color ?? c.primary;
  const fg = active ? (color ? '#fff' : c.primary) : c.text;
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { borderColor: tone, backgroundColor: color ? color : c.primarySoft }]}>
      {icon && <Ionicons name={icon} size={14} color={fg} />}
      <Text style={{ color: fg, fontWeight: active ? '700' : '500', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
};

export const Chips = ({ children }: { children: ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{children}</View>
);

/**
 * Ô chọn môn học: chỉ chiếm một dòng, bấm vào mới mở bảng danh sách.
 * Dùng được dù có 3 hay 30 môn; variant "filter" là nút lọc nhỏ gọn cho đầu trang danh sách.
 */
/** Dòng nhỏ báo đang lọc theo môn nào; chỉ hiện khi có lọc, bấm để bỏ lọc */
export function ActiveSubjectFilter({ id, onClear }: { id?: string; onClear: () => void }) {
  const sub = useStore((st) => st.subjects.find((x) => x.id === id));
  const c = useColors();
  if (!sub) return null;
  return (
    <Pressable onPress={onClear} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 8, paddingVertical: 5, paddingLeft: 9, paddingRight: 7, borderRadius: 8, backgroundColor: sub.color + '22' }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sub.color }} />
      <Text numberOfLines={1} style={{ color: c.text, fontSize: 12, fontWeight: '700', maxWidth: 260 }}>Đang lọc: {sub.name}</Text>
      <Ionicons name="close" size={14} color={c.muted} />
    </Pressable>
  );
}

export function SubjectSelect({ value, onChange, allowNone = true, noneLabel = 'Không gắn môn', variant = 'field', title = 'Chọn môn học', size = 34 }: {
  size?: number;
  value?: string;
  onChange: (id?: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  variant?: 'field' | 'filter';
  title?: string;
}) {
  const { subjects } = useScoped();
  const all = useStore((st) => st.subjects);
  const c = useColors();
  const s = useS();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = all.find((x) => x.id === value);
  const list = subjects.filter((x) => x.name.toLowerCase().includes(q.trim().toLowerCase()));
  const close = () => { setOpen(false); setQ(''); };
  const pick = (id?: string) => { onChange(id); close(); };

  const isFilter = variant === 'filter';
  const label = selected?.name ?? (allowNone ? noneLabel : 'Chọn môn học');

  return (
    <>
      {isFilter ? (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityLabel="Lọc theo môn học"
          style={({ pressed }) => ({ width: size, height: size, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : c.card, opacity: pressed ? 0.7 : 1 })}>
          <Ionicons name={selected ? 'funnel' : 'funnel-outline'} size={16} color={selected ? c.primary : c.muted} />
          {selected && <View style={{ position: 'absolute', top: 5, right: 5, width: 9, height: 9, borderRadius: 5, backgroundColor: selected.color, borderWidth: 1.5, borderColor: c.card }} />}
        </Pressable>
      ) : (
        <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [s.input, { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 0 }, pressed && { opacity: 0.7 }]}>
          {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: selected.color }} />}
          <Text numberOfLines={1} style={{ flexShrink: 1, color: selected ? c.text : c.muted, fontWeight: selected ? '700' : '500', fontSize: 15 }}>{label}</Text>
          <Ionicons name="chevron-down" size={18} color={c.muted} style={{ marginLeft: 'auto' }} />
        </Pressable>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: '#00000066' }]} />
          <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '75%', paddingBottom: insets.bottom + 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>{title}</Text>
              <Pressable onPress={close} hitSlop={10}><Ionicons name="close" size={22} color={c.muted} /></Pressable>
            </View>
            {subjects.length > 6 && (
              <View style={{ paddingHorizontal: 20 }}>
                <Input icon="search" placeholder="Tìm môn học" value={q} onChangeText={setQ} />
              </View>
            )}
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              {allowNone && !q && (
                <ListRow onPress={() => pick(undefined)}>
                  <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: c.border, marginRight: 14 }} />
                  <Text style={[s.title, { flex: 1 }]}>{noneLabel}</Text>
                  {!value && <Ionicons name="checkmark" size={20} color={c.primary} />}
                </ListRow>
              )}
              {list.map((x, i) => (
                <ListRow key={x.id} last={i === list.length - 1} onPress={() => pick(x.id)}>
                  <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: x.color, marginRight: 14 }} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={s.title}>{x.name}</Text>
                    {!!x.teacher && <Text numberOfLines={1} style={s.sub}>{x.teacher}</Text>}
                  </View>
                  {value === x.id && <Ionicons name="checkmark" size={20} color={c.primary} />}
                </ListRow>
              ))}
              {subjects.length === 0 && (
                <Empty icon="library-outline" text="Chưa có môn học nào" action={{ label: 'Thêm môn học', onPress: () => { close(); nav.navigate('SubjectForm', {}); } }} />
              )}
              {subjects.length > 0 && list.length === 0 && <Empty icon="search-outline" text="Không tìm thấy môn học" />}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

/** Giữ tên cũ cho các biểu mẫu: giờ là ô chọn gọn thay vì dàn hết chip */
export function SubjectPicker({ value, onChange, allowNone = true }: { value?: string; onChange: (id?: string) => void; allowNone?: boolean; wrap?: boolean }) {
  return <SubjectSelect value={value} onChange={onChange} allowNone={allowNone} />;
}

export function SubjectDot({ id }: { id?: string }) {
  const sub = useStore((st) => st.subjects.find((x) => x.id === id));
  const s = useS();
  return <View style={[s.dot, { backgroundColor: sub?.color ?? '#9ca3af' }]} />;
}

export const confirm = (title: string, onOk: () => void, okText = 'Xóa') =>
  showAlert(title, undefined, [{ text: 'Hủy', style: 'cancel' }, { text: okText, style: 'destructive', onPress: onOk }]);

/** Nhóm nút chọn 1 trong nhiều, chia đều chiều ngang */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { key: T; label: string; icon?: IconName; color?: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 2, marginBottom: 10 }}>
      {options.map((o) => {
        const active = o.key === value;
        const fg = active ? (o.color ? '#fff' : c.onPrimary) : c.muted;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8, backgroundColor: active ? (o.color ?? c.primary) : 'transparent' }}>
            {o.icon && <Ionicons name={o.icon} size={15} color={fg} />}
            <Text style={{ color: fg, fontWeight: active ? '700' : '500', fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tab chữ có gạch chân, dùng cho bộ lọc trong trang */
export function TextTabs<T extends string>({ options, value, onChange, right }: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void; right?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 10 }}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={{ marginRight: 20, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: active ? c.primary : 'transparent', marginBottom: -1 }}>
            <Text style={{ color: active ? c.text : c.muted, fontWeight: active ? '800' : '500', fontSize: 15 }}>{o.label}</Text>
          </Pressable>
        );
      })}
      {right && <View style={{ marginLeft: 'auto' }}>{right}</View>}
    </View>
  );
}

/** Nhãn nhỏ nền nhạt */
export const Pill = ({ text, color, icon }: { text: string; color: string; icon?: IconName }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color + '1f', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' }}>
    {icon && <Ionicons name={icon} size={12} color={color} />}
    <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{text}</Text>
  </View>
);

/** Mục trong biểu mẫu: tiêu đề nhỏ + nội dung, không khung */
export const FormCard = ({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) => {
  const c = useColors();
  const s = useS();
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Ionicons name={icon} size={14} color={c.muted} />
        <Text style={s.kicker}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

/** Ô nhập tiêu đề cỡ lớn, không viền */
export const BigInput = (p: TextInputProps) => {
  const c = useColors();
  return <TextInput placeholderTextColor={c.muted + '88'} {...p} style={[{ fontSize: 24, fontWeight: '800', color: c.text, letterSpacing: -0.6, paddingVertical: 2 }, p.style]} />;
};

/** Đầu trang chi tiết: vạch màu, dòng nhỏ, tiêu đề lớn */
export const Header = ({ kicker, title, sub, color }: { kicker?: string; title: string; sub?: string; color?: string }) => {
  const c = useColors();
  const s = useS();
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: color ?? c.primary, marginBottom: 10 }} />
      {!!kicker && <Text style={[s.kicker, { color: color ?? c.primary, marginBottom: 4 }]}>{kicker}</Text>}
      <Text style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: c.text }}>{title}</Text>
      {!!sub && <Text style={[s.sub, { fontSize: 14, marginTop: 2 }]}>{sub}</Text>}
    </View>
  );
};

/** Dãy số liệu chia cột bằng đường kẻ dọc */
export const StatRow = ({ items }: { items: { value: string; label: string; color?: string }[] }) => {
  const c = useColors();
  const s = useS();
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border }}>
      {items.map((x, i) => (
        <View key={x.label} style={{ flex: 1, height: 62, alignItems: 'center', justifyContent: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: c.border }}>
          <Text numberOfLines={1} style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: x.color ?? c.text, fontVariant: ['tabular-nums'] }}>{x.value}</Text>
          <Text numberOfLines={1} style={[s.sub, { marginTop: 0 }]}>{x.label}</Text>
        </View>
      ))}
    </View>
  );
};

/** Nút nhỏ có icon dùng khi điểm danh: bấm lần nữa để bỏ chọn */
export const AttBtn = ({ label, icon, tone, active, onPress }: { label: string; icon: IconName; tone: string; active: boolean; onPress: () => void }) => {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: active ? tone : c.border, backgroundColor: active ? tone : 'transparent', opacity: pressed ? 0.7 : 1 })}>
      <Ionicons name={icon} size={14} color={active ? '#fff' : c.muted} />
      <Text style={{ color: active ? '#fff' : c.text, fontSize: 13, fontWeight: active ? '700' : '500' }}>{label}</Text>
    </Pressable>
  );
};

/** Đồng hồ số buổi đã vắng so với giới hạn: xanh → vàng (còn 1 buổi) → đỏ (đã chạm) */
export const AbsentMeter = ({ absent, max }: { absent: number; max: number }) => {
  const c = useColors();
  const s = useS();
  const tone = absent >= max ? c.danger : absent === max - 1 ? c.warning : c.success;
  const msg = absent >= max ? 'Đã chạm giới hạn vắng, không được vắng thêm!' : absent === max - 1 ? 'Chỉ còn 1 buổi được vắng.' : `Còn ${max - absent} buổi được vắng.`;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={[s.row, { marginBottom: 6 }]}>
        <Text style={{ color: c.text, fontWeight: '700' }}>Đã vắng</Text>
        <Text style={{ color: tone, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{absent} / {max} buổi</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.chip }}>
        <View style={{ width: `${Math.min(100, (absent / Math.max(1, max)) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: tone }} />
      </View>
      <Text style={{ color: tone, fontSize: 12, fontWeight: '600', marginTop: 6 }}>{msg}</Text>
    </View>
  );
};

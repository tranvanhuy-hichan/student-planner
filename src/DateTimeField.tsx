import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Text } from 'react-native';
import { toHHMM } from './utils';
import { useColors, useS } from './ui';

type Props = { value: Date; mode: 'date' | 'time'; onChange: (d: Date) => void; style?: object };

export function DateTimeField({ value, mode, onChange, style }: Props) {
  const s = useS();
  const c = useColors();
  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="compact"
        locale="vi-VN"
        themeVariant={c.dark ? 'dark' : 'light'}
        onChange={(_, d) => d && onChange(d)}
        style={{ alignSelf: 'flex-start', marginBottom: 8 }}
      />
    );
  }
  const label = mode === 'date' ? value.toLocaleDateString('vi-VN') : toHHMM(value);
  return (
    <Pressable
      style={[s.input, style, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
      onPress={() =>
        DateTimePickerAndroid.open({
          value,
          mode,
          is24Hour: true,
          onChange: (e, d) => e.type === 'set' && d && onChange(d),
        })
      }>
      <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={c.primary} />
      <Text style={{ color: c.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

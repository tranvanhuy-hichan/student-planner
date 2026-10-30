import { Alert, AlertButton, Platform } from 'react-native';

/**
 * Thay cho Alert.alert: React Native không hiện gì với Alert trên web,
 * nên trên web dùng hộp thoại của trình duyệt (alert / confirm).
 * Có nhiều nút thì bấm OK = nút hành động cuối cùng không phải "Hủy".
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') return Alert.alert(title, message, buttons);
  const text = message ? `${title}\n\n${message}` : title;
  const action = [...(buttons ?? [])].reverse().find((b) => b.style !== 'cancel');
  if (buttons && buttons.length > 1) {
    if (window.confirm(text)) action?.onPress?.();
  } else {
    window.alert(text);
    buttons?.[0]?.onPress?.();
  }
}

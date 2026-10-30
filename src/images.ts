import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const DIR = (FileSystem.documentDirectory ?? '') + 'note-images/';

/** Chụp ảnh hoặc chọn từ thư viện; trả về đường dẫn đã lưu bền trên máy (undefined nếu hủy / bị từ chối quyền) */
export async function pickImage(source: 'camera' | 'library'): Promise<{ uri?: string; denied?: boolean }> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { denied: true };
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return {};
  const uri = res.assets[0].uri;
  if (Platform.OS === 'web') return { uri }; // web: giữ nguyên (data URI)
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
  const dest = DIR + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.jpg';
  await FileSystem.copyAsync({ from: uri, to: dest });
  return { uri: dest };
}

export async function deleteImage(uri: string) {
  if (Platform.OS === 'web' || !uri.startsWith(DIR)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

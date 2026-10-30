import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { NoteFile } from './types';

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

const FILE_DIR = (FileSystem.documentDirectory ?? '') + 'note-files/';
// Web lưu tệp dạng nhúng trong bộ nhớ trình duyệt nên giới hạn nhỏ hơn nhiều
const MAX_BYTES = Platform.OS === 'web' ? 1.5 * 1024 * 1024 : 50 * 1024 * 1024;
export const MAX_FILE_LABEL = Platform.OS === 'web' ? '1,5 MB' : '50 MB';

const blobToDataUrl = async (uri: string) => {
  const blob = await (await fetch(uri)).blob();
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
};

/** Chọn một tệp bất kỳ và lưu bền vào bộ nhớ của app; `tooBig` nếu vượt giới hạn dung lượng */
export async function pickFile(): Promise<{ file?: NoteFile; tooBig?: boolean }> {
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return {};
  const a = res.assets[0];
  if (a.size && a.size > MAX_BYTES) return { tooBig: true };
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  if (Platform.OS === 'web') {
    const uri = a.uri.startsWith('blob:') ? await blobToDataUrl(a.uri) : a.uri;
    return { file: { id, name: a.name, uri, size: a.size, mime: a.mimeType } };
  }
  await FileSystem.makeDirectoryAsync(FILE_DIR, { intermediates: true }).catch(() => {});
  const ext = a.name.includes('.') ? a.name.slice(a.name.lastIndexOf('.')) : '';
  const dest = FILE_DIR + id + ext;
  await FileSystem.copyAsync({ from: a.uri, to: dest });
  return { file: { id, name: a.name, uri: dest, size: a.size, mime: a.mimeType } };
}

/** Mở tệp bằng ứng dụng khác (hộp chia sẻ của hệ điều hành); trên web thì tải về */
export async function openFile(f: NoteFile) {
  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.href = f.uri;
    link.download = f.name;
    link.click();
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('unavailable');
  await Sharing.shareAsync(f.uri, { mimeType: f.mime, dialogTitle: f.name });
}

export async function deleteFile(f: NoteFile) {
  if (Platform.OS === 'web' || !f.uri.startsWith(FILE_DIR)) return;
  await FileSystem.deleteAsync(f.uri, { idempotent: true }).catch(() => {});
}

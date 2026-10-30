import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { useStore } from './store';
import type { Exam, Note, QuizQuestion } from './types';
import { EXAM_KINDS, examName } from './utils';

/* ───────────── Khóa API Gemini: lưu mã hóa trên máy, KHÔNG nằm trong dữ liệu app và bản sao lưu ───────────── */

const KEY_NAME = 'gemini_api_key';

export const useAiKey = create<{ key: string; loaded: boolean }>(() => ({ key: '', loaded: false }));

export async function loadApiKey() {
  let key = '';
  try {
    key = (Platform.OS === 'web' ? localStorage.getItem(KEY_NAME) : await SecureStore.getItemAsync(KEY_NAME)) ?? '';
  } catch {
    key = '';
  }
  useAiKey.setState({ key, loaded: true });
}

export async function saveApiKey(key: string) {
  const k = key.trim();
  if (Platform.OS === 'web') localStorage.setItem(KEY_NAME, k);
  else await SecureStore.setItemAsync(KEY_NAME, k);
  useAiKey.setState({ key: k, loaded: true });
}

export async function clearApiKey() {
  if (Platform.OS === 'web') localStorage.removeItem(KEY_NAME);
  else await SecureStore.deleteItemAsync(KEY_NAME).catch(() => {});
  useAiKey.setState({ key: '' });
}

/** "AIzaSy…a1b2" để hiển thị mà không lộ khóa */
export const maskKey = (k: string) => (k.length > 12 ? `${k.slice(0, 6)}…${k.slice(-4)}` : '••••••••');

/* ───────────── Mô hình Gemini ───────────── */

export const AI_MODELS = [
  { id: 'gemini-3.5-flash-lite', label: 'Flash-Lite', hint: 'Nhẹ và nhanh · có gói miễn phí' },
  { id: 'gemini-3.8-flash', label: 'Flash', hint: 'Cân bằng, nên dùng · có gói miễn phí' },
  { id: 'gemini-3.1-pro-preview', label: 'Pro', hint: 'Chất lượng cao nhất · trả phí' },
] as const;

/* ───────────── Lỗi ───────────── */

export class AiError extends Error {}

/** Chuyển lỗi HTTP của Gemini API thành thông báo dễ hiểu */
function httpError(status: number, apiMessage: string): AiError {
  if (status === 400 && /api key/i.test(apiMessage)) return new AiError('Khóa API không đúng. Hãy kiểm tra lại khóa trong Cài đặt.');
  if (status === 401 || status === 403) return new AiError('Khóa API không có quyền dùng mô hình này, hoặc đã bị thu hồi.');
  if (status === 404) return new AiError('Không tìm thấy mô hình đã chọn. Hãy chọn mô hình khác trong Cài đặt.');
  if (status === 429) return new AiError('Đã hết hạn mức miễn phí hoặc gọi quá nhanh. Hãy thử lại sau ít phút.');
  if (status >= 500) return new AiError('Máy chủ Gemini đang bận. Hãy thử lại sau.');
  return new AiError(`Yêu cầu bị từ chối (${status}): ${apiMessage}`);
}

export function describeAiError(e: unknown): string {
  if (e instanceof AiError) return e.message;
  if (e instanceof TypeError) return 'Không kết nối được tới máy chủ. Hãy kiểm tra mạng.'; // fetch lỗi mạng
  return 'Có lỗi xảy ra, vui lòng thử lại.';
}

/* ───────────── Gọi Gemini, trả về JSON ───────────── */

const MAX_INPUT_CHARS = 40_000;
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
};

async function generate(key: string, model: string, system: string | undefined, user: string, opts: { json: boolean; maxOutputTokens: number }): Promise<string> {
  const res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: opts.maxOutputTokens, ...(opts.json ? { responseMimeType: 'application/json' } : {}) },
    }),
  });
  let body: GeminiResponse = {};
  try {
    body = (await res.json()) as GeminiResponse;
  } catch {
    /* thân phản hồi không phải JSON */
  }
  if (!res.ok) throw httpError(res.status, body.error?.message ?? res.statusText);

  if (body.promptFeedback?.blockReason) throw new AiError('Gemini từ chối xử lý nội dung này. Hãy thử với nội dung khác.');
  const cand = body.candidates?.[0];
  if (cand?.finishReason === 'MAX_TOKENS') throw new AiError('Kết quả bị cắt vì quá dài. Hãy thử với ghi chú ngắn hơn hoặc ít câu hỏi hơn.');
  if (cand?.finishReason === 'SAFETY' || cand?.finishReason === 'PROHIBITED_CONTENT') throw new AiError('Gemini đã chặn kết quả vì lý do an toàn. Hãy thử với nội dung khác.');
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
  if (!text) throw new AiError('Gemini không trả về nội dung, hãy thử lại.');
  return text;
}

/** Gọi và đọc kết quả JSON; kiểm tra bằng `validate` để không đưa dữ liệu sai cấu trúc vào app */
async function askJson<T>(system: string, user: string, validate: (x: any) => T | undefined, maxOutputTokens = 8192): Promise<{ data: T; model: string }> {
  const key = useAiKey.getState().key;
  if (!key) throw new AiError('Chưa có khóa API. Hãy thêm khóa trong Cài đặt → Trợ lý AI.');
  if (user.length > MAX_INPUT_CHARS) throw new AiError('Nội dung quá dài để gửi cho AI. Hãy chia thành các ghi chú ngắn hơn.');
  const model = useStore.getState().settings.aiModel;
  const text = await generate(key, model, system, user, { json: true, maxOutputTokens });
  let parsed: unknown;
  try {
    // Phòng khi mô hình bọc kết quả trong ```json ... ```
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''));
  } catch {
    throw new AiError('Không đọc được kết quả từ AI, hãy thử lại.');
  }
  const data = validate(parsed);
  if (data === undefined) throw new AiError('AI trả về kết quả sai định dạng, hãy thử lại.');
  return { data, model };
}

/** Kiểm tra khóa + mô hình bằng một yêu cầu rất nhỏ */
export async function testConnection(key: string, model: string) {
  await generate(key, model, undefined, 'Trả lời đúng một từ: ok', { json: false, maxOutputTokens: 64 });
}

/* ───────────── Soạn nội dung ghi chú ───────────── */

function noteText(n: Note, subjectName?: string): string {
  if (!n.body.trim() && !n.checklist.length) throw new AiError('Ghi chú chưa có nội dung để AI xử lý. Hãy viết thêm vài dòng.');
  return [`Tiêu đề: ${n.title}`, subjectName && `Môn học: ${subjectName}`, n.body.trim(), n.checklist.length ? `Danh sách:\n${n.checklist.map((i) => `- ${i.text}`).join('\n')}` : '']
    .filter(Boolean)
    .join('\n\n');
}

const SYSTEM = 'Bạn là trợ lý học tập cho sinh viên Việt Nam. Luôn trả lời bằng tiếng Việt, rõ ràng, súc tích. Chỉ dựa vào nội dung được cung cấp, không bịa thêm thông tin. Chỉ trả về đúng một đối tượng JSON theo định dạng yêu cầu, không thêm chữ nào khác.';

const strArray = (x: unknown): string[] | undefined => (Array.isArray(x) && x.every((s) => typeof s === 'string') ? (x as string[]) : undefined);

/* ───────────── 1. Tóm tắt ───────────── */

export async function summarizeNote(n: Note, subjectName?: string) {
  const { data, model } = await askJson(
    SYSTEM,
    `Tóm tắt ghi chú bài học sau. Trả về JSON dạng:\n{"summary": "2-4 câu tóm tắt", "points": ["3-7 ý chính, mỗi ý một câu ngắn"], "keywords": ["3-8 từ khóa hoặc thuật ngữ"]}\n\n${noteText(n, subjectName)}`,
    (x) => (typeof x?.summary === 'string' && strArray(x.points) && strArray(x.keywords) ? { summary: x.summary as string, points: x.points as string[], keywords: x.keywords as string[] } : undefined),
  );
  return { text: data.summary, points: data.points, keywords: data.keywords, model, at: new Date().toISOString() };
}

/* ───────────── 2. Câu hỏi ôn tập ───────────── */

function toQuestion(q: any): QuizQuestion | undefined {
  if (typeof q?.question !== 'string' || typeof q?.explanation !== 'string') return undefined;
  if (q.type === 'short') return typeof q.answer === 'string' && q.answer ? { type: 'short', question: q.question, options: [], answerIndex: -1, answer: q.answer, explanation: q.explanation } : undefined;
  const options = strArray(q.options);
  const i = Number(q.answerIndex);
  // Trắc nghiệm hợp lệ: ít nhất 2 phương án và chỉ số đáp án nằm trong danh sách
  if (q.type !== 'mcq' || !options || options.length < 2 || !Number.isInteger(i) || i < 0 || i >= options.length) return undefined;
  return { type: 'mcq', question: q.question, options, answerIndex: i, answer: options[i], explanation: q.explanation };
}

export async function makeQuiz(n: Note, count: number, subjectName?: string) {
  const { data, model } = await askJson(
    SYSTEM,
    `Tạo đúng ${count} câu hỏi ôn tập từ ghi chú bài học sau. Khoảng 70% là trắc nghiệm, phần còn lại là câu hỏi trả lời ngắn. Trải đều các ý trong ghi chú, từ dễ đến khó; các phương án sai phải hợp lý. Trả về JSON dạng:\n{"questions": [\n  {"type": "mcq", "question": "...", "options": ["A", "B", "C", "D"], "answerIndex": 0, "answer": "nội dung đáp án đúng", "explanation": "giải thích ngắn vì sao đúng"},\n  {"type": "short", "question": "...", "options": [], "answerIndex": -1, "answer": "đáp án mẫu 1-2 câu", "explanation": "giải thích ngắn"}\n]}\n"answerIndex" là vị trí (từ 0) của đáp án đúng trong "options" với câu trắc nghiệm.\n\n${noteText(n, subjectName)}`,
    (x) => (Array.isArray(x?.questions) ? (x.questions.map(toQuestion).filter(Boolean) as QuizQuestion[]) : undefined),
  );
  if (!data.length) throw new AiError('AI chưa tạo được câu hỏi hợp lệ, hãy thử lại.');
  return { questions: data, model, at: new Date().toISOString() };
}

/* ───────────── 3. Kế hoạch ôn thi ───────────── */

export async function planExam(exam: Exam, subjectName: string | undefined, notes: Note[], subjects: { id: string; name: string }[]) {
  const daysLeft = Math.max(0, Math.ceil((new Date(exam.date).getTime() - Date.now()) / 86400_000));
  const material = notes.slice(0, 8).map((n, i) => `(${i + 1}) ${n.title}: ${n.body.trim().slice(0, 600)}${n.checklist.length ? ` | Việc: ${n.checklist.map((c) => c.text).join('; ')}` : ''}`).join('\n');
  const { data } = await askJson(
    SYSTEM,
    `Lập kế hoạch ôn thi thực tế cho sinh viên.\nKỳ thi: ${examName(exam, subjects)} (${EXAM_KINDS[exam.kind]})${exam.format ? `, hình thức ${exam.format}` : ''}.\nMôn: ${subjectName ?? 'chưa rõ'}.\nCòn ${daysLeft} ngày tới ngày thi (${new Date(exam.date).toLocaleDateString('vi-VN')}).\n\nTài liệu sinh viên đã ghi chú:\n${material || '(chưa có ghi chú nào)'}\n\nChia thành 5-10 bước cụ thể theo thời gian còn lại; nêu rõ chủ đề cần ôn nếu có trong ghi chú; nếu còn rất ít ngày thì gộp bước và ưu tiên phần quan trọng. Trả về JSON dạng:\n{"steps": [{"when": "mốc thời gian, ví dụ Hôm nay / Ngày 2-3 / Trước thi 1 ngày / Sáng ngày thi", "task": "việc cần làm ngắn gọn"}]}`,
    (x) => {
      if (!Array.isArray(x?.steps)) return undefined;
      const steps = x.steps.filter((s: any) => typeof s?.when === 'string' && typeof s?.task === 'string') as { when: string; task: string }[];
      return steps.length ? steps : undefined;
    },
  );
  return data;
}

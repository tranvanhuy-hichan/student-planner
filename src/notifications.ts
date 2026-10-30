import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function scheduleClass(
  subject: string,
  room: string,
  weekday: number,
  start: string,
  leadMin: number,
): Promise<string | undefined> {
  if (!(await ensurePermission())) return;
  const [h, m] = start.split(':').map(Number);
  let total = h * 60 + m - leadMin;
  let day = weekday;
  if (total < 0) {
    total += 1440;
    day = weekday === 1 ? 7 : weekday - 1;
  }
  return Notifications.scheduleNotificationAsync({
    content: { title: `Sắp vào học: ${subject}`, body: `${start} · Phòng ${room || '?'}` },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: day,
      hour: Math.floor(total / 60),
      minute: total % 60,
    },
  });
}

export async function scheduleAt(title: string, body: string, at: Date, data?: Record<string, unknown>): Promise<string | undefined> {
  if (at.getTime() <= Date.now() || !(await ensurePermission())) return;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  });
}

/** Hủy mọi thông báo tóm tắt buổi sáng đã hẹn (nhận biết bằng data.kind) */
export async function cancelSummaries() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => (n.content.data as { kind?: string } | undefined)?.kind === 'summary').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function scheduleDeadline(title: string, due: Date, hoursBefore: number) {
  return scheduleAt('Sắp đến hạn', title, new Date(due.getTime() - hoursBefore * 3600_000));
}

export async function notifyNow(title: string, body: string) {
  if (!(await ensurePermission())) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}

export const cancelNotif = async (id?: string) => {
  if (id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
};

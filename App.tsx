import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNavigationContainerRef, DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CalendarScreen from './src/screens/CalendarScreen';
import DeadlineScreen from './src/screens/DeadlineScreen';
import NotesScreen from './src/screens/NotesScreen';
import PomodoroScreen from './src/screens/PomodoroScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TodayScreen from './src/screens/TodayScreen';
import SubjectListScreen from './src/screens/SubjectListScreen';
import ClassDetail from './src/screens/details/ClassDetail';
import DeadlineDetail from './src/screens/details/DeadlineDetail';
import NoteDetail from './src/screens/details/NoteDetail';
import SubjectDetail from './src/screens/details/SubjectDetail';
import ClassForm from './src/screens/forms/ClassForm';
import DeadlineForm from './src/screens/forms/DeadlineForm';
import NoteForm from './src/screens/forms/NoteForm';
import SubjectForm from './src/screens/forms/SubjectForm';
import SemesterListScreen from './src/screens/SemesterListScreen';
import ProfileForm from './src/screens/forms/ProfileForm';
import SemesterForm from './src/screens/forms/SemesterForm';
import { profileComplete, useStore } from './src/store';
import { startSummaryScheduler } from './src/summary';
import type { IconName } from './src/types';
import { useColors } from './src/ui';

const navRef = createNavigationContainerRef<any>();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tab = (on: IconName, off: IconName) => ({
  tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
    <Ionicons name={focused ? on : off} size={24} color={color} />
  ),
});

// Tiêu đề biểu mẫu: "Thêm ..." khi tạo mới, "Sửa ..." khi có id
const form = (what: string) => ({ route }: { route: { params?: object } }) => ({
  title: `${(route.params as { id?: string } | undefined)?.id ? 'Sửa' : 'Thêm'} ${what}`,
  presentation: 'modal' as const,
});

function Tabs() {
  const c = useColors();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border, height: 62, paddingTop: 6, paddingBottom: 8, elevation: 0 },
        headerStyle: { backgroundColor: c.bg, ...(Platform.OS === 'web' ? { height: 52 } : {}) },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', fontSize: 26, letterSpacing: -0.7, color: c.text },
        headerTitleAlign: 'left',
      }}>
      <Tab.Screen name="Hôm nay" component={TodayScreen} options={{ ...tab('home', 'home-outline'), headerShown: false }} />
      <Tab.Screen name="Lịch học" component={ScheduleScreen} options={tab('calendar', 'calendar-outline')} />
      <Tab.Screen name="Deadline" component={DeadlineScreen} options={tab('alarm', 'alarm-outline')} />
      <Tab.Screen name="Ghi chú" component={NotesScreen} options={tab('document-text', 'document-text-outline')} />
      <Tab.Screen name="Pomodoro" component={PomodoroScreen} options={tab('timer', 'timer-outline')} />
    </Tab.Navigator>
  );
}

function useHydrated() {
  const [done, setDone] = useState(useStore.persist.hasHydrated());
  useEffect(() => {
    const off = useStore.persist.onFinishHydration(() => setDone(true));
    setDone(useStore.persist.hasHydrated());
    return off;
  }, []);
  return done;
}

export default function App() {
  const c = useColors();
  const hydrated = useHydrated();
  const [ready, setReady] = useState(false);
  const prompted = useRef(false);

  // Hẹn thông báo tóm tắt buổi sáng và tự hẹn lại khi dữ liệu đổi
  useEffect(() => startSummaryScheduler(), []);

  // Mở app mà chưa lưu hồ sơ (trường, lớp) thì nhắc điền, mỗi lần mở app một lần
  useEffect(() => {
    if (hydrated && ready && !prompted.current && !profileComplete(useStore.getState().profile)) {
      prompted.current = true;
      navRef.navigate('Profile');
    }
  }, [hydrated, ready]);

  const base = c.dark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, primary: c.primary, background: c.bg, card: c.bg, text: c.text, border: c.border } };
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme} ref={navRef} onReady={() => setReady(true)}>
        <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerTitleStyle: { fontWeight: '800' } }}>
          <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="Lịch" component={CalendarScreen} options={{ title: 'Lịch tháng' }} />
          <Stack.Screen name="Cài đặt" component={SettingsScreen} />
 <Stack.Screen name="SemesterList" component={SemesterListScreen} options={{ title: 'Học kỳ' }} />
          <Stack.Screen name="SemesterForm" component={SemesterForm} options={form('học kỳ')} />
          <Stack.Screen name="Profile" component={ProfileForm} options={{ title: 'Hồ sơ sinh viên', presentation: 'modal' }} />
          <Stack.Screen name="SubjectList" component={SubjectListScreen} options={{ title: 'Môn học & GPA' }} />
          <Stack.Screen name="SubjectDetail" component={SubjectDetail} options={{ title: 'Chi tiết môn học' }} />
          <Stack.Screen name="SubjectForm" component={SubjectForm} options={form('môn học')} />
          <Stack.Screen name="ClassDetail" component={ClassDetail} options={{ title: 'Chi tiết tiết học' }} />
          <Stack.Screen name="ClassForm" component={ClassForm} options={form('tiết học')} />
          <Stack.Screen name="DeadlineDetail" component={DeadlineDetail} options={{ title: 'Chi tiết deadline' }} />
          <Stack.Screen name="DeadlineForm" component={DeadlineForm} options={form('deadline')} />
          <Stack.Screen name="NoteDetail" component={NoteDetail} options={{ title: 'Ghi chú' }} />
          <Stack.Screen name="NoteForm" component={NoteForm} options={form('ghi chú')} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}

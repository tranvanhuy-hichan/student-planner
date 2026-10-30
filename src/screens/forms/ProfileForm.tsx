import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { profileComplete, useStore } from '../../store';
import { Button, ErrorText, Field, Header, Input, useColors, useS } from '../../ui';

export default function ProfileForm() {
  const nav = useNavigation<any>();
  const { profile, saveProfile } = useStore();
  const s = useS();
  const c = useColors();
  const firstTime = !profileComplete(profile);

  const [name, setName] = useState(profile.name);
  const [studentId, setStudentId] = useState(profile.studentId);
  const [school, setSchool] = useState(profile.school);
  const [className, setClassName] = useState(profile.className);
  const [error, setError] = useState('');

  const submit = () => {
    if (!school.trim()) return setError('Vui lòng nhập tên trường');
    if (!className.trim()) return setError('Vui lòng nhập lớp');
    saveProfile({ name, studentId, school, className });
    nav.goBack();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Header
        kicker={firstTime ? 'Chào mừng bạn' : 'Hồ sơ'}
        title={firstTime ? 'Hoàn tất hồ sơ sinh viên' : 'Hồ sơ sinh viên'}
        sub="Thông tin này chỉ lưu trên máy bạn, dùng để cá nhân hóa lời chào và thông báo."
      />
      <Field label="Họ và tên"><Input icon="person-outline" placeholder="VD: Trần Văn Huy" value={name} onChangeText={setName} /></Field>
      <Field label="Mã số sinh viên"><Input icon="id-card-outline" placeholder="Không bắt buộc" value={studentId} onChangeText={setStudentId} autoCapitalize="characters" /></Field>
      <Field label="Trường *"><Input icon="school-outline" placeholder="VD: Đại học Bách khoa" value={school} onChangeText={setSchool} /></Field>
      <Field label="Lớp *"><Input icon="people-outline" placeholder="VD: CNTT-K66" value={className} onChangeText={setClassName} autoCapitalize="characters" /></Field>
      <ErrorText text={error} />
      <Button icon="checkmark-circle" title="Lưu hồ sơ" onPress={submit} />
      {firstTime && <Button icon="time-outline" title="Để sau" color={c.muted} onPress={() => nav.goBack()} />}
      {firstTime && <Text style={[s.sub, { textAlign: 'center' }]}>Bạn có thể cập nhật lại bất cứ lúc nào trong Cài đặt.</Text>}
    </ScrollView>
  );
}

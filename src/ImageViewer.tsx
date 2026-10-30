import { useRef } from 'react';
import { FlatList, Image, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './ui';

/** Xem ảnh toàn màn hình, vuốt ngang để chuyển ảnh */
export function ImageViewer({ images, index, onClose }: { images: string[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const ref = useRef<FlatList<string>>(null);
  if (index === null) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          ref={ref}
          data={images}
          horizontal
          pagingEnabled
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(u) => u}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable onPress={onClose} style={{ width, height, justifyContent: 'center' }}>
              <Image source={{ uri: item }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
            </Pressable>
          )}
        />
        <Pressable onPress={onClose} hitSlop={12} style={{ position: 'absolute', top: insets.top + 12, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff26', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={24} color="#fff" />
        </Pressable>
        {images.length > 1 && (
          <Text style={{ position: 'absolute', bottom: insets.bottom + 20, alignSelf: 'center', color: '#ffffffaa', fontWeight: '700' }}>Vuốt để xem ảnh khác</Text>
        )}
      </View>
    </Modal>
  );
}

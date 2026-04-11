import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const { C } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {/* Kiri - 'i' */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="storefront" size={size ?? 26} color={color} />
          ),
        }}
      />

      {/* Tengah - 'o' */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pesanan',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inventory-2" size={size ?? 26} color={color} />
          ),
        }}
      />

      {/* Kanan - 'p' → file harus bernama profile.tsx */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size ?? 26} color={color} />
          ),
        }}
      />

      {/* Sembunyikan dari tab bar */}
      <Tabs.Screen name="cart"         options={{ href: null }} />
      <Tabs.Screen name="checkout"     options={{ href: null }} />
      <Tabs.Screen name="explore"      options={{ href: null }} />
      <Tabs.Screen name="login"        options={{ href: null }} />
      <Tabs.Screen name="product/[id]" options={{ href: null }} />
    </Tabs>
  );
}
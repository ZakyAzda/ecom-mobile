import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false, 
        tabBarActiveTintColor: '#10B981', // Warna hijau pas menu dipilih
        tabBarStyle: { height: 60, paddingBottom: 10 } 
      }}
    >
      {/* Menu Beranda */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={28} color={color} />,
        }}
      />
      
      {/* Menu Saya (Arahin ke login.tsx) */}
      <Tabs.Screen
        name="login"
        options={{
          title: 'Saya',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
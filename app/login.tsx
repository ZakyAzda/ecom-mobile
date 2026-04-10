import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Sesuaikan IP lu lek (Jangan lupa port 3000 kalau server Go lu jalan di 3000)
const API_URL = 'http://192.168.10.185:3000';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Eits', 'Email sama password isi dulu lek!');
      return;
    }

    setLoading(true);
    try {
      // 1. Nembak API Login ke backend Go
      const res = await axios.post(`${API_URL}/api/login`, {
        email: email,
        password: password,
      });

      // 2. Tangkap token JWT-nya
      const token = res.data.token;

      // 3. Simpan ke brankas HP
      await AsyncStorage.setItem('userToken', token);

      Alert.alert('Mantap!', 'Berhasil login bos!');
      
      // 4. Balik ke halaman utama (Home)
      router.replace('/(tabs)'); 
      
    } catch (error: any) {
      console.error(error);
      Alert.alert('Gagal Login', 'Email atau password lu salah lek!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Masuk Akun</Text>
        <Text style={styles.subtitle}>Beli alat hidroponik sekarang</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput 
            style={styles.input} 
            placeholder="contoh@zaky.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Masuk</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
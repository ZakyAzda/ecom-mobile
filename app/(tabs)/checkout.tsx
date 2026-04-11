import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
  StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { orderAPI } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';

type PayMethod = 'COD' | 'TRANSFER';

const PAY_METHODS: { id: PayMethod; label: string; icon: string; desc: string }[] = [
  { id: 'COD',      label: 'Bayar di Tempat',  icon: '💵', desc: 'Bayar saat barang tiba' },
  { id: 'TRANSFER', label: 'Transfer Bank',     icon: '🏦', desc: 'Via BCA / Mandiri / BRI' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { C, brand, scheme } = useTheme();
  const params = useLocalSearchParams<{
    from?: string;
    product_id?: string;
    quantity?: string;
  }>();

  const [address, setAddress]       = useState('');
  const [payMethod, setPayMethod]   = useState<PayMethod>('COD');
  const [loading, setLoading]       = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);

  const handleCheckout = async () => {
    if (!address.trim()) {
      Alert.alert('Alamat Kosong', 'Masukkan alamat pengiriman dulu ya!');
      return;
    }
    if (address.trim().length < 10) {
      Alert.alert('Alamat Kurang Detail', 'Tolong isi alamat lengkap agar pesanan bisa sampai.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        address: address.trim(),
        payment_method: payMethod,
      };

      if (params.from === 'cart') {
        // Checkout dari keranjang — backend ambil semua cart item user
        payload.cart_ids = [];
      } else if (params.product_id) {
        // Beli langsung dari halaman produk
        payload.product_id = Number(params.product_id);
        payload.quantity   = Number(params.quantity ?? 1);
      }

      await orderAPI.checkout(payload);

      Alert.alert(
        '🎉 Pesanan Berhasil!',
        payMethod === 'COD'
          ? 'Pesananmu sedang diproses. Siapkan uang saat kurir datang!'
          : 'Pesananmu berhasil dibuat. Segera lakukan transfer untuk konfirmasi.',
        [{
          text: 'Lihat Pesanan',
          onPress: () => {
            router.dismissAll();
            router.push('/(tabs)/orders' as any);
          },
        }]
      );
    } catch (e: any) {
      Alert.alert('Checkout Gagal', e.response?.data?.error ?? 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: C.surfaceAlt }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Progress steps */}
          <View style={styles.steps}>
            {['Alamat', 'Pembayaran', 'Konfirmasi'].map((step, i) => (
              <React.Fragment key={step}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle,
                    { backgroundColor: i <= 1 ? brand.primary : C.border },
                  ]}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepLabel, { color: i <= 1 ? brand.primary : C.textMuted }]}>
                    {step}
                  </Text>
                </View>
                {i < 2 && (
                  <View style={[styles.stepLine, { backgroundColor: i < 1 ? brand.primary : C.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* ── Seksi Alamat ── */}
          <View style={[styles.section, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="location-on" size={20} color={brand.primary} />
              <Text style={[styles.sectionTitle, { color: C.text }]}>Alamat Pengiriman</Text>
            </View>

            <TextInput
              style={[
                styles.addressInput,
                {
                  backgroundColor: C.surfaceAlt,
                  borderColor: addressFocused ? brand.primary : C.border,
                  color: C.text,
                },
              ]}
              placeholder="Contoh: Jl. Mawar No. 5, Kel. Sukamaju, Kec. Coblong, Kota Bandung, Jawa Barat 40132"
              placeholderTextColor={C.textMuted}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onFocus={() => setAddressFocused(true)}
              onBlur={() => setAddressFocused(false)}
            />
            <Text style={[styles.addressHint, { color: C.textMuted }]}>
              💡 Isi alamat lengkap termasuk nama jalan, nomor, kelurahan, kecamatan & kota
            </Text>
          </View>

          {/* ── Seksi Metode Pembayaran ── */}
          <View style={[styles.section, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="payment" size={20} color={brand.primary} />
              <Text style={[styles.sectionTitle, { color: C.text }]}>Metode Pembayaran</Text>
            </View>

            <View style={styles.payMethods}>
              {PAY_METHODS.map((method) => {
                const isSelected = payMethod === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.payCard,
                      {
                        backgroundColor: isSelected ? brand.primaryMuted : C.surfaceAlt,
                        borderColor: isSelected ? brand.primary : C.border,
                      },
                    ]}
                    onPress={() => setPayMethod(method.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.payIcon}>{method.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.payLabel, { color: C.text }]}>{method.label}</Text>
                      <Text style={[styles.payDesc, { color: C.textMuted }]}>{method.desc}</Text>
                    </View>
                    <View style={[
                      styles.radio,
                      {
                        borderColor: isSelected ? brand.primary : C.border,
                        backgroundColor: isSelected ? brand.primary : 'transparent',
                      },
                    ]}>
                      {isSelected && <MaterialIcons name="check" size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Info COD ── */}
          {payMethod === 'COD' && (
            <View style={[styles.infoBox, { backgroundColor: brand.primaryMuted, borderColor: brand.primary + '40' }]}>
              <MaterialIcons name="info" size={18} color={brand.primary} />
              <Text style={[styles.infoText, { color: brand.primaryDark }]}>
                Siapkan uang pas saat kurir tiba. Status pesanan langsung jadi "Pengiriman".
              </Text>
            </View>
          )}

          {payMethod === 'TRANSFER' && (
            <View style={[styles.infoBox, { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }]}>
              <MaterialIcons name="info" size={18} color="#2563EB" />
              <Text style={[styles.infoText, { color: '#1D4ED8' }]}>
                Setelah checkout, kamu akan mendapat nomor rekening untuk transfer. Pesanan dikonfirmasi setelah pembayaran diterima.
              </Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom tombol */}
      <View style={[styles.bottomBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[
            styles.checkoutBtn,
            { backgroundColor: brand.primary, shadowColor: brand.primary },
            loading && { opacity: 0.7 },
          ]}
          onPress={handleCheckout}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.checkoutBtnText}>Buat Pesanan</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },

  // Progress
  steps: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  stepNum: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepLabel: { fontSize: 10, fontWeight: '600' },
  stepLine: { flex: 1, height: 2, marginBottom: 14, marginHorizontal: 4 },

  content: { paddingHorizontal: 16, paddingBottom: 100, gap: 16 },

  // Seksi
  section: {
    borderRadius: 20, padding: 20, gap: 14,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },

  // Alamat
  addressInput: {
    borderRadius: 14, borderWidth: 1.5,
    padding: 14, fontSize: 14, lineHeight: 22,
    minHeight: 110,
  },
  addressHint: { fontSize: 12, lineHeight: 18 },

  // Metode bayar
  payMethods: { gap: 10 },
  payCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, padding: 14, borderWidth: 1.5,
  },
  payIcon: { fontSize: 24 },
  payLabel: { fontSize: 14, fontWeight: '700' },
  payDesc: { fontSize: 12, marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },

  // Info box
  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // Bottom
  bottomBar: {
    padding: 16, paddingBottom: 32, borderTopWidth: 1,
  },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 18, paddingVertical: 16,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  checkoutBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
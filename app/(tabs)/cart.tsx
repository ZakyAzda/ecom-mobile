import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { cartAPI, BASE_URL } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah } from '@/components/ProductCard';
import { Image } from 'expo-image';

type CartItem = {
  ID: number;
  quantity: number;
  product: { ID: number; name: string; price: number; image_url: string; stock: number };
};

export default function CartScreen() {
  const router = useRouter();
  const { C, brand, scheme } = useTheme();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchCart = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { setIsLoggedIn(false); setLoading(false); return; }
    setIsLoggedIn(true);
    try {
      const res = await cartAPI.getMyCart();
      setItems(res.data?.data ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const handleCheckout = () => {
    if (items.length === 0) { Alert.alert('Keranjang Kosong', 'Tambahkan produk dulu yuk!'); return; }
    router.push({ pathname: '/checkout', params: { from: 'cart' } } as any);
  };

  if (loading) return (
    <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
      <ActivityIndicator color={brand.primary} size="large" />
    </SafeAreaView>
  );

  if (!isLoggedIn) return (
    <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
      <MaterialIcons name="lock" size={52} color={C.textMuted} />
      <Text style={[styles.emptyTitle, { color: C.text }]}>Belum Login</Text>
      <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
        Login dulu untuk melihat keranjangmu
      </Text>
      <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: brand.primary }]}
        onPress={() => router.push('/(tabs)/login' as any)}>
        <Text style={styles.ctaBtnText}>Login Sekarang</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

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
        <Text style={[styles.headerTitle, { color: C.text }]}>Keranjang</Text>
        <Text style={[styles.headerCount, { color: C.textSecondary }]}>{items.length} item</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.ID)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          let uri = item.product.image_url || '';
          uri = uri.replace('http://localhost:3000', BASE_URL).replace('https://localhost:3000', BASE_URL);
          if (!uri.startsWith('http') && uri !== '') {
            uri = `${BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
          }
          return (
            <View style={[styles.itemCard, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
              <Image source={{ uri }} style={[styles.itemImage, { backgroundColor: C.surfaceAlt }]} contentFit="cover" transition={400} />
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: C.text }]} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text style={[styles.itemPrice, { color: brand.primary }]}>
                  {formatRupiah(item.product.price)}
                </Text>
                <View style={[styles.qtyBadge, { backgroundColor: C.surfaceAlt }]}>
                  <Text style={[styles.qtyText, { color: C.textSecondary }]}>Qty: {item.quantity}</Text>
                </View>
              </View>
              <Text style={[styles.itemSubtotal, { color: C.text }]}>
                {formatRupiah(item.product.price * item.quantity)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <MaterialIcons name="shopping-cart" size={52} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>Keranjang Kosong</Text>
            <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>Yuk mulai belanja!</Text>
            <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: brand.primary }]}
              onPress={() => router.push('/(tabs)')}>
              <Text style={styles.ctaBtnText}>Lihat Produk</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Bottom bar */}
      {items.length > 0 && (
        <View style={[styles.checkoutBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
          <View>
            <Text style={[styles.totalLabel, { color: C.textMuted }]}>Total Belanja</Text>
            <Text style={[styles.totalAmount, { color: brand.primary }]}>{formatRupiah(totalPrice)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkoutBtn, { backgroundColor: brand.primary, shadowColor: brand.primary }]}
            onPress={handleCheckout}
          >
            <Text style={styles.checkoutBtnText}>Checkout</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
  headerCount: { fontSize: 13 },
  listContent: { padding: 16, gap: 12, paddingBottom: 120 },
  itemCard: {
    flexDirection: 'row', borderRadius: 16, padding: 12, alignItems: 'center', gap: 12,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  itemImage: { width: 72, height: 72, borderRadius: 12 },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  itemPrice: { fontSize: 13, fontWeight: '700' },
  qtyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  qtyText: { fontSize: 12, fontWeight: '600' },
  itemSubtotal: { fontSize: 13, fontWeight: '800' },
  emptyWrapper: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySubtitle: { fontSize: 14 },
  ctaBtn: { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  checkoutBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08,
    shadowRadius: 12, elevation: 12,
  },
  totalLabel: { fontSize: 12, fontWeight: '500' },
  totalAmount: { fontSize: 20, fontWeight: '900' },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  checkoutBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
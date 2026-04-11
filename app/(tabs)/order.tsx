import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { orderAPI } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah } from '@/components/ProductCard';

type OrderItem = { ID: number; product: { name: string }; quantity: number; price: number };
type Order = {
  ID: number; CreatedAt: string; status: string;
  total_amount: number; payment_method: string; order_items: OrderItem[];
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  BELUM_BAYAR: { label: 'Belum Bayar', color: '#D97706', bg: '#FEF3C7' },
  PENGIRIMAN:  { label: 'Dikirim',     color: '#2563EB', bg: '#DBEAFE' },
  SELESAI:     { label: 'Selesai',     color: '#059669', bg: '#D1FAE5' },
  DIBATALKAN:  { label: 'Dibatalkan',  color: '#DC2626', bg: '#FEE2E2' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const { C, brand, scheme } = useTheme();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchOrders = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { setIsLoggedIn(false); setLoading(false); return; }
    setIsLoggedIn(true);
    try {
      const res = await orderAPI.getMyOrders();
      setOrders(res.data?.data ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchOrders(); setRefreshing(false); };

  if (loading) return (
    <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
      <ActivityIndicator color={brand.primary} size="large" />
    </SafeAreaView>
  );

  if (!isLoggedIn) return (
    <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
      <MaterialIcons name="lock" size={52} color={C.textMuted} />
      <Text style={[styles.emptyTitle, { color: C.text }]}>Belum Login</Text>
      <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>Login dulu untuk melihat pesananmu</Text>
      <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: brand.primary }]}
        onPress={() => router.push('/(tabs)/login' as any)}>
        <Text style={styles.ctaBtnText}>Login Sekarang</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Pesanan Saya</Text>
        <Text style={[styles.headerSub, { color: C.textSecondary }]}>{orders.length} pesanan</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => String(o.ID)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.primary]} tintColor={brand.primary} />}
        renderItem={({ item: order }) => {
          const st = STATUS_MAP[order.status] ?? { label: order.status, color: C.textSecondary, bg: C.surfaceAlt };
          const date = new Date(order.CreatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

          return (
            <View style={[styles.card, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.orderId, { color: C.text }]}>#{order.ID.toString().padStart(4, '0')}</Text>
                  <Text style={[styles.orderDate, { color: C.textMuted }]}>{date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

              {order.order_items?.slice(0, 3).map((item) => (
                <View key={item.ID} style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: C.text }]} numberOfLines={1}>
                    {item.product?.name ?? 'Produk'}
                  </Text>
                  <Text style={[styles.itemQty, { color: C.textMuted }]}>x{item.quantity}</Text>
                  <Text style={[styles.itemPrice, { color: C.textSecondary }]}>
                    {formatRupiah(item.price * item.quantity)}
                  </Text>
                </View>
              ))}
              {(order.order_items?.length ?? 0) > 3 && (
                <Text style={[styles.moreItems, { color: C.textMuted }]}>
                  +{order.order_items.length - 3} item lainnya
                </Text>
              )}

              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <View style={styles.cardFooter}>
                <Text style={[styles.payMethod, { color: C.textSecondary }]}>
                  💳 {order.payment_method}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.totalLabel, { color: C.textMuted }]}>Total</Text>
                  <Text style={[styles.totalAmount, { color: brand.primary }]}>
                    {formatRupiah(order.total_amount)}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <MaterialIcons name="inbox" size={52} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>Belum Ada Pesanan</Text>
            <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>Yuk mulai belanja!</Text>
            <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: brand.primary }]}
              onPress={() => router.push('/(tabs)')}>
              <Text style={styles.ctaBtnText}>Belanja Sekarang</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  header: { padding: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSub: { fontSize: 13, marginTop: 2 },
  listContent: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    borderRadius: 18, padding: 16,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 15, fontWeight: '800' },
  orderDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800' },
  divider: { height: 1, marginVertical: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '500' },
  itemQty: { fontSize: 12, marginHorizontal: 8 },
  itemPrice: { fontSize: 13, fontWeight: '700' },
  moreItems: { fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  payMethod: { fontSize: 12, fontWeight: '600' },
  totalLabel: { fontSize: 11 },
  totalAmount: { fontSize: 16, fontWeight: '900' },
  emptyWrapper: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySubtitle: { fontSize: 14 },
  ctaBtn: { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
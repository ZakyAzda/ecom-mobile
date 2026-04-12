import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { cartAPI, BASE_URL } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah } from '@/components/ProductCard';
import { Image } from 'expo-image';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';

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
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  // Track local quantity changes (cartID -> qty)
  const [localQty, setLocalQty] = useState<Record<number, number>>({});
  const [updatingQty, setUpdatingQty] = useState<Set<number>>(new Set());

  const fetchCart = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { setIsLoggedIn(false); setLoading(false); return; }
    setIsLoggedIn(true);
    try {
      const res = await cartAPI.getMyCart();
      const cartItems: CartItem[] = res.data?.data ?? [];
      setItems(cartItems);
      // Init local qty dari server
      const initQty: Record<number, number> = {};
      cartItems.forEach(i => { initQty[i.ID] = i.quantity; });
      setLocalQty(initQty);
    } catch {}
    setLoading(false);
  }, []);

  // ✅ FIX: Refresh cart setiap kali screen difokus (bukan hanya saat mount)
  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart])
  );

  const toggleSelect = (id: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.ID)));
    }
  };

  // Hapus item dari cart lalu tambah ulang dengan qty baru
  // (Workaround karena backend tidak punya endpoint update qty)
  const handleChangeQty = async (item: CartItem, delta: number) => {
    const currentQty = localQty[item.ID] ?? item.quantity;
    const newQty = currentQty + delta;

    if (newQty < 1) return;
    if (newQty > item.product.stock) {
      Alert.alert('Stok Tidak Cukup', `Stok tersedia: ${item.product.stock}`);
      return;
    }

    // Optimistic update UI
    setLocalQty(prev => ({ ...prev, [item.ID]: newQty }));
    setUpdatingQty(prev => new Set(prev).add(item.ID));

    try {
      // Hapus cart lama, buat baru dengan qty baru
      await cartAPI.removeFromCart(item.ID);
      const addRes = await cartAPI.addToCart(item.product.ID, newQty);

      // Refresh cart untuk dapat ID baru dari server
      const res = await cartAPI.getMyCart();
      const newItems: CartItem[] = res.data?.data ?? [];
      setItems(newItems);

      // Rebuild localQty & selectedItems dengan ID baru
      const updatedQty: Record<number, number> = {};
      newItems.forEach(i => { updatedQty[i.ID] = i.quantity; });
      setLocalQty(updatedQty);

      // Cari item yang baru (product ID sama)
      const newItem = newItems.find(i => i.product.ID === item.product.ID);
      if (newItem) {
        setSelectedItems(prev => {
          const wasSelected = prev.has(item.ID);
          const next = new Set(prev);
          next.delete(item.ID);
          if (wasSelected) next.add(newItem.ID);
          return next;
        });
      }
    } catch (e: any) {
      // Rollback jika gagal
      setLocalQty(prev => ({ ...prev, [item.ID]: currentQty }));
      Alert.alert('Gagal', 'Gagal mengubah jumlah item');
    } finally {
      setUpdatingQty(prev => {
        const next = new Set(prev);
        next.delete(item.ID);
        return next;
      });
    }
  };

  const handleDelete = async (productId: number, cartId: number) => {
    try {
      await cartAPI.removeFromCart(cartId);
      setItems(prev => prev.filter(item => item.ID !== cartId));
      setLocalQty(prev => { const next = { ...prev }; delete next[cartId]; return next; });
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(cartId);
        return newSet;
      });
    } catch (err) {
      Alert.alert('Error', 'Gagal menghapus item dari keranjang');
    }
  };

  const totalPrice = items
    .filter(i => selectedItems.has(i.ID))
    .reduce((sum, i) => sum + i.product.price * (localQty[i.ID] ?? i.quantity), 0);

  const handleCheckout = () => {
    if (selectedItems.size === 0) {
      Alert.alert('Pilih Produk', 'Pilih minimal satu produk untuk di-checkout!');
      return;
    }
    // ✅ FIX: Kirim cart_ids yang benar + total harga
    const cartIds = Array.from(selectedItems).join(',');
    router.push({ pathname: '/checkout', params: { from: 'cart', cart_ids: cartIds, total: String(totalPrice) } } as any);
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

  const isAllSelected = items.length > 0 && selectedItems.size === items.length;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={C.background} />

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

        {/* Select All Row */}
        {items.length > 0 && (
          <View style={[styles.selectAllRow, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
            <TouchableOpacity style={styles.checkboxContainer} onPress={toggleSelectAll}>
              <View style={[styles.checkbox, isAllSelected && { backgroundColor: brand.primary, borderColor: brand.primary }]}>
                {isAllSelected && <MaterialIcons name="check" size={16} color="#fff" />}
              </View>
              <Text style={[styles.selectAllText, { color: C.text }]}>Pilih Semua</Text>
            </TouchableOpacity>
          </View>
        )}

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
            const isSelected = selectedItems.has(item.ID);
            const qty = localQty[item.ID] ?? item.quantity;
            const isUpdating = updatingQty.has(item.ID);

            return (
              <Swipeable
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={() => handleDelete(item.product.ID, item.ID)}
                  >
                    <MaterialIcons name="delete" size={28} color="#fff" />
                    <Text style={styles.deleteText}>Hapus</Text>
                  </TouchableOpacity>
                )}
              >
                <View style={[styles.itemCardWrapper, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
                  {/* Checkbox */}
                  <TouchableOpacity style={styles.checkboxContainer} onPress={() => toggleSelect(item.ID)}>
                    <View style={[styles.checkbox, isSelected && { backgroundColor: brand.primary, borderColor: brand.primary }]}>
                      {isSelected && <MaterialIcons name="check" size={16} color="#fff" />}
                    </View>
                  </TouchableOpacity>

                  {/* Gambar */}
                  <Image
                    source={{ uri }}
                    style={[styles.itemImage, { backgroundColor: C.surfaceAlt }]}
                    contentFit="cover"
                    transition={400}
                  />

                  {/* Info */}
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: C.text }]} numberOfLines={2}>
                      {item.product.name}
                    </Text>
                    <Text style={[styles.itemPrice, { color: brand.primary }]}>
                      {formatRupiah(item.product.price)}
                    </Text>

                    {/* ✅ Tombol tambah/kurang qty */}
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={[
                          styles.qtyBtn,
                          { borderColor: C.border, backgroundColor: C.surfaceAlt },
                          (qty <= 1 || isUpdating) && styles.qtyBtnDisabled,
                        ]}
                        onPress={() => handleChangeQty(item, -1)}
                        disabled={qty <= 1 || isUpdating}
                      >
                        <MaterialIcons name="remove" size={14} color={qty <= 1 ? C.textMuted : C.text} />
                      </TouchableOpacity>

                      <View style={[styles.qtyValueBox, { backgroundColor: C.surfaceAlt }]}>
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={brand.primary} />
                        ) : (
                          <Text style={[styles.qtyValue, { color: C.text }]}>{qty}</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.qtyBtn,
                          { borderColor: C.border, backgroundColor: C.surfaceAlt },
                          (qty >= item.product.stock || isUpdating) && styles.qtyBtnDisabled,
                        ]}
                        onPress={() => handleChangeQty(item, +1)}
                        disabled={qty >= item.product.stock || isUpdating}
                      >
                        <MaterialIcons name="add" size={14} color={qty >= item.product.stock ? C.textMuted : brand.primary} />
                      </TouchableOpacity>

                      <Text style={[styles.stockHint, { color: C.textMuted }]}>
                        Stok: {item.product.stock}
                      </Text>
                    </View>

                    {/* Subtotal per item */}
                    <Text style={[styles.subtotal, { color: C.textSecondary }]}>
                      Subtotal: {formatRupiah(item.product.price * qty)}
                    </Text>
                  </View>
                </View>
              </Swipeable>
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
            <View style={styles.totalContainer}>
              <Text style={[styles.totalLabel, { color: C.textMuted }]}>Total Harga</Text>
              <Text style={[styles.totalAmount, { color: brand.primary }]}>{formatRupiah(totalPrice)}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                { backgroundColor: selectedItems.size > 0 ? brand.primary : C.surfaceAlt, shadowColor: brand.primary },
              ]}
              onPress={handleCheckout}
              disabled={selectedItems.size === 0}
            >
              <Text style={[styles.checkoutBtnText, { color: selectedItems.size > 0 ? '#fff' : C.textMuted }]}>
                Checkout ({selectedItems.size})
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color={selectedItems.size > 0 ? '#fff' : C.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
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
  selectAllRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  selectAllText: { fontSize: 14, fontWeight: '600' },
  listContent: { padding: 16, gap: 12, paddingBottom: 120 },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 16,
    marginLeft: 8,
  },
  deleteText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },
  itemCardWrapper: {
    flexDirection: 'row', borderRadius: 16, padding: 12, alignItems: 'flex-start', gap: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  checkboxContainer: { padding: 4, marginRight: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ccc',
    justifyContent: 'center', alignItems: 'center',
  },
  itemImage: { width: 72, height: 72, borderRadius: 12 },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  itemPrice: { fontSize: 13, fontWeight: '700' },

  // Qty controls
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnDisabled: { opacity: 0.35 },
  qtyValueBox: {
    width: 32, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyValue: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  stockHint: { fontSize: 10, marginLeft: 2 },

  subtotal: { fontSize: 11, fontWeight: '600', marginTop: 2 },

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
  totalContainer: { flex: 1 },
  totalLabel: { fontSize: 12, fontWeight: '500' },
  totalAmount: { fontSize: 18, fontWeight: '900' },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  checkoutBtnText: { fontWeight: '800', fontSize: 15 },
});
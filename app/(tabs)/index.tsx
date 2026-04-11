import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, RefreshControl, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductCard, { Product } from '@/components/ProductCard';
import { productAPI, cartAPI } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import { MaterialIcons } from '@expo/vector-icons';

type Category = { ID: number; name: string };

export default function HomeScreen() {
  const router = useRouter();
  const { C, brand, scheme } = useTheme();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchProducts = useCallback(async (q = search, cat = selectedCat) => {
    try {
      const res = await productAPI.getAll(q || undefined, cat || undefined);
      setProducts(res.data);
    } catch {}
  }, []);

  const fetchCartCount = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await cartAPI.getMyCart();
      setCartCount(res.data?.data?.length ?? 0);
    } catch {}
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      setIsLoggedIn(!!token);
      const res = await productAPI.getCategories().catch(() => ({ data: [] }));
      setCategories(res.data);
      await Promise.all([fetchProducts(), fetchCartCount()]);
      setLoading(false);
    };
    init();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProducts(), fetchCartCount()]);
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    fetchProducts(text, selectedCat);
  };

  const handleCategory = (id: string) => {
    const next = selectedCat === id ? '' : id;
    setSelectedCat(next);
    fetchProducts(search, next);
  };

  const handleAddToCart = async (product: Product) => {
    if (!isLoggedIn) {
      Alert.alert('Belum Login', 'Login dulu untuk menambahkan ke keranjang 🛒', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(tabs)/login') },
      ]);
      return;
    }
    try {
      await cartAPI.addToCart(product.ID, 1);
      setCartCount((c) => c + 1);
      Alert.alert('✅ Berhasil', `${product.name} masuk keranjang!`);
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.error ?? 'Gagal tambah ke keranjang');
    }
  };

  const ListHeader = () => (
    <View>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.greeting, { color: C.text }]}>Selamat Belanja 👋</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>
            Temukan produk terbaik
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.cartBtn, { backgroundColor: C.surface, shadowColor: C.shadow }]}
          onPress={() => router.push('/cart')}
        >
          <MaterialIcons name="shopping-cart" size={22} color={brand.primary} />
          {cartCount > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: C.error }]}>
              <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchWrapper, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
        <MaterialIcons name="search" size={20} color={C.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Cari produk..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <MaterialIcons name="close" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Kategori chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
      >
        {[{ ID: 0, name: 'Semua' }, ...categories].map((cat) => {
          const id = cat.ID === 0 ? '' : String(cat.ID);
          const active = selectedCat === id;
          return (
            <TouchableOpacity
              key={cat.ID}
              style={[
                styles.catChip,
                {
                  backgroundColor: active ? brand.primary : C.surface,
                  borderColor: active ? brand.primary : C.border,
                },
              ]}
              onPress={() => handleCategory(id)}
            >
              <Text
                style={[
                  styles.catText,
                  { color: active ? '#fff' : C.textSecondary },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[styles.resultText, { color: C.textMuted }]}>
        {products.length} produk ditemukan
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={brand.primary} />
        <Text style={[styles.loadingText, { color: C.textSecondary }]}>Memuat produk...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.ID)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.primary]} tintColor={brand.primary} />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={(p) => router.push({ pathname: '/product/[id]', params: { id: p.ID } } as any)}
            onAddToCart={handleAddToCart}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <Text style={styles.emptyEmoji}>🛍️</Text>
            <Text style={[styles.emptyTitle, { color: C.text }]}>Produk tidak ditemukan</Text>
            <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
              Coba kata kunci lain
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  greeting: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 1 },
  cartBtn: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    borderRadius: 10, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 12,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  catScroll: { paddingHorizontal: 16, paddingBottom: 4, gap: 8 },
  catChip: {
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1.5,
  },
  catText: { fontSize: 13, fontWeight: '600' },
  resultText: { fontSize: 12, fontWeight: '500', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },
  emptyWrapper: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 13 },
});
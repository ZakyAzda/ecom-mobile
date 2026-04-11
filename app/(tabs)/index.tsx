import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, RefreshControl, StatusBar, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { productAPI, cartAPI, BASE_URL } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH    = (width - 48) / 2;
const BANNER_WIDTH  = width - 32;
const BANNER_HEIGHT = 180;

type Category = { ID: number; name: string };
type Product = {
  ID: number;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  category?: { name: string };
};

// ─────────────────────────────────────────────
// BANNER DATA
// ─────────────────────────────────────────────
const BANNERS = [
  {
    id: 'banner-1',
    image: require('@/assets/uploads/about5.jpg'),
    tag: 'PROMO',
    tagColor: '#FF7043',
    title: '20% off on your\nfirst purchase',
    sub: 'Sayuran hidroponik segar dari kebun',
  },
  {
    id: 'banner-2',
    image: require('@/assets/uploads/about2.jpg'),
    tag: 'NEW ARRIVAL',
    tagColor: '#1565C0',
    title: 'Produk segar\ntiba setiap hari',
    sub: 'Langsung dari petani lokal',
  },
  {
    id: 'banner-3',
    image: require('@/assets/uploads/hero1.jpg'),
    tag: 'GRATIS ONGKIR',
    tagColor: '#6A1B9A',
    title: 'Belanja di atas\nRp 50.000',
    sub: 'Gratis ongkos kirim ke seluruh kota',
  },
];

// ─────────────────────────────────────────────
// CATEGORY ICON MAP
// ─────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, {
  icon: keyof typeof MaterialIcons.glyphMap;
  bg: string;
  color: string;
}> = {
  default:  { icon: 'category',        bg: '#E8F5E9', color: '#4CAF50' },
  sayuran:  { icon: 'eco',             bg: '#E8F5E9', color: '#4CAF50' },
  buah:     { icon: 'local-florist',   bg: '#FCE4EC', color: '#E91E63' },
  minuman:  { icon: 'local-drink',     bg: '#FFF8E1', color: '#FFC107' },
  grocery:  { icon: 'shopping-basket', bg: '#E8EAF6', color: '#5C6BC0' },
  minyak:   { icon: 'opacity',         bg: '#FFF3E0', color: '#FF9800' },
  rempah:   { icon: 'spa',             bg: '#F3E5F5', color: '#9C27B0' },
};

function getCatStyle(name: string) {
  const key = name.toLowerCase();
  for (const k of Object.keys(CATEGORY_ICONS)) {
    if (key.includes(k)) return CATEGORY_ICONS[k];
  }
  return CATEGORY_ICONS.default;
}

// ─────────────────────────────────────────────
// BANNER SLIDER
// ✅ Fix: RefObject<FlatList<any>> (bukan | null)
// ✅ Fix: Readonly<> pada props
// ─────────────────────────────────────────────
type BannerSliderProps = Readonly<{                 // ✅ S6759: Readonly
  activeBanner: number;
  primaryColor: string;
  bannerRef: React.RefObject<FlatList<any>>;        // ✅ fix: hapus | null
  onSlideChange: (idx: number) => void;
}>;

function BannerSlider({ activeBanner, primaryColor, bannerRef, onSlideChange }: BannerSliderProps) {
  return (
    <View style={{ marginBottom: 24 }}>
      <FlatList
        ref={bannerRef}
        data={BANNERS}
        keyExtractor={b => b.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 12));
          onSlideChange(Math.min(idx, BANNERS.length - 1));
        }}
        renderItem={({ item: b }) => (
          <View style={[styles.bannerCard, { width: BANNER_WIDTH }]}>
            <Image source={b.image} style={styles.bannerImage} resizeMode="cover" />
            <View style={styles.bannerOverlay} />
            <View style={styles.bannerContent}>
              <View style={[styles.promoTag, { backgroundColor: b.tagColor }]}>
                <Text style={styles.promoTagText}>{b.tag}</Text>
              </View>
              <Text style={styles.bannerTitle}>{b.title}</Text>
              <Text style={styles.bannerSub}>{b.sub}</Text>
            </View>
          </View>
        )}
      />
      <View style={styles.dotRow}>
        {BANNERS.map((b, i) => (
          <View
            key={b.id}
            style={[
              styles.dot,
              {
                width: i === activeBanner ? 20 : 6,
                backgroundColor: i === activeBanner ? primaryColor : '#ccc',
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// LIST HEADER
// ✅ Fix: Readonly<> pada props
// ─────────────────────────────────────────────
type ListHeaderProps = Readonly<{                   // ✅ S6759: Readonly
  C: any;
  brand: any;
  search: string;
  selectedCat: string;
  cartCount: number;
  categories: Category[];
  activeBanner: number;
  bannerRef: React.RefObject<FlatList<any>>;        // ✅ fix: hapus | null
  onCartPress: () => void;
  onSearch: (text: string) => void;
  onCategoryPress: (id: string) => void;
  onBannerChange: (idx: number) => void;
}>;

function ListHeader({
  C, brand, search, selectedCat, cartCount, categories,
  activeBanner, bannerRef,
  onCartPress, onSearch, onCategoryPress, onBannerChange,
}: ListHeaderProps) {
  return (
    <View style={{ paddingBottom: 8 }}>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.greetSmall, { color: C.textSecondary }]}>Good Morning 👋</Text>
          <Text style={[styles.greeting, { color: C.text }]}>Halo, Belanja apa hari ini?</Text>
        </View>
        <TouchableOpacity style={[styles.cartBtn, { backgroundColor: C.surface }]} onPress={onCartPress}>
          <MaterialIcons name="shopping-bag" size={22} color={brand.primary} />
          {cartCount > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: '#FF4444' }]}>
              <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={[styles.searchWrapper, { backgroundColor: C.surface }]}>
          <MaterialIcons name="search" size={20} color={C.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Search keywords..."
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={onSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearch('')} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: brand.primary }]}>
          <MaterialIcons name="tune" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Banner */}
      <BannerSlider
        activeBanner={activeBanner}
        primaryColor={brand.primary}
        bannerRef={bannerRef}
        onSlideChange={onBannerChange}
      />

      {/* Kategori */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Categories</Text>
        <TouchableOpacity>
          <Text style={[styles.seeAll, { color: brand.primary }]}>See all ›</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
      >
        {[{ ID: 0, name: 'Semua' }, ...categories].map(cat => {
          const id     = cat.ID === 0 ? '' : String(cat.ID);
          const active = selectedCat === id;
          const cs     = getCatStyle(cat.name);
          return (
            <TouchableOpacity
              key={`cat-${cat.ID}`}
              style={styles.catItem}
              onPress={() => onCategoryPress(id)}
            >
              <View style={[
                styles.catCircle,
                {
                  backgroundColor: active ? brand.primary : cs.bg,
                  borderWidth: active ? 0 : 1.5,
                  borderColor: active ? 'transparent' : cs.color + '33',
                },
              ]}>
                <MaterialIcons name={cs.icon} size={24} color={active ? '#fff' : cs.color} />
              </View>
              <Text style={[styles.catText, { color: active ? brand.primary : C.textSecondary }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Featured header */}
      <View style={[styles.sectionRow, { marginTop: 10 }]}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Featured products</Text>
        <TouchableOpacity>
          <Text style={[styles.seeAll, { color: brand.primary }]}>See all ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { C, brand, scheme } = useTheme();

  const [products, setProducts]         = useState<Product[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [search, setSearch]             = useState('');
  const [selectedCat, setSelectedCat]   = useState('');
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [cartCount, setCartCount]       = useState(0);
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [wishlist, setWishlist]         = useState<Set<number>>(new Set());
  const [activeBanner, setActiveBanner] = useState(0);

  // ✅ Fix: type eksplisit tanpa null agar cocok dengan RefObject<FlatList<any>>
  const bannerRef = useRef<FlatList<any>>(null) as React.RefObject<FlatList<any>>;

  // Auto-slide banner
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBanner(prev => {
        const next = (prev + 1) % BANNERS.length;
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchProducts = useCallback(async (q = search, cat = selectedCat) => {
    try {
      const res = await productAPI.getAll(q || undefined, cat || undefined);
      setProducts(res.data);
    } catch (err) {
      console.log('Error fetch products', err);
    }
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

  const toggleWishlist = (id: number) => {
    setWishlist(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const goToLogin = () => router.push('/login' as any);

  const handleAddToCart = async (product: Product) => {
    if (!isLoggedIn) {
      Alert.alert('Belum Login', 'Login dulu untuk menambahkan ke keranjang 🛒', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Login', onPress: goToLogin },
      ]);
      return;
    }
    if (product.stock === 0) return;
    try {
      await cartAPI.addToCart(product.ID, 1);
      setCartCount(c => c + 1);
      Alert.alert('✅ Berhasil', `${product.name} masuk keranjang!`);
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.error ?? 'Gagal tambah ke keranjang');
    }
  };

  const handleBuyNow = (product: Product) => {
    if (!isLoggedIn) {
      Alert.alert('Belum Login', 'Login dulu untuk membeli', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Login', onPress: goToLogin },
      ]);
      return;
    }
    router.push({ pathname: '/checkout', params: { productId: product.ID, qty: 1 } } as any);
  };

  // ✅ Fix S1854: formatRupiah didefinisikan di sini, bukan di-import
  const formatRupiah = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

  const getImageUrl = (url: string) => {
    if (!url) return 'https://via.placeholder.com/150?text=No+Image';
    return url.startsWith('http') ? url : `${BASE_URL}${url}`;
  };

  // ─────────────────────────────────────────────
  // CARD PRODUK
  // ─────────────────────────────────────────────
  const renderProductItem = ({ item, index }: { item: Product; index: number }) => {
    const isNew      = index < 2;
    const isLiked    = wishlist.has(item.ID);
    const outOfStock = item.stock === 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: C.surface }]}
        activeOpacity={0.92}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.ID } } as any)}
      >
        {/* Badge NEW + Wishlist */}
        <View style={styles.cardTopRow}>
          {isNew
            ? <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
            : <View />
          }
          <TouchableOpacity style={styles.heartBtn} onPress={() => toggleWishlist(item.ID)}>
            <MaterialIcons
              name={isLiked ? 'favorite' : 'favorite-border'}
              size={18}
              color={isLiked ? '#E91E63' : '#ccc'}
            />
          </TouchableOpacity>
        </View>

        {/* Gambar */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getImageUrl(item.imageUrl) }}
            style={styles.productImage}
            resizeMode="contain"
          />
          {outOfStock && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>Habis</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardPrice, { color: brand.primary }]}>
            {formatRupiah(item.price)}
          </Text>
          <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.cardUnit, { color: C.textMuted }]}>
            {item.category?.name || 'Sayuran'}
          </Text>

          {/* Action Row: Beli 80% | Cart 20% */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.buyBtn, { backgroundColor: outOfStock ? '#e0e0e0' : brand.primary }]}
              onPress={() => handleBuyNow(item)}
              disabled={outOfStock}
              activeOpacity={0.85}
            >
              <Text style={[styles.buyBtnText, { color: outOfStock ? '#aaa' : '#fff' }]}>
                {outOfStock ? 'Habis' : 'Beli'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cartIconBtn,
                {
                  backgroundColor: outOfStock ? '#f5f5f5' : brand.primary + '15',
                  borderColor:     outOfStock ? '#e0e0e0' : brand.primary + '50',
                },
              ]}
              onPress={() => handleAddToCart(item)}
              disabled={outOfStock}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="shopping-cart"
                size={16}
                color={outOfStock ? '#bbb' : brand.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={brand.primary} />
        <Text style={[styles.loadingText, { color: C.textSecondary }]}>Menyiapkan kebun...</Text>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={C.background}
      />
      <FlatList
        data={products}
        keyExtractor={item => `product-${item.ID}`}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.primary]} />
        }
        ListHeaderComponent={
          <ListHeader
            C={C}
            brand={brand}
            search={search}
            selectedCat={selectedCat}
            cartCount={cartCount}
            categories={categories}
            activeBanner={activeBanner}
            bannerRef={bannerRef}
            onCartPress={() => router.push('/cart' as any)}
            onSearch={handleSearch}
            onCategoryPress={handleCategory}
            onBannerChange={setActiveBanner}
          />
        }
        renderItem={renderProductItem}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <MaterialIcons name="eco" size={64} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>Produk Kosong</Text>
            <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
              Coba cari sayuran yang lain
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1 },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '500' },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14,
  },
  greetSmall: { fontSize: 12, marginBottom: 2 },
  greeting:   { fontSize: 18, fontWeight: '800' },
  cartBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, position: 'relative',
  },
  cartBadge: {
    position: 'absolute', top: -2, right: -2,
    borderRadius: 10, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: '#FFF',
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  searchSection: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 10, marginBottom: 16,
  },
  searchWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filterBtn: {
    width: 46, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', elevation: 3,
  },

  bannerCard: {
    height: BANNER_HEIGHT, borderRadius: 20,
    overflow: 'hidden', position: 'relative',
  },
  bannerImage:   { width: '100%', height: '100%', position: 'absolute' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  bannerContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 },
  promoTag: {
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  promoTagText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  bannerTitle:  { fontSize: 18, fontWeight: '800', color: '#fff', lineHeight: 24 },
  bannerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  dotRow: {
    flexDirection: 'row', gap: 5,
    marginTop: 12, justifyContent: 'center', alignItems: 'center',
  },
  dot: { height: 6, borderRadius: 3 },

  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  seeAll:       { fontSize: 13, fontWeight: '600' },

  catScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  catItem:   { alignItems: 'center', gap: 6 },
  catCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  catText:   { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  listContent: { paddingBottom: 120 },
  row:         { justifyContent: 'space-between', paddingHorizontal: 16 },

  card: {
    width: CARD_WIDTH, borderRadius: 18, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  cardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 10, paddingTop: 10, minHeight: 28,
  },
  newBadge: {
    backgroundColor: '#FF7043', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  newBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  heartBtn:     { padding: 2 },

  imageContainer: {
    width: '100%', height: CARD_WIDTH - 30,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  productImage: { width: '85%', height: '85%' },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', borderRadius: 12,
  },
  soldOutText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  cardInfo:  { paddingHorizontal: 12, paddingBottom: 12 },
  cardPrice: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 1 },
  cardUnit:  { fontSize: 11, marginBottom: 10 },

  actionRow: { flexDirection: 'row', gap: 6 },
  buyBtn: {
    flex: 4, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  buyBtnText:  { fontSize: 13, fontWeight: '700' },
  cartIconBtn: {
    flex: 1, height: 34, borderRadius: 10,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },

  emptyWrapper:  { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle:    { fontSize: 18, fontWeight: '800' },
  emptySubtitle: { fontSize: 14 },
});
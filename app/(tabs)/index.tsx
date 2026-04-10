import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar, 
  SafeAreaView 
} from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons'; 

const API_IP = '192.168.10.185'; 
const API_URL = `http://${API_IP}:3000`; 

const COLORS = {
  bg_light: '#F8FAF5',
  primary: '#10B981',
  primary_dark: '#047857',
  accent: '#A7F3D0',
  text_main: '#1F2937',
  text_sub: '#6B7280',
  white: '#FFFFFF',
  shadow: '#D1D5DB',
};

type Product = {
  ID: number;
  name: string;
  price: number;
  stock: number;
  image: string; 
};

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await axios.get(`${API_URL}/api/products`);
      setProducts(res.data);
    } catch (error: any) {
      console.error("Detail Gagal:", error.message);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.imageContainer}>
        <Image 
          // LOGIKA PERBAIKAN GAMBAR: Pake placeholder kalau item.image kosong/error
          source={{ 
            uri: item.image 
              ? `${API_URL}/uploads/${item.image}` 
              : 'https://via.placeholder.com/150?text=No+Image' 
          }} 
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.stockBadge}>
          <Text style={styles.stockText}>Sisa: {item.stock}</Text>
        </View>
      </View>
      
      <View style={styles.productDetails}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>
          {formatRupiah(item.price)}
        </Text>
        
        <TouchableOpacity style={styles.addButton} onPress={() => alert('Ditambah ke keranjang!')}>
          <Text style={styles.addButtonText}>Beli</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary_dark} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Selamat Datang di</Text>
          <Text style={styles.headerTitle}>Zaky Hidroponik 🥬</Text>
        </View>
        
        {/* LOGIKA: Login dihapus, Ganti Ikon Keranjang */}
        <TouchableOpacity onPress={() => alert('Keranjang diklik lek!')}>
          <MaterialIcons name="shopping-cart" size={28} color={COLORS.primary_dark} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
          <View style={styles.searchBar}>
              <MaterialIcons name="search" size={22} color={COLORS.text_sub} />
              <Text style={styles.searchPlaceholder}>Cari selada, tomat...</Text>
          </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.infoText}>Sedang memanen data...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={60} color="#EF4444" />
          <Text style={[styles.infoText, {color: '#EF4444'}]}>Gagal ambil data, cek server Go lu lek!</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProducts}>
              <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.ID.toString()}
          renderItem={renderProductItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg_light },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  infoText: { marginTop: 10, fontSize: 16, color: COLORS.text_sub, fontWeight: '500', textAlign: 'center' },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 4,
    zIndex: 10,
  },
  headerSubtitle: { fontSize: 14, color: COLORS.text_sub },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary_dark },
  searchSection: { paddingHorizontal: 20, marginVertical: -15, zIndex: 20 },
  searchBar: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 15,
    elevation: 5,
  },
  searchPlaceholder: { color: COLORS.text_sub, marginLeft: 10, fontSize: 15 },
  listContent: { paddingHorizontal: 15, paddingTop: 30, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
  productCard: {
    backgroundColor: COLORS.white,
    width: '48%',
    marginBottom: 15,
    borderRadius: 15,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: { width: '100%', aspectRatio: 1 },
  productImage: { width: '100%', height: '100%', backgroundColor: '#eee' },
  stockBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stockText: { fontSize: 11, color: COLORS.primary_dark, fontWeight: 'bold' },
  productDetails: { padding: 12 },
  productName: { fontSize: 15, fontWeight: '600', color: COLORS.text_main, height: 36 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  addButton: { backgroundColor: COLORS.primary, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  retryBtn: { marginTop: 20, backgroundColor: COLORS.primary_dark, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: COLORS.white, fontWeight: 'bold' }
});
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Ganti IP ini dengan IP komputer kamu saat development (bukan localhost!)
// Untuk emulator Android: 10.0.2.2
// Untuk device fisik: IP LAN kamu, contoh: 192.168.1.10
export const BASE_URL = 'http://10.0.2.2:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── REQUEST INTERCEPTOR (Otomatis sisipkan token JWT) ────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── RESPONSE INTERCEPTOR (Handle error global) ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/login', { email, password }),

  register: (name: string, email: string, password: string, whatsapp_number: string) =>
    api.post('/api/register', { name, email, password, whatsapp_number }),
};

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
export const productAPI = {
  getAll: (search?: string, categoryId?: string) =>
    api.get('/api/products', { params: { search, categoryId } }),

  getOne: (id: number) =>
    api.get(`/api/products/${id}`),

  getCategories: () =>
    api.get('/api/product-categories'),
};

// ─── CART ─────────────────────────────────────────────────────────────────────
export const cartAPI = {
  getMyCart: () =>
    api.get('/api/cart'),

  addToCart: (product_id: number, quantity: number) =>
    api.post('/api/cart', { product_id, quantity }),
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export const orderAPI = {
  checkout: (payload: {
    cart_ids?: number[];
    product_id?: number;
    quantity?: number;
    address: string;
    payment_method: string;
  }) => api.post('/api/checkout', payload),

  getMyOrders: () =>
    api.get('/api/orders'),
};

// ─── TOKEN HELPERS ────────────────────────────────────────────────────────────
export const saveToken = async (token: string) => {
  await AsyncStorage.setItem('token', token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem('token');
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove(['token', 'user']);
};

export const saveUser = async (user: object) => {
  await AsyncStorage.setItem('user', JSON.stringify(user));
};

export const getUser = async () => {
  const u = await AsyncStorage.getItem('user');
  return u ? JSON.parse(u) : null;
};

export default api;
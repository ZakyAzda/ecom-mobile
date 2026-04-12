import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { orderAPI } from '@/services/api';
import { useFocusEffect } from '@react-navigation/native';
import {
  PayMethod, SavedAddress, CheckoutParams, STORAGE_KEY_ADDRESSES,
} from './checkout.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCartIds(raw: string): number[] {
  return raw
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n > 0);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCheckout(params: CheckoutParams) {
  const router = useRouter();

  // ── Address state ──────────────────────────────────────────────────────────
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formLabel, setFormLabel] = useState('');
  const [formDetail, setFormDetail] = useState('');
  const [formLat, setFormLat] = useState<number | undefined>();
  const [formLng, setFormLng] = useState<number | undefined>();

  // ── Payment ────────────────────────────────────────────────────────────────
  const [payMethod, setPayMethod] = useState<PayMethod>('COD');
  const [loading, setLoading] = useState(false);

  // ── Load addresses dari storage ────────────────────────────────────────────
  const loadAddresses = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_ADDRESSES);
      if (raw) {
        const list: SavedAddress[] = JSON.parse(raw);
        setSavedAddresses(list);
        if (list.length > 0) {
          setSelectedAddressId(prev => prev ?? list[0].id);
        }
      }
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));

  const persistAddresses = async (list: SavedAddress[]) => {
    await AsyncStorage.setItem(STORAGE_KEY_ADDRESSES, JSON.stringify(list));
  };

  // ── Form actions ───────────────────────────────────────────────────────────
  const openAddForm = () => {
    setEditingAddress(null);
    setFormLabel('');
    setFormDetail('');
    setFormLat(undefined);
    setFormLng(undefined);
    setShowAddressForm(true);
  };

  const openEditForm = (address: SavedAddress) => {
    setEditingAddress(address);
    setFormLabel(address.label);
    setFormDetail(address.detail);
    setFormLat(address.lat);
    setFormLng(address.lng);
    setShowAddressForm(true);
  };

  const closeForm = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
  };

  // ── Simpan alamat ──────────────────────────────────────────────────────────
  const saveAddress = async () => {
    if (!formLabel.trim()) {
      Alert.alert('Label Kosong', 'Isi label alamat dulu, contoh: Rumah, Kantor');
      return;
    }
    if (!formDetail.trim() || formDetail.trim().length < 10) {
      Alert.alert('Alamat Kurang Detail', 'Isi alamat lengkap minimal 10 karakter');
      return;
    }

    let updatedList: SavedAddress[];

    if (editingAddress) {
      updatedList = savedAddresses.map(a =>
        a.id === editingAddress.id
          ? { ...a, label: formLabel.trim(), detail: formDetail.trim(), lat: formLat, lng: formLng }
          : a
      );
    } else {
      const newAddress: SavedAddress = {
        id: generateId(),
        label: formLabel.trim(),
        detail: formDetail.trim(),
        lat: formLat,
        lng: formLng,
      };
      updatedList = [...savedAddresses, newAddress];
      setSelectedAddressId(newAddress.id);
    }

    setSavedAddresses(updatedList);
    await persistAddresses(updatedList);
    closeForm();
  };

  // ── Hapus alamat ───────────────────────────────────────────────────────────
  const deleteAddress = (addressId: string) => {
    Alert.alert('Hapus Alamat', 'Yakin mau hapus alamat ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          const updatedList = savedAddresses.filter(a => a.id !== addressId);
          setSavedAddresses(updatedList);
          await persistAddresses(updatedList);
          if (selectedAddressId === addressId) {
            setSelectedAddressId(updatedList[0]?.id ?? null);
          }
        },
      },
    ]);
  };

  // ── Set koordinat dari MapPicker ───────────────────────────────────────────
  // signature: (lat, lng, reverseGeocodedAddress)
  const setMapCoords = (lat: number, lng: number, _address: string) => {
    setFormLat(lat);
    setFormLng(lng);
  };

  // ── Submit checkout ────────────────────────────────────────────────────────
  const submitCheckout = async () => {
    const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) {
      Alert.alert('Pilih Alamat', 'Tambahkan dan pilih alamat pengiriman dulu ya!');
      return;
    }

    // ✅ FIX: Build payload dengan benar
    const payload: any = {
      address: selectedAddress.detail,
      payment_method: payMethod,
    };

    if (params.from === 'cart' && params.cart_ids) {
      const parsedIds = parseCartIds(params.cart_ids);
      if (parsedIds.length === 0) {
        Alert.alert('Error', 'Tidak ada item cart yang valid');
        return;
      }
      payload.cart_ids = parsedIds;
    } else if (params.product_id) {
      payload.product_id = Number(params.product_id);
      payload.quantity = Number(params.quantity ?? 1);
    } else {
      Alert.alert('Error', 'Tidak ada produk yang dipilih');
      return;
    }

    setLoading(true);
    try {
      await orderAPI.checkout(payload);
      Alert.alert(
        '🎉 Pesanan Berhasil!',
        payMethod === 'COD'
          ? 'Pesananmu sedang diproses. Siapkan uang saat kurir datang!'
          : 'Segera lakukan transfer untuk konfirmasi pesanan.',
        [{
          text: 'Lihat Pesanan',
          onPress: () => {
            router.dismissAll();
            router.push('/(tabs)/order' as any);
          },
        }]
      );
    } catch (e: any) {
      Alert.alert('Checkout Gagal', e.response?.data?.error ?? 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return {
    // Address
    savedAddresses,
    selectedAddressId,
    selectedAddress: savedAddresses.find(a => a.id === selectedAddressId) ?? null,
    showAddressForm,
    editingAddress,
    setSelectedAddressId,
    openAddForm, openEditForm, closeForm,
    deleteAddress, saveAddress,
    setMapCoords,

    // Form fields
    formLabel, setFormLabel,
    formDetail, setFormDetail,
    formLat, formLng,

    // Payment
    payMethod, setPayMethod,

    // Submit
    loading, submitCheckout,
  };
}
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { orderAPI } from '@/services/api';
import { useFocusEffect } from '@react-navigation/native';
import {
  PayMethod, SavedAddress, CheckoutParams, STORAGE_KEY_ADDRESSES,
} from './checkout.types';

function parseCartIds(raw: string | string[]): number[] {
  const str = Array.isArray(raw) ? raw.join(',') : raw;
  return str
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n > 0);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useCheckout(params: CheckoutParams) {
  const router = useRouter();

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  const [formLabel, setFormLabel] = useState('');
  const [formDetail, setFormDetail] = useState('');
  const [formLat, setFormLat] = useState<number | undefined>();
  const [formLng, setFormLng] = useState<number | undefined>();

  const [payMethod, setPayMethod] = useState<PayMethod>('COD');
  const [loading, setLoading] = useState(false);

  // State untuk success modal
  const [showSuccess, setShowSuccess] = useState(false);

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

  const setMapCoords = (lat: number, lng: number, _address: string) => {
    setFormLat(lat);
    setFormLng(lng);
  };

  const submitCheckout = async () => {
    const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) {
      Alert.alert('Pilih Alamat', 'Tambahkan dan pilih alamat pengiriman dulu ya!');
      return;
    }

    const payload: any = {
      address: selectedAddress.detail,
      payment_method: payMethod,
    };

    const rawCartIds = params.cart_ids;
    const rawProductId = params.product_id;

    if (params.from === 'cart' && rawCartIds) {
      const parsedIds = parseCartIds(rawCartIds as string | string[]);
      if (parsedIds.length === 0) {
        Alert.alert('Error', 'Tidak ada item cart yang valid');
        return;
      }
      payload.cart_ids = parsedIds;
    } else if (rawProductId) {
      const productId = Array.isArray(rawProductId) ? Number(rawProductId[0]) : Number(rawProductId);
      const qty = params.quantity
        ? (Array.isArray(params.quantity) ? Number(params.quantity[0]) : Number(params.quantity))
        : 1;
      payload.product_id = productId;
      payload.quantity = qty;
    } else {
      Alert.alert('Error', 'Tidak ada produk yang dipilih');
      return;
    }

    setLoading(true);
    try {
      await orderAPI.checkout(payload);
      // Tampilkan success modal, bukan Alert
      setShowSuccess(true);
    } catch (e: any) {
      Alert.alert('Checkout Gagal', e.response?.data?.error ?? 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Handler dari SuccessModal
  const handleViewOrder = () => {
    setShowSuccess(false);
    router.push('/(tabs)/order' as any);
  };

  const handleContinueShopping = () => {
    setShowSuccess(false);
    router.push('/(tabs)' as any);
  };

  return {
    savedAddresses,
    selectedAddressId,
    selectedAddress: savedAddresses.find(a => a.id === selectedAddressId) ?? null,
    showAddressForm,
    editingAddress,
    setSelectedAddressId,
    openAddForm, openEditForm, closeForm,
    deleteAddress, saveAddress,
    setMapCoords,
    formLabel, setFormLabel,
    formDetail, setFormDetail,
    formLat, formLng,
    payMethod, setPayMethod,
    loading, submitCheckout,
    // Export state & handler modal
    showSuccess,
    handleViewOrder,
    handleContinueShopping,
  };
}
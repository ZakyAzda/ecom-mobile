export type PayMethod = 'COD' | 'TRANSFER';

export type SavedAddress = {
  id: string;
  label: string;
  detail: string;
  lat?: number;
  lng?: number;
};

export type CheckoutParams = {
  from?: string | string[];
  cart_ids?: string | string[];   // Fix: expo-router bisa kirim string[]
  product_id?: string | string[];
  quantity?: string | string[];
  total?: string | string[];
};

export const PAY_METHODS: {
  id: PayMethod;
  label: string;
  icon: string;
  desc: string;
}[] = [
  { id: 'COD',      label: 'Bayar di Tempat', icon: '💵', desc: 'Bayar saat barang tiba' },
  { id: 'TRANSFER', label: 'Transfer Bank',    icon: '🏦', desc: 'Via BCA / Mandiri / BRI' },
];

export const STORAGE_KEY_ADDRESSES = 'saved_addresses';
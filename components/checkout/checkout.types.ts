// ─── Types ────────────────────────────────────────────────────────────────────

export type PayMethod = 'COD' | 'TRANSFER';

export type SavedAddress = {
  id: string;
  label: string;       // e.g. "Rumah", "Kantor"
  detail: string;      // Alamat lengkap
  lat?: number;
  lng?: number;
};

export type CheckoutParams = {
  from?: string;
  cart_ids?: string;   // comma-separated, e.g. "1,2,3"
  product_id?: string;
  quantity?: string;
  total?: string;      // total harga dari cart (opsional, untuk display)
};

// ─── Constants ────────────────────────────────────────────────────────────────

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
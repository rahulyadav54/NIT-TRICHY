export interface OfflineOrderItem {
  localId: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  orderNumber: string;
  createdAt: string;
  lastError?: string;
}

const QUEUE_KEY = 'trima_offline_orders_queue';
const CACHE_CUSTOMERS_KEY = 'trima_cached_customers';
const CACHE_PRODUCTS_KEY = 'trima_cached_products';

export function getOfflineOrderQueue(): OfflineOrderItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineOrderQueue(items: OfflineOrderItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function enqueueOfflineOrder(item: OfflineOrderItem): OfflineOrderItem[] {
  const queue = getOfflineOrderQueue();
  const updated = [item, ...queue];
  saveOfflineOrderQueue(updated);
  return updated;
}

export function cacheSalesCatalog(customers: any[], products: any[]) {
  try {
    if (customers.length > 0) localStorage.setItem(CACHE_CUSTOMERS_KEY, JSON.stringify(customers));
    if (products.length > 0) localStorage.setItem(CACHE_PRODUCTS_KEY, JSON.stringify(products));
  } catch {
    // Ignore storage quota errors
  }
}

export function getCachedSalesCatalog(): { customers: any[]; products: any[] } {
  try {
    const customers = JSON.parse(localStorage.getItem(CACHE_CUSTOMERS_KEY) || '[]');
    const products = JSON.parse(localStorage.getItem(CACHE_PRODUCTS_KEY) || '[]');
    return { customers, products };
  } catch {
    return { customers: [], products: [] };
  }
}

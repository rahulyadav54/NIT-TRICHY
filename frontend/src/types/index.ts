export type Role = 'SALESMAN' | 'ADMIN' | 'PRODUCTION_SUPERVISOR' | 'ACCOUNTANT_AUDITOR' | 'OWNER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  active: boolean;
  createdAt?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  type: 'RETAILER' | 'DISTRIBUTOR';
  gstin: string;
  billingAddress: string;
  shippingAddress: string;
  state: string;
  stateCode: string;
  phone: string;
  email?: string;
  creditLimit: number;
  assignedSalesmanId?: string;
  assignedSalesmanName?: string;
  active: boolean;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  gstin: string;
  contactInfo: string;
  address: string;
  state: string;
  stateCode: string;
  paymentTerms?: string;
  active: boolean;
}

export interface Product {
  id: string;
  code: string;
  sku: string;
  name: string;
  category: string;
  packSize: string;
  netWeightGrams: number;
  sellingPrice: number;
  hsnCode: string;
  gstRate: number;
  unit: string;
  active: boolean;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  category: 'RAW_MATERIAL' | 'PACKAGING';
  unit: string;
  openingStock: number;
  reorderLevel: number;
  purchaseRate: number;
  currentStock: number;
  active: boolean;
}


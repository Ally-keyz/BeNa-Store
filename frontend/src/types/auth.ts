/** Customer-facing authentication models (no tokens are ever exposed). */

import type { Money } from './domain';

export interface AuthSessionStatus {
  enabled: boolean;
  authenticated: boolean;
  customer?: {
    id: string;
    email: string | null;
    displayName?: string | null;
  };
  csrfToken?: string;
  expiresAt?: string;
}

export interface CustomerAddress {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  countryCode: string | null;
  zip: string | null;
  phoneNumber: string | null;
  formatted: string[];
}

export interface CustomerProfile {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  defaultAddress: CustomerAddress | null;
}

export interface CustomerOrderLine {
  title: string;
  quantity: number;
}

export interface CustomerOrder {
  id: string;
  name: string;
  number: number;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string;
  totalPrice: Money;
  statusPageUrl: string;
  lines: CustomerOrderLine[];
}

export interface AccountSession {
  id: string;
  customerId: string;
  email: string | null;
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: number;
  idToken: string | null;
  csrfToken: string;
  createdAt: number;
  updatedAt: number;
}

// src/lib/api/lookups.ts
const API_BASE_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'ergus_token';

export interface Category {
  id: string;
  code: string;
  name: string;
}

export interface Manufacturer {
  id: string;
  codigo: string;
  nome: string;
}

export interface Supplier {
  id: string;
  codigo: string;
  nome: string;
}

export interface Product {
    id: string;
    codigo: string;
    nome: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;

  if (!token) {
    throw new Error('Usuário não autenticado');
  }
  if (!tenantId) {
    throw new Error('Tenant não definido');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
  } as HeadersInit;
}

async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const resp = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });

  if (!resp.ok) {
    throw new Error(`Erro ${resp.status} ao consultar ${path}`);
  }

  return resp.json() as Promise<T>;
}

// --------- Categories ---------
export async function searchCategories(q: string, page = 1, pageSize = 20): Promise<Category[]> {
  // backend: /api/categories?q=...&page=...&page_size=...
  return apiGet<Category[]>("/categories", {
    q,
    page,
    page_size: pageSize,
  });
}

// --------- Manufacturers ---------
export async function searchManufacturers(q: string, page = 1, pageSize = 20): Promise<Manufacturer[]> {
  return apiGet<Manufacturer[]>("/manufacturers", {
    q,
    page,
    page_size: pageSize,
  });
}

// --------- Suppliers ---------
export async function searchSuppliers(q: string, page = 1, pageSize = 20): Promise<Supplier[]> {
  return apiGet<Supplier[]>("/suppliers", {
    q,
    page,
    page_size: pageSize,
  });
}

export async function searchProducts(q: string, page = 1, pageSize = 20): Promise<Supplier[]> {
    return apiGet<Product[]>("/products", {
        q,
        page,
        page_size: pageSize,
    });
}

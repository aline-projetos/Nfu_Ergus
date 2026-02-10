import { getAuthHeaders, getBaseUrl } from "../utils";

// src/lib/api/lookups.ts



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

async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${getBaseUrl()}${path}`);

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

export async function searchProducts(q: string, page = 1, pageSize = 20): Promise<Product[]> {
    return apiGet<Product[]>("/products", {
        q,
        page,
        page_size: pageSize,
    });
}

export interface NCM {
  id: string;
  code: string;
  description: string;
  exVersion?: string | null;
}

export interface CEST {
  id: string;
  code: string;
  description: string;
  ncmCode?: string | null;
}

async function parseError(res: Response) {
  const text = await res.text();
  return text || `Erro HTTP ${res.status}`;
}

export async function searchNCM(q: string): Promise<NCM[]> {
  if (q.trim().length < 3) return [];
  const res = await fetch(`${getBaseUrl()}/lookups/ncm?q=${encodeURIComponent(q)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function searchCEST(q: string): Promise<CEST[]> {
  if (q.trim().length < 3) return [];
  const res = await fetch(`${getBaseUrl()}/lookups/cest?q=${encodeURIComponent(q)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

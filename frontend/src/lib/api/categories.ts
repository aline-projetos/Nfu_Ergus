// src/lib/api/categories.ts
export interface Category {
  id: string;
  code: string;
  name: string;
  parentCode: string | null;
  parentName: string | null;
  metaTitle?: string | null;
  metaTag?: string | null;
  metaDescription?: string | null;
  siteOrder?: number | null;
  siteLink?: string | null;
  description?: string | null;
}

export type CreateCategoryInput = {
  name: string;
  parentCode: string | null;
  parentName: string | null;
  metaTitle?: string | null;
  metaTag?: string | null;
  metaDescription?: string | null;
  siteOrder?: number | null;
  siteLink?: string | null;
  description?: string | null;
};


const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'ergus_token';

async function parseError(res: Response) {
  const text = await res.text();
  return text || `Erro HTTP ${res.status}`;
}

export async function listCategories(): Promise<Category[]> {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${API_URL}/categories`, {
    headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
            },

  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getCategoryById(id: string): Promise<Category> {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${API_URL}/categories/${id}`, {
    headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
            },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createCategory(payload: CreateCategoryInput): Promise<Category> {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${API_URL}/categories`, {
    method: "POST",
    headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
            },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${API_URL}/categories/${id}`, {
    method: "DELETE",
    headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
            },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export type UpdateCategoryInput = Omit<Category, "id" | "code">;

export async function updateCategory(id: string, payload: UpdateCategoryInput): Promise<Category> {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${API_URL}/categories/${id}`, {
    method: "PUT",
    headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
            },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getCategoryByCode(code: string): Promise<Category> {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${API_URL}/categories/by-code?code=${encodeURIComponent(code)}`, {
    headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
            },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function duplicateCategory(id: string): Promise<Category> {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${API_URL}/categories/duplicate/${id}`, {
    method: "POST",
    headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
            },
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

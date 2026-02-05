import { getAuthHeaders, getBaseUrl, getTokenKey } from "../utils";

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

async function parseError(res: Response) {
  const text = await res.text();
  return text || `Erro HTTP ${res.status}`;
}

export async function listCategories(): Promise<Category[]> {
  const token = getTokenKey();
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${getBaseUrl()}/categories`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getCategoryById(id: string): Promise<Category> {
  const token = getTokenKey();
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${getBaseUrl()}/categories/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createCategory(payload: CreateCategoryInput): Promise<Category> {
  const token = getTokenKey();
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${getBaseUrl()}/categories`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const token = getTokenKey();
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${getBaseUrl()}/categories/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export type UpdateCategoryInput = Omit<Category, "id" | "code">;

export async function updateCategory(id: string, payload: UpdateCategoryInput): Promise<Category> {
  const token = getTokenKey();
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${getBaseUrl()}/categories/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getCategoryByCode(code: string): Promise<Category> {
  const token = getTokenKey();
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${getBaseUrl()}/categories/by-code?code=${encodeURIComponent(code)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function duplicateCategory(id: string): Promise<Category> {
  const token = getTokenKey();
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const res = await fetch(`${getBaseUrl()}/categories/duplicate/${id}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

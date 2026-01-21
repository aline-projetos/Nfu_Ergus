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

async function parseError(res: Response) {
  const text = await res.text();
  return text || `Erro HTTP ${res.status}`;
}

export async function listCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getCategoryById(id: string): Promise<Category> {
  const res = await fetch(`${API_URL}/categories/${id}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createCategory(payload: CreateCategoryInput): Promise<Category> {
  const res = await fetch(`${API_URL}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload), // sem code aqui
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/categories/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}

export type UpdateCategoryInput = Omit<Category, "id" | "code">;

export async function updateCategory(id: string, payload: UpdateCategoryInput): Promise<Category> {
  const res = await fetch(`${API_URL}/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getCategoryByCode(code: string): Promise<Category> {
  const res = await fetch(`${API_URL}/categories/by-code?code=${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function duplicateCategory(id: string): Promise<Category> {
  const res = await fetch(`${API_URL}/categories/duplicate/${id}`, {
    method: "POST",
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

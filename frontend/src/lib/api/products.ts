// src/lib/api/suppliers.ts
const API_BASE_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'ergus_token';

export interface Product {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  category_id?: string | null;
  supplier_id?: string | null;
  manufacturer_id?: string | null;
}

export interface ProductCreateInput {
  name: string;
  category_id?: string | null;
  supplier_id?: string | null;
  manufacturer_id?: string | null;
}

export type ProductUpdateInput = ProductCreateInput;


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

// -----------------------------------------------------------------------------
// GET /suppliers
// -----------------------------------------------------------------------------

export async function listProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao listar produtos');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// GET /suppliers/{id}
// -----------------------------------------------------------------------------

export async function getProductById(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao buscar produto');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// POST /suppliers
// -----------------------------------------------------------------------------

export async function createProduct(
  input: ProductCreateInput
): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao criar produto');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// PUT /suppliers/{id}
// -----------------------------------------------------------------------------

export async function updateProduct(
  id: string,
  input: ProductUpdateInput
): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao atualizar produtos');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// DELETE /suppliers/{id}
// -----------------------------------------------------------------------------

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao excluir produtos');
  }
}
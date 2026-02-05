import { getAuthHeaders, getBaseUrl } from "../utils";

// src/lib/api/suppliers.ts



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


// -----------------------------------------------------------------------------
// GET /suppliers
// -----------------------------------------------------------------------------

export async function listProducts(): Promise<Product[]> {
  const res = await fetch(`${getBaseUrl()}/products`, {
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
  const res = await fetch(`${getBaseUrl()}/products/${id}`, {
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
  const res = await fetch(`${getBaseUrl()}/products`, {
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
  const res = await fetch(`${getBaseUrl()}/products/${id}`, {
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
  const res = await fetch(`${getBaseUrl()}/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao excluir produtos');
  }
}
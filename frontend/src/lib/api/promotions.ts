import { getAuthHeaders, getBaseUrl } from "../utils";

// src/lib/api/suppliers.ts



export interface Promotion {
  id: string;
  tenant_id: string;

  code: string;
  name: string;
  type: 'add' | 'subtract'; // ou string, se o back estiver usando outro valor

  start_date: string;
  end_date: string;
  use_percentage: boolean;
  value: number;
  adjust_cents: boolean;
  value_adjustment: number;
  active: boolean;

  products?: string[];
  categories?: string[];
}


export interface PromotionCreateInput {
  name: string;
  type: 'add' | 'subtract';

  start_date: string;       // ISO string
  end_date: string;         // ISO
  use_percentage: boolean;
  value: number;
  adjust_cents: boolean;
  value_adjustment: number;
  active: boolean;

  products: string[];
  categories: string[];
}

export type PromotionUpdateInput = PromotionCreateInput

// -----------------------------------------------------------------------------
// GET /suppliers
// -----------------------------------------------------------------------------

export async function listPromotions(): Promise<Promotion[]> {
  const res = await fetch(`${getBaseUrl()}/promotions`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao listar promoções');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// GET /suppliers/{id}
// -----------------------------------------------------------------------------

export async function getPromotionById(id: string): Promise<Promotion> {
  const res = await fetch(`${getBaseUrl()}/promotions/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao buscar promoção');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// POST /suppliers
// -----------------------------------------------------------------------------

export async function createPromotion(
  input: PromotionCreateInput
): Promise<Promotion> {
  const res = await fetch(`${getBaseUrl()}/promotions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao criar promoção');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// PUT /suppliers/{id}
// -----------------------------------------------------------------------------

export async function updatePromotion(
  id: string,
  input: PromotionUpdateInput
): Promise<Promotion> {
  const res = await fetch(`${getBaseUrl()}/promotions/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao atualizar promoção');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// DELETE /suppliers/{id}
// -----------------------------------------------------------------------------

export async function deletePromotion(id: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/promotions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao excluir promoção');
  }
}
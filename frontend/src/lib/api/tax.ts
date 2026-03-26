// src/lib/api/tax.ts
import { getAuthHeaders, getBaseUrl, parseError } from "../utils";

// === Tipos ===

// Mesmo shape que o backend deve devolver em JSON
export interface TaxGroup {
  id: string;
  code: string;
  name: string;
  regime: string;          // ex: "simples", "presumido", etc.
  TipoProduto: string;     // ex: "produto", "servico"
  useICMSST: boolean;
  usePISCOFINS: boolean;
  useISS: boolean;
  active: boolean;
  createdAt: string;       // ISO date
  updatedAt: string;       // ISO date
}

// Payload de criação (sem id, datas, etc.)
export type CreateTaxGroupInput = {
  code: string;
  name: string;
  regime: string;
  TipoProduto: string;
  useICMSST: boolean;
  usePISCOFINS: boolean;
  useISS: boolean;
  active: boolean;
};

// Para update, normalmente pode reaproveitar quase tudo do TaxGroup,
// só removendo campos controlados pelo backend:
export type UpdateTaxGroupInput = Omit<
  TaxGroup,
  "id" | "createdAt" | "updatedAt"
>;

// === Funções de chamada à API ===

// GET /tax-groups
export async function listTaxGroups(): Promise<TaxGroup[]> {
  const res = await fetch(`${getBaseUrl()}/tax-groups`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// GET /tax-groups/:id
export async function getTaxGroupById(id: string): Promise<TaxGroup> {
  const res = await fetch(`${getBaseUrl()}/tax-groups/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// POST /tax-groups
export async function createTaxGroup(
  payload: CreateTaxGroupInput
): Promise<TaxGroup> {
  const res = await fetch(`${getBaseUrl()}/tax-groups`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// PUT /tax-groups/:id
export async function updateTaxGroup(
  id: string,
  payload: UpdateTaxGroupInput
): Promise<TaxGroup> {
  const res = await fetch(`${getBaseUrl()}/tax-groups/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// DELETE /tax-groups/:id
export async function deleteTaxGroup(id: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/tax-groups/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error(await parseError(res));
}

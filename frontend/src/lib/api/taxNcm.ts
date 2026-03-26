// src/lib/api/tax.ts
import { getAuthHeaders, getBaseUrl, parseError } from "../utils";

// === Tipos ===

// Mesmo shape que o backend deve devolver em JSON
export interface Ncm {
  id: string;
  code: string;
  description: string;
  exVersion: string;  
  createdAt: string;       // ISO date
}

// Payload de criação (sem id, datas, etc.)
export type CreateNcmInput = {
  code: string;
  description: string;
  exVersion: string;  
};

export type UpdateNcmInput = Omit<
  Ncm,
  "id" | "createdAt"
>;

// === Funções de chamada à API ===

export async function listNcm(): Promise<Ncm[]> {
  const res = await fetch(`${getBaseUrl()}/ncm`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getNcmById(id: string): Promise<Ncm> {
  const res = await fetch(`${getBaseUrl()}/ncm/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// POST /tax-groups
export async function createNcm(
  payload: CreateNcmInput
): Promise<Ncm> {
  const res = await fetch(`${getBaseUrl()}/ncm`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}


export async function updateNcm(
  id: string,
  payload: UpdateNcmInput
): Promise<Ncm> {
  const res = await fetch(`${getBaseUrl()}/ncm/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}


export async function deleteNcm(id: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/ncm/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error(await parseError(res));
}

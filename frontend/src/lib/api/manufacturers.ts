import { getAuthHeaders, getBaseUrl } from "../utils";

// src/lib/api/manufacturers.ts


export interface Manufacturer {
  id: string;
  tenantId: string;

  codigo: string;
  nome: string;
  tipo: 'fisica' | 'juridica';

  cnpj?: string | null;
  inscricao_estadual?: string | null;

  contatoPrincipalNome?: string | null;
  contatoPrincipalTelefone?: string | null;
  contatoPrincipalEmail?: string | null;

  contatoSecundarioNome?: string | null;
  contatoSecundarioTelefone?: string | null;
  contatoSecundarioEmail?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;

  codigoCidade?: string | null;
  cidade: string;
  uf: string;

  observacoes?: string | null;

  ativo: boolean;
}

export interface ManufacturerCreateInput {
  nome: string;
  tipo: 'fisica' | 'juridica';

  cnpj?: string | null;
  inscricao_estadual?: string | null;

  contatoPrincipalNome?: string | null;
  contatoPrincipalTelefone?: string | null;
  contatoPrincipalEmail?: string | null;

  contatoSecundarioNome?: string | null;
  contatoSecundarioTelefone?: string | null;
  contatoSecundarioEmail?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;

  codigoCidade?: string | null;
  cidade: string;
  uf: string;

  observacoes?: string | null;

  ativo?: boolean | null;
}

export interface ManufacturerUpdateInput {
  nome: string;
  tipo: 'fisica' | 'juridica';

  cnpj?: string | null;
  inscricao_estadual?: string | null;

  contatoPrincipalNome?: string | null;
  contatoPrincipalTelefone?: string | null;
  contatoPrincipalEmail?: string | null;

  contatoSecundarioNome?: string | null;
  contatoSecundarioTelefone?: string | null;
  contatoSecundarioEmail?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;

  codigoCidade?: string | null;
  cidade: string;
  uf: string;

  observacoes?: string | null;

  ativo?: boolean | null;
}

export async function listManufacturers(): Promise<Manufacturer[]> {
  const res = await fetch(`${getBaseUrl()}/manufacturers`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao listar fabricantes');
  }

  return res.json();
}

export async function getManufacturerById(id: string): Promise<Manufacturer> {
  const res = await fetch(`${getBaseUrl()}/manufacturers/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao buscar fabricante');
  }

  return res.json();
}

export async function createManufacturer(input: ManufacturerCreateInput): Promise<Manufacturer> {
  const res = await fetch(`${getBaseUrl()}/manufacturers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao criar fabricante');
  }

  return res.json();
}

export async function updateManufacturer(id: string, input: ManufacturerUpdateInput): Promise<Manufacturer> {
  const res = await fetch(`${getBaseUrl()}/manufacturers/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao atualizar fabricante');
  }

  return res.json();
}

export async function deleteManufacturer(id: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/manufacturers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao excluir fabricante');
  }
}

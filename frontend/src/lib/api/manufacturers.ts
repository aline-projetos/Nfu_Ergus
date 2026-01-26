// src/lib/api/manufacturers.ts
const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'ergus_token';

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

export async function listManufacturers(): Promise<Manufacturer[]> {
  const res = await fetch(`${API_URL}/manufacturers`, {
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
  const res = await fetch(`${API_URL}/manufacturers/${id}`, {
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
  const res = await fetch(`${API_URL}/manufacturers`, {
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
  const res = await fetch(`${API_URL}/manufacturers/${id}`, {
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
  const res = await fetch(`${API_URL}/manufacturers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao excluir fabricante');
  }
}

// src/lib/api/suppliers.ts
const API_BASE_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'ergus_token';
const TENANT_KEY = 'ergus_tenant_id';

export interface Supplier {
  id: string;
  tenantId: string;
  codigo: string;
  nome: string;
  tipo: 'fisica' | 'juridica';

  cpf?: string | null;
  rg?: string | null;

  cnpj?: string | null;
  inscricao_estadual?: string | null;

  telefone?: string | null;
  email?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;

  cidade: string;
  uf: string;

  ativo: boolean;
}

export interface SupplierCreateInput {
  nome: string;
  tipo: 'fisica' | 'juridica';

  cpf?: string | null;
  rg?: string | null;

  cnpj?: string | null;
  inscricao_estadual?: string | null;

  telefone?: string | null;
  email?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;

  cidade: string;
  uf: string;

  ativo?: boolean | null;
}

export interface SupplierUpdateInput {
    nome: string;
  tipo: 'fisica' | 'juridica';

  cpf?: string | null;
  rg?: string | null;

  cnpj?: string | null;
  inscricao_estadual?: string | null;

  telefone?: string | null;
  email?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;

  cidade: string;
  uf: string;

  ativo?: boolean | null;
}

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  const tenantId = localStorage.getItem(TENANT_KEY);

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

export async function listSuppliers(): Promise<Supplier[]> {
  const res = await fetch(`${API_BASE_URL}/suppliers`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao listar fornecedores');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// GET /suppliers/{id}
// -----------------------------------------------------------------------------

export async function getSupplierById(id: string): Promise<Supplier> {
  const res = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao buscar fornecedor');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// POST /suppliers
// -----------------------------------------------------------------------------

export async function createSupplier(
  input: SupplierCreateInput
): Promise<Supplier> {
  const res = await fetch(`${API_BASE_URL}/suppliers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao criar fornecedor');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// PUT /suppliers/{id}
// -----------------------------------------------------------------------------

export async function updateSupplier(
  id: string,
  input: SupplierUpdateInput
): Promise<Supplier> {
  const res = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao atualizar fornecedor');
  }

  return res.json();
}

// -----------------------------------------------------------------------------
// DELETE /suppliers/{id}
// -----------------------------------------------------------------------------

export async function deleteSupplier(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao excluir fornecedor');
  }
}

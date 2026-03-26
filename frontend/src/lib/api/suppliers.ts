import { getAuthHeaders, getBaseUrl } from "../utils";

// src/lib/api/suppliers.ts



export interface Supplier {
  id: string;
  tenantId: string;

  codigo: string;
  nome: string;
  tipo: 'fisica' | 'juridica';

  // documentos
  cpf?: string | null;
  rg?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;

  // contato principal (nome separado + telefone/email principais)
  contato_principal_nome?: string | null;
  telefone?: string | null;
  email?: string | null;

  // contato secundário
  contato_secundario_nome?: string | null;
  contato_secundario_telefone?: string | null;
  contato_secundario_email?: string | null;

  // endereço
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;

  // localização
  codigo_cidade?: string | null;
  cidade: string;
  uf: string;

  // outros
  observacoes?: string | null;

  ativo: boolean;
}

export interface SupplierCreateInput {
  nome: string;
  tipo: 'fisica' | 'juridica';

  // opcional no payload (backend ignora porque gera o código)
  codigo?: string | null;

  // documentos
  cpf?: string | null;
  rg?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;

  // contato principal
  contato_principal_nome?: string | null;
  telefone?: string | null;
  email?: string | null;

  // contato secundário
  contato_secundario_nome?: string | null;
  contato_secundario_telefone?: string | null;
  contato_secundario_email?: string | null;

  // endereço
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;

  // localização
  codigo_cidade?: string | null;
  cidade: string;
  uf: string;

  // outros
  observacoes?: string | null;

  ativo?: boolean | null;
}

export interface SupplierUpdateInput {
  nome: string;
  tipo: 'fisica' | 'juridica';

  // não atualiza código pelo wizard, mas deixamos possível
  codigo?: string | null;

  // documentos
  cpf?: string | null;
  rg?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;

  // contato principal
  contato_principal_nome?: string | null;
  telefone?: string | null;
  email?: string | null;

  // contato secundário
  contato_secundario_nome?: string | null;
  contato_secundario_telefone?: string | null;
  contato_secundario_email?: string | null;

  // endereço
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;

  // localização
  codigo_cidade?: string | null;
  cidade: string;
  uf: string;

  // outros
  observacoes?: string | null;

  ativo?: boolean | null;
}

// -----------------------------------------------------------------------------
// GET /suppliers
// -----------------------------------------------------------------------------

export async function listSuppliers(): Promise<Supplier[]> {
  const res = await fetch(`${getBaseUrl()}/suppliers`, {
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
  const res = await fetch(`${getBaseUrl()}/suppliers/${id}`, {
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
  const res = await fetch(`${getBaseUrl()}/suppliers`, {
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
  const res = await fetch(`${getBaseUrl()}/suppliers/${id}`, {
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
  const res = await fetch(`${getBaseUrl()}/suppliers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro ao excluir fornecedor');
  }
}
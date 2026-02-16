import { getAuthHeaders, getBaseUrl } from "../utils";

// =======================
// TYPES (novo modelo)
// =======================

export interface VariationImage {
  url: string;
  isPrimary?: boolean;
  position?: number; // opcional (ordenação)
  description?: string;
}

export interface VariationDetails {
  // seu modal manda um objeto com strings
  // deixe flexível pra não ficar travando evolução
  [key: string]: string | undefined;
}

export interface ProductVariation {
  id: string;
  product_id: string;
  tenant_id: string;

  // sku real
  sku: string;
  ean?: string | null;

  price?: string | number | null;
  cost_price?: string | number | null;

  weight?: string | number | null;
  length?: string | number | null;
  height?: string | number | null;
  width?: string | number | null;

  active: boolean;
  is_default: boolean;

  combination?: string | null; // ex: "Cor: Azul / Tamanho: M"

  details?: VariationDetails | null;
  images?: VariationImage[]; // vem do backend
}

export interface Product {
  id: string;
  tenant_id: string;
  code: string;
  name: string;

  category_id?: string | null;
  supplier_id?: string | null;
  manufacturer_id?: string | null;

  // novos campos
  tax_group_id?: string | null;
  ncm_id?: string | null;
  cest_id?: string | null;
  fiscal_origin?: string | null;

  video_link?: string | null;
  other_links?: string | null;

  // agora o produto sempre volta com pelo menos 1 variação
  variations?: ProductVariation[];
}

// =======================
// INPUTS (wizard)
// =======================

export interface ProductVariationCreateInput {
  sku: string;
  ean?: string | null;

  price?: string | number | null;
  cost_price?: string | number | null;

  weight?: string | number | null;
  length?: string | number | null;
  height?: string | number | null;
  width?: string | number | null;

  active?: boolean;      // default true
  is_default?: boolean;  // backend garante (default true quando não tem grade)

  combination?: string | null;
  details?: VariationDetails | null;
  images?: VariationImage[];
}

export interface ProductWizardCreateInput {
  // produto “pai”
  name: string;

  category_id?: string | null;
  supplier_id?: string | null;
  manufacturer_id?: string | null;

  tax_group_id?: string | null;
  ncm_id?: string | null;
  cest_id?: string | null;
  fiscal_origin?: string | null;

  video_link?: string | null;
  other_links?: string | null;

  // regra: sempre precisa existir pelo menos 1 variação
  // - se não houver grade: enviar 1 variação (default)
  // - se houver grade: enviar N variações
  variations: ProductVariationCreateInput[];
}

export type ProductWizardUpdateInput = ProductWizardCreateInput;

// =======================
// GET /products
// =======================

export async function listProducts(): Promise<Product[]> {
  const res = await fetch(`${getBaseUrl()}/products`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao listar produtos");
  }

  return res.json();
}

// =======================
// GET /products/{id}
// =======================

export async function getProductById(id: string): Promise<Product> {
  const res = await fetch(`${getBaseUrl()}/products/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao buscar produto");
  }

  return res.json();
}

// =======================
// POST /products/wizard  (NOVO - correto)
// =======================

export async function createProductWizard(
  input: ProductWizardCreateInput
): Promise<Product> {
  const res = await fetch(`${getBaseUrl()}/products/wizard`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao criar produto (wizard)");
  }

  return res.json();
}

// (opcional) Mantém o nome antigo createProduct, mas por baixo chama o wizard
// pra não precisar refatorar o Wizard agora.
export async function createProduct(
  input: ProductWizardCreateInput
): Promise<Product> {
  return createProductWizard(input);
}

// =======================
// PUT /products/{id} (se você manter alias)
// ou PUT /products/wizard/{id} (se criar endpoint novo)
// =======================

export async function updateProductWizard(
  id: string,
  input: ProductWizardUpdateInput
): Promise<Product> {
  // escolha 1: endpoint novo
  const url = `${getBaseUrl()}/products/wizard/${id}`;

  // escolha 2 (se você decidiu que /products/{id} é alias do wizard)
  // const url = `${getBaseUrl()}/products/${id}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao atualizar produto (wizard)");
  }

  return res.json();
}

// Mantém updateProduct antigo chamando o wizard (alias)
export async function updateProduct(
  id: string,
  input: ProductWizardUpdateInput
): Promise<Product> {
  return updateProductWizard(id, input);
}

// =======================
// DELETE /products/{id}
// =======================

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/products/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao excluir produto");
  }
}

import { getAuthHeaders, getBaseUrl } from "../utils";

// =======================
// TYPES 
// =======================

export interface VariationImage {
  url: string;
  isPrimary?: boolean;
  position?: number; // opcional (ordenação)
  description?: string;
}

export interface VariationDetails {
  // modal de variações manda um objeto com strings
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

  // ex: "Cor: Azul / Tamanho: M"
  combination?: string | null;

  // atributos da variação (Cor, Tamanho, Sabor, etc.)
  details?: VariationDetails | null;

  // imagens da variação (default ou específicas)
  images?: VariationImage[];
}

export interface Product {
  id: string;
  tenant_id: string;
  code: string;
  name: string;

  // identificação/comercial
  reference?: string | null;

  // descrições / SEO
  unit?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  meta_title?: string | null;
  meta_tag?: string | null;
  meta_description?: string | null;

  // vínculos
  promotion_id?: string | null;
  category_id?: string | null;
  supplier_id?: string | null;
  manufacturer_id?: string | null;

  // fiscais
  tax_group_id?: string | null;
  ncm_id?: string | null;
  cest_id?: string | null;
  fiscal_origin?: string | null;

  // mídia / links
  video_link?: string | null;
  other_links?: string | null;

  // herdáveis (defaults do produto pai)
  price?: string | number | null;
  cost_price?: string | number | null;
  weight?: string | number | null;
  length?: string | number | null;
  height?: string | number | null;
  width?: string | number | null;

  active?: boolean;

  // agora o produto sempre volta com pelo menos 1 variação
  variations?: ProductVariation[];
}

// =======================
// INPUTS (wizard)
// =======================

// → campos da VARIAÇÃO (SKU real)
export interface ProductVariationCreateInput {
  sku: string;
  ean?: string | null;

  // overrides opcionais dos campos herdáveis do pai
  price?: string | number | null;
  cost_price?: string | number | null;

  weight?: string | number | null;
  length?: string | number | null;
  height?: string | number | null;
  width?: string | number | null;

  active?: boolean;      // default true
  is_default?: boolean;  // backend garante quando não tem grade

  // ex: "Cor: Azul / Tamanho: M"
  combination?: string | null;

  // atributos da variação (Cor, Tamanho, etc.)
  details?: VariationDetails | null;

  // imagens específicas da variação
  images?: VariationImage[];
}

// → campos do PRODUTO PAI + herdáveis + lista de variações
export interface ProductWizardCreateInput {
  // produto “pai” / agrupador
  name: string;

  reference: string;
  // sku aqui é o “principal” e normalmente vira o sku da variação default
  sku: string;
  ean?: string | null;

  // herdáveis (defaults)
  price?: string | number | null;
  cost_price?: string | number | null;

  weight?: string | number | null;
  length?: string | number | null;
  height?: string | number | null;
  width?: string | number | null;

  active?: boolean;

  // descrições / SEO (no backend em snake_case)
  unit?: string;
  short_description?: string;
  long_description?: string;
  meta_title?: string;
  meta_tag?: string;
  meta_description?: string;

  // vínculos
  promotion_id?: string | null;
  category_id?: string | null;
  supplier_id?: string | null;
  manufacturer_id?: string | null;

  // fiscais
  tax_group_id?: string | null;
  ncm_id?: string | null;
  cest_id?: string | null;
  fiscal_origin?: string | null;

  // mídia / links
  video_link?: string | null;
  other_links?: string | null;

  // imagens “do produto” (vão para a variação default no backend)
  default_images?: VariationImage[];

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
  console.log("lista produtos");
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
  console.log("get produto by id");
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
// POST /products/wizard
// =======================

export async function createProductWizard(
  input: ProductWizardCreateInput
): Promise<Product> {
  console.log("cria produto");
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

// =======================
// PUT /products/wizard/{id}
// =======================

export async function updateProductWizard(
  id: string,
  input: ProductWizardUpdateInput
): Promise<Product> {
  console.log("atualiza produto");
  const url = `${getBaseUrl()}/products/wizard/${id}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao atualizar produto (wizard)");
  }

  return;
}

// =======================
// DELETE /products/{id}
// =======================

export async function deleteProduct(id: string): Promise<void> {
  console.log("deleta produto");
  const res = await fetch(`${getBaseUrl()}/products/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao excluir produto");
  }
}

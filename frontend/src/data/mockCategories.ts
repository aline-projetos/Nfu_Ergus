export interface Category {
  id: string;
  code: string;
  name: string;
  parentCode: string | null;
  parentName: string | null;
  metaTitle?: string;
  metaTag?: string;
  metaDescription?: string;
  siteOrder?: number;
  siteLink?: string;
  description?: string;
}

export const mockCategories: Category[] = [
  { id: '1', code: 'CAT001', name: 'Roupas', parentCode: null, parentName: null },
  { id: '2', code: 'CAT002', name: 'Camisetas', parentCode: 'CAT001', parentName: 'Roupas' },
  { id: '3', code: 'CAT003', name: 'Calças', parentCode: 'CAT001', parentName: 'Roupas' },
  { id: '4', code: 'CAT004', name: 'Eletrodomésticos', parentCode: null, parentName: null },
  { id: '5', code: 'CAT005', name: 'Geladeiras', parentCode: 'CAT004', parentName: 'Eletrodomésticos' },
  { id: '6', code: 'CAT006', name: 'Fogões', parentCode: 'CAT004', parentName: 'Eletrodomésticos' },
  { id: '7', code: 'CAT007', name: 'Alimentos', parentCode: null, parentName: null },
  { id: '8', code: 'CAT008', name: 'Laticínios', parentCode: 'CAT007', parentName: 'Alimentos' },
  { id: '9', code: 'CAT009', name: 'Jardinagem', parentCode: null, parentName: null },
  { id: '10', code: 'CAT010', name: 'Ferramentas', parentCode: 'CAT009', parentName: 'Jardinagem' },
  { id: '11', code: 'CAT011', name: 'Eletrônicos', parentCode: null, parentName: null },
  { id: '12', code: 'CAT012', name: 'Smartphones', parentCode: 'CAT011', parentName: 'Eletrônicos' },
  { id: '13', code: 'CAT013', name: 'Notebooks', parentCode: 'CAT011', parentName: 'Eletrônicos' },
  { id: '14', code: 'CAT014', name: 'Móveis', parentCode: null, parentName: null },
  { id: '15', code: 'CAT015', name: 'Sofás', parentCode: 'CAT014', parentName: 'Móveis' },
];

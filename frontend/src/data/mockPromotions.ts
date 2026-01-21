export interface PromotionItem {
  id: string;
  code: string;
  name: string;
  type: 'add' | 'subtract';
  startDate: string;
  endDate: string;
  usePercentage: boolean;
  value: number;
  adjustCents: boolean;
  centsAdjustment: number;
  associatedItems: AssociatedItem[];
}

export interface AssociatedItem {
  id: string;
  type: 'product' | 'category';
  code: string;
  name: string;
}

export const mockSearchItems: AssociatedItem[] = [
  { id: '1', type: 'product', code: 'PROD001', name: 'Camiseta Básica' },
  { id: '2', type: 'product', code: 'PROD002', name: 'Calça Jeans' },
  { id: '3', type: 'product', code: 'PROD003', name: 'Tênis Esportivo' },
  { id: '4', type: 'product', code: 'PROD004', name: 'Jaqueta de Couro' },
  { id: '5', type: 'category', code: 'CAT001', name: 'Roupas' },
  { id: '6', type: 'category', code: 'CAT002', name: 'Calçados' },
  { id: '7', type: 'category', code: 'CAT003', name: 'Acessórios' },
  { id: '8', type: 'product', code: 'PROD005', name: 'Relógio Digital' },
  { id: '9', type: 'product', code: 'PROD006', name: 'Óculos de Sol' },
  { id: '10', type: 'category', code: 'CAT004', name: 'Eletrônicos' },
];

export const mockPromotions: PromotionItem[] = [
  {
    id: '1',
    code: 'PROMO001',
    name: 'Black Friday 2026',
    type: 'subtract',
    startDate: '2026-11-20',
    endDate: '2026-11-30',
    usePercentage: true,
    value: 30,
    adjustCents: true,
    centsAdjustment: 0.99,
    associatedItems: [
      { id: '1', type: 'product', code: 'PROD001', name: 'Camiseta Básica' },
      { id: '5', type: 'category', code: 'CAT001', name: 'Roupas' },
    ],
  },
  {
    id: '2',
    code: 'PROMO002',
    name: 'Promoção de Verão',
    type: 'subtract',
    startDate: '2026-01-01',
    endDate: '2026-02-28',
    usePercentage: true,
    value: 15,
    adjustCents: false,
    centsAdjustment: 0,
    associatedItems: [],
  },
  {
    id: '3',
    code: 'PROMO003',
    name: 'Acréscimo Premium',
    type: 'add',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    usePercentage: false,
    value: 50,
    adjustCents: false,
    centsAdjustment: 0,
    associatedItems: [],
  },
];

export const promotionTypes = [
  { value: 'add', label: 'Adicionar valor' },
  { value: 'subtract', label: 'Subtrair valor' },
];

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

export const promotionTypes = [
  { value: 'add', label: 'Adicionar valor' },
  { value: 'subtract', label: 'Subtrair valor' },
];

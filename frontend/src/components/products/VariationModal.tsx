import { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AttributeConfig {
  name: string;
  values: string[];
}

interface VariationRow {
  combination: string;
  sku: string;
  ean: string;
  price: string;
  stock: string;
  active: boolean;
}

const PRESET_VALUES: Record<string, string[]> = {
  Cor: ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza'],
  Tamanho: ['P', 'M', 'G', 'GG'],
  Sabor: ['Morango', 'Chocolate', 'Baunilha'],
};

const ATTRIBUTE_OPTIONS = ['Cor', 'Tamanho', 'Sabor', 'Novo atributo'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (rows: VariationRow[]) => void;
  parentSku: string;
  parentPrice: string;
  initialRows?: VariationRow[];
}

function inferAttributeName(values: string[], position: 0 | 1) {
  // tenta “adivinhar” pelo preset
  const presets = Object.entries(PRESET_VALUES);
  for (const [name, presetVals] of presets) {
    const allInside = values.every(v => presetVals.includes(v));
    if (allInside && values.length > 0) return name;
  }
  return position === 0 ? 'Atributo 1' : 'Atributo 2';
}

function buildAttributesFromRows(rows: VariationRow[]): AttributeConfig[] {
  if (!rows?.length) return [];

  const parts = rows
    .map(r => (r.combination || '').split(' / ').map(s => s.trim()).filter(Boolean));

  const maxLen = Math.max(...parts.map(p => p.length), 0);
  if (maxLen <= 0) return [];

  // Só suporta 1 ou 2 atributos (igual sua regra atual)
  const attrCount = Math.min(maxLen, 2);

  const values0 = new Set<string>();
  const values1 = new Set<string>();

  for (const p of parts) {
    if (attrCount >= 1 && p[0]) values0.add(p[0]);
    if (attrCount >= 2 && p[1]) values1.add(p[1]);
  }

  const attr0 = Array.from(values0);
  const attr1 = Array.from(values1);

  const result: AttributeConfig[] = [];
  if (attrCount >= 1) result.push({ name: inferAttributeName(attr0, 0), values: attr0 });
  if (attrCount >= 2) result.push({ name: inferAttributeName(attr1, 1), values: attr1 });

  return result;
}

export function VariationModel1Modal({ open, onClose, onSave, parentSku, parentPrice, initialRows = []  }: Props) {
  const [attributes, setAttributes] = useState<AttributeConfig[]>([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [customAttrName, setCustomAttrName] = useState('');
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>({});
  const [variationRows, setVariationRows] = useState<VariationRow[]>([]);

  useEffect(() => {
    if (!open) return;

    setVariationRows(initialRows);

    const inferred = buildAttributesFromRows(initialRows);
    setAttributes(inferred);

    setSelectedOption('');
    setCustomAttrName('');
    setNewValueInputs({});
  }, [open, initialRows]);

  const makeVariationPrefix = useCallback((combo: string) => {
    const first = (combo.split(' / ')[0] || '').trim();

    const clean = first
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');

    return clean.toUpperCase().slice(0, 3).padEnd(3, 'X');
  }, []);

  const makeAutoSku = useCallback((combo: string, index: number) => {
    if (!parentSku?.trim()) return '';
    const prefix = makeVariationPrefix(combo);
    const seq = String(index + 2).padStart(3, '0'); // 002, 003...
    return `${parentSku.trim()}${prefix}${seq}`;
  }, [parentSku, makeVariationPrefix]);

  const combinations = useMemo(() => {
    if (attributes.length === 0) return [];
    if (attributes.length === 1) {
      return attributes[0].values.map(v => [v]);
    }
    // cartesian product of 2 attributes
    const result: string[][] = [];
    for (const v1 of attributes[0].values) {
      for (const v2 of attributes[1].values) {
        result.push([v1, v2]);
      }
    }
    return result;
  }, [attributes]);

  const rows = useMemo(() => {
    return combinations.map((combo, i) => {
      const key = combo.join(' / ');
      const existing = variationRows.find(r => r.combination === key);

      if (existing) return existing;

      return {
        combination: key,
        sku: makeAutoSku(key, i),
        ean: '',
        price: parentPrice || '',
        stock: '0',
        active: true,
      };
    });
  }, [combinations, variationRows, makeAutoSku, parentPrice]);

  const upsertRow = (row: VariationRow) => {
    setVariationRows(prev => {
      const idx = prev.findIndex(r => r.combination === row.combination);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = row;
        return copy;
      }
      return [...prev, row];
    });
  };

  const updateRow = (index: number, field: keyof VariationRow, value: string | boolean) => {
    const base = rows[index];
    const updated: VariationRow = { ...base, [field]: value as any };
    upsertRow(updated);
  };

  const handleAddAttribute = () => {
    if (!selectedOption) return;
    if (attributes.length >= 2) {
      toast.error('Máximo de 2 atributos permitidos');
      return;
    }

    if (selectedOption === 'Novo atributo') {
      if (!customAttrName.trim()) {
        toast.error('Informe o nome do atributo');
        return;
      }
      if (attributes.find(a => a.name === customAttrName.trim())) {
        toast.error('Atributo já adicionado');
        return;
      }
      setAttributes(prev => [...prev, { name: customAttrName.trim(), values: [] }]);
      setCustomAttrName('');
    } else {
      if (attributes.find(a => a.name === selectedOption)) {
        toast.error('Atributo já adicionado');
        return;
      }
      setAttributes(prev => [...prev, { name: selectedOption, values: [] }]);
    }
    setSelectedOption('');
  };

  const addValueToAttribute = (attrIndex: number, value: string) => {
    if (!value.trim()) return;
    setAttributes(prev => {
      const copy = [...prev];
      if (copy[attrIndex].values.includes(value.trim())) return copy;
      copy[attrIndex] = { ...copy[attrIndex], values: [...copy[attrIndex].values, value.trim()] };
      return copy;
    });
    setNewValueInputs(prev => ({ ...prev, [attrIndex]: '' }));
  };

  const removeValue = (attrIndex: number, value: string) => {
    setAttributes(prev => {
      const copy = [...prev];
      copy[attrIndex] = { ...copy[attrIndex], values: copy[attrIndex].values.filter(v => v !== value) };
      return copy;
    });
  };

  const removeAttribute = (attrIndex: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== attrIndex));
  };

  const handleSave = () => {
    // ✅ Recomendado: salvar somente as linhas ativas
    const finalRows = rows.filter(r => r.active).map(r => ({ ...r }));

    // salvar todas (ativas e inativas):
    // const finalRows = rows.map(r => ({ ...r }));

    if (finalRows.length === 0) {
      toast.error('Nenhuma variação ativa para salvar');
      return;
    }

    onSave(finalRows);
    toast.success('Variações salvas com sucesso');
    onClose();
  };

  const handleReset = () => {
    setAttributes([]);
    setSelectedOption('');
    setCustomAttrName('');
    setNewValueInputs({});
    setVariationRows([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 animate-in fade-in-0 duration-200" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-lg animate-in zoom-in-95 fade-in-0 slide-in-from-bottom-4 duration-300 mx-4 scrollbar-thin">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border bg-card rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Configuração de Variações - Modelo 1</h2>
            <p className="text-sm text-muted-foreground mt-1">Selecione atributos e valores para gerar a grade de variações</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Attribute Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Seleção de Atributos
            </h3>
            <p className="text-sm text-muted-foreground">Selecione até 2 atributos</p>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-2">Atributo</label>
                <select
                  value={selectedOption}
                  onChange={e => setSelectedOption(e.target.value)}
                  className="input-field"
                  disabled={attributes.length >= 2}
                >
                  <option value="">Selecione um atributo</option>
                  {ATTRIBUTE_OPTIONS.filter(o => !attributes.find(a => a.name === o) || o === 'Novo atributo').map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {selectedOption === 'Novo atributo' && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-2">Nome do atributo</label>
                  <input
                    type="text"
                    value={customAttrName}
                    onChange={e => setCustomAttrName(e.target.value)}
                    placeholder="Ex: Material, Peso..."
                    className="input-field"
                  />
                </div>
              )}

              <button
                onClick={handleAddAttribute}
                disabled={attributes.length >= 2 || !selectedOption}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>

          {/* Attributes with values */}
          {attributes.map((attr, attrIndex) => (
            <div key={attr.name} className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">{attr.name}</h4>
                <button
                  onClick={() => removeAttribute(attrIndex)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2">
                {attr.values.map(val => (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {val}
                    <button
                      onClick={() => removeValue(attrIndex, val)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Preset values */}
              {PRESET_VALUES[attr.name] && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Valores sugeridos:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_VALUES[attr.name]
                      .filter(v => !attr.values.includes(v))
                      .map(v => (
                        <button
                          key={v}
                          onClick={() => addValueToAttribute(attrIndex, v)}
                          className="px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
                        >
                          + {v}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Custom value input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newValueInputs[attrIndex] || ''}
                  onChange={e => setNewValueInputs(prev => ({ ...prev, [attrIndex]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addValueToAttribute(attrIndex, newValueInputs[attrIndex] || '');
                    }
                  }}
                  placeholder={`Novo ${attr.name.toLowerCase()}...`}
                  className="input-field flex-1"
                />
                <button
                  onClick={() => addValueToAttribute(attrIndex, newValueInputs[attrIndex] || '')}
                  className="px-3 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Section 2: Preview Grid */}
          {rows.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Preview da Grade
              </h3>
              <p className="text-sm text-muted-foreground">
                {rows.length} combinação(ões) gerada(s)
              </p>

              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Combinação</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">EAN</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Preço</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estoque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.combination} className="border-b border-border last:border-0 table-row-hover">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {row.combination}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.sku}
                              onChange={e => updateRow(i, 'sku', e.target.value)}
                              placeholder="SKU"
                              className="input-field py-1.5 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.ean}
                              onChange={e => updateRow(i, 'ean', e.target.value)}
                              placeholder="EAN"
                              className="input-field py-1.5 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.price}
                              onChange={e => updateRow(i, 'price', e.target.value.replace(/[^0-9.,]/g, ''))}
                              placeholder="0.00"
                              className="input-field py-1.5 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-muted-foreground">0</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between p-6 border-t border-border bg-card rounded-b-xl">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors text-sm"
          >
            Limpar tudo
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={rows.length === 0}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Variações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

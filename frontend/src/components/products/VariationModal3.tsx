import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
interface AttributeConfig {
  name: string;
  values: string[];
}
interface GeneratedRow {
  id: string;
  combination: string;
  sku: string;
  ean: string;
  price: string;
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
  onSave: (rows: Array<{ combination: string; sku: string; ean: string; price: string; stock: string }>) => void;
}
export function VariationModel3Modal({ open, onClose, onSave }: Props) {
  const [attributes, setAttributes] = useState<AttributeConfig[]>([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [customAttrName, setCustomAttrName] = useState('');
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>({});
  const [generatedRows, setGeneratedRows] = useState<GeneratedRow[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const canGenerate = attributes.length > 0 && attributes.every(a => a.values.length > 0);
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
    setHasGenerated(false);
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
    setHasGenerated(false);
  };
  const removeValue = (attrIndex: number, value: string) => {
    setAttributes(prev => {
      const copy = [...prev];
      copy[attrIndex] = { ...copy[attrIndex], values: copy[attrIndex].values.filter(v => v !== value) };
      return copy;
    });
    setHasGenerated(false);
  };
  const removeAttribute = (attrIndex: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== attrIndex));
    setHasGenerated(false);
    setGeneratedRows([]);
  };
  const generateCombinations = () => {
    if (!canGenerate) return;
    let combos: string[][];
    if (attributes.length === 1) {
      combos = attributes[0].values.map(v => [v]);
    } else {
      combos = [];
      for (const v1 of attributes[0].values) {
        for (const v2 of attributes[1].values) {
          combos.push([v1, v2]);
        }
      }
    }
    const rows: GeneratedRow[] = combos.map((combo, i) => ({
      id: String(Date.now()) + '_' + i,
      combination: combo.join(' / '),
      sku: '',
      ean: '',
      price: '',
    }));
    setGeneratedRows(rows);
    setHasGenerated(true);
    toast.success(`${rows.length} combinações geradas`);
  };
  const updateRow = (id: string, field: keyof Omit<GeneratedRow, 'id' | 'combination'>, value: string) => {
    setGeneratedRows(prev =>
      prev.map(r => r.id === id ? { ...r, [field]: field === 'price' ? value.replace(/[^0-9.,]/g, '') : value } : r)
    );
  };
  const removeRow = (id: string) => {
    setGeneratedRows(prev => prev.filter(r => r.id !== id));
  };
  const handleSave = () => {
    const mapped = generatedRows.map(r => ({
      combination: r.combination,
      sku: r.sku,
      ean: r.ean,
      price: r.price,
      stock: '0',
    }));
    onSave(mapped);
    toast.success('Variações salvas com sucesso');
    onClose();
  };
  const handleReset = () => {
    setAttributes([]);
    setSelectedOption('');
    setCustomAttrName('');
    setNewValueInputs({});
    setGeneratedRows([]);
    setHasGenerated(false);
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 animate-in fade-in-0 duration-200" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-lg animate-in zoom-in-95 fade-in-0 slide-in-from-bottom-4 duration-300 mx-4 scrollbar-thin">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border bg-card rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Configuração de Variações - Modelo 3</h2>
            <p className="text-sm text-muted-foreground mt-1">Gere combinações automaticamente e remova as indesejadas</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Section 1: Attribute Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Seleção de Atributos</h3>
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
                  <input type="text" value={customAttrName} onChange={e => setCustomAttrName(e.target.value)} placeholder="Ex: Material, Peso..." className="input-field" />
                </div>
              )}
              <button onClick={handleAddAttribute} disabled={attributes.length >= 2 || !selectedOption} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>
          {/* Section 2: Attribute values */}
          {attributes.map((attr, attrIndex) => (
            <div key={attr.name} className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">{attr.name}</h4>
                <button onClick={() => removeAttribute(attrIndex)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {attr.values.map(val => (
                  <span key={val} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {val}
                    <button onClick={() => removeValue(attrIndex, val)} className="hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              {PRESET_VALUES[attr.name] && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Valores sugeridos:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_VALUES[attr.name].filter(v => !attr.values.includes(v)).map(v => (
                      <button key={v} onClick={() => addValueToAttribute(attrIndex, v)} className="px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors">
                        + {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newValueInputs[attrIndex] || ''}
                  onChange={e => setNewValueInputs(prev => ({ ...prev, [attrIndex]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addValueToAttribute(attrIndex, newValueInputs[attrIndex] || ''); } }}
                  placeholder={`Novo ${attr.name.toLowerCase()}...`}
                  className="input-field flex-1"
                />
                <button onClick={() => addValueToAttribute(attrIndex, newValueInputs[attrIndex] || '')} className="px-3 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {/* Generate Button */}
          {canGenerate && (
            <button
              onClick={generateCombinations}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              <Zap className="w-4 h-4" />
              Gerar Combinações
            </button>
          )}
          {/* Section 3: Generated Grid */}
          {hasGenerated && generatedRows.length > 0 && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Combinações Geradas</h3>
              <p className="text-sm text-muted-foreground">{generatedRows.length} combinação(ões)</p>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Combinação</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">EAN</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Preço</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedRows.map(row => (
                        <tr key={row.id} className="border-b border-border last:border-0 table-row-hover">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {row.combination}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" value={row.sku} onChange={e => updateRow(row.id, 'sku', e.target.value)} placeholder="SKU" className="input-field py-1.5 text-sm" />
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" value={row.ean} onChange={e => updateRow(row.id, 'ean', e.target.value)} placeholder="EAN" className="input-field py-1.5 text-sm" />
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" value={row.price} onChange={e => updateRow(row.id, 'price', e.target.value)} placeholder="0.00" className="input-field py-1.5 text-sm" />
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => removeRow(row.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {hasGenerated && generatedRows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Todas as combinações foram removidas.</p>
          )}
        </div>
        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between p-6 border-t border-border bg-card rounded-b-xl">
          <button onClick={handleReset} className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors text-sm">
            Limpar tudo
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors text-sm">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={generatedRows.length === 0} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              Salvar Variações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tag, Check, X, CheckCircle2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { mockSearchItems, AssociatedItem, promotionTypes } from '@/data/mockPromotions';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import {
  createPromotion,
  getPromotionById,
  updatePromotion,
  Promotion,
  PromotionCreateInput,
} from '@/lib/api/promotions';

interface FormData {
  code: string;
  name: string;
  type: 'add' | 'subtract';
  startDate: Date | undefined;
  endDate: Date | undefined;
  usePercentage: boolean;
  value: string;           // string para o input, depois convertemos p/ number
  adjustCents: boolean;
  centsAdjustment: string; // idem
  active: boolean;
}


const initialFormData: FormData = {
  code: '',
  name: '',
  type: 'subtract',
  startDate: undefined,
  endDate: undefined,
  usePercentage: false,
  value: '',
  adjustCents: false,
  centsAdjustment: '',
  active: true,
};

const steps = [
  { id: 1, label: 'Dados Principais' },
  { id: 2, label: 'Integração' },
];

export function PromotionWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<AssociatedItem[]>([]);

  const filteredItems = [];

  useEffect(() => {
  if (!isEditing || !id) return;

  async function loadPromotion() {
    try {
      const promotion: Promotion = await getPromotionById(id);

      setFormData({
        code: promotion.code || '',
        name: promotion.name || '',
        type: promotion.type as 'add' | 'subtract',
        startDate: promotion.start_date ? new Date(promotion.start_date) : undefined,
        endDate: promotion.end_date ? new Date(promotion.end_date) : undefined,
        usePercentage: promotion.use_percentage ?? false,
        value: promotion.value?.toString() ?? '',
        adjustCents: promotion.adjust_cents ?? false,
        centsAdjustment: promotion.value_adjustment?.toString() ?? '',
        active: promotion.active ?? true,
      });

      // aqui, se mais pra frente você fizer o back devolver products/categories,
      // dá para popular selectedItems baseado nesses ids
      setVisitedSteps([1, 2]);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar promoção');
      navigate('/catalogo/promocoes');
    }
  }

  loadPromotion();
}, [isEditing, id, navigate]);


  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNumericInput = (field: 'value' | 'centsAdjustment', value: string) => {
    const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    updateField(field, numericValue);
  };

  const toggleItemSelection = (item: AssociatedItem) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const validateStep1 = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!formData.value.trim()) {
      newErrors.value = 'Valor da promoção é obrigatório';
    } else if (formData.usePercentage) {
      const numValue = parseFloat(formData.value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        newErrors.value = 'Porcentagem deve estar entre 0 e 100';
      }
    }
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'Data fim deve ser maior ou igual à data início';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      Object.values(newErrors).forEach(error => {
        if (error) toast.error(error);
      });
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
      if (currentStep === 1) {
        if (validateStep1()) {
          setCurrentStep(2);
          setVisitedSteps(prev => [...new Set([...prev, 2])]);
        }
        return;
      }
  
      // Step 2 -> salvar no backend
      try {
        setLoading(true);

        const productIds = selectedItems
        .filter(item => item.type === 'product')
        .map(item => item.id);

      const categoryIds = selectedItems
        .filter(item => item.type === 'category')
        .map(item => item.id);

  
        const start_date = formData.startDate
        ? formData.startDate.toISOString()
        : undefined;
      const end_date = formData.endDate
        ? formData.endDate.toISOString()
        : undefined;

      const value = formData.value
        ? Number(formData.value.replace(',', '.'))
        : NaN;

      const value_adjustment = formData.centsAdjustment
        ? Number(formData.centsAdjustment.replace(',', '.'))
        : 0;

      const payload: PromotionCreateInput = {
        name: formData.name.trim(),
        type: formData.type, // se precisar mapear pra 'Adiciona Valor'/'Subtrai Valor', faz aqui
        start_date: start_date!,      // se você quiser obrigar, valide antes
        end_date: end_date!,          // idem
        use_percentage: formData.usePercentage,
        value,
        adjust_cents: formData.adjustCents,
        value_adjustment,
        active: formData.active ?? true,
        products: productIds,
        categories: categoryIds,
      };

  
        if (!payload.name) {
          throw new Error('Nome é obrigatório');
        }
        if (isNaN(payload.value)) {
          throw new Error('Valor é obrigatório');
        }
        if (!payload.start_date || !payload.end_date) {
          throw new Error('Datas de início e fim são obrigatórias');
        }

  
        if (!isEditing) {
          await createPromotion(payload);
          toast.success('Promoção cadastrada com sucesso');
        } else if (id) {
          await updatePromotion(id, payload);
          toast.success('Promoção atualizada com sucesso');
        }

  
        navigate('/catalogo/promocoes');
      } catch (err: any) {
        toast.error(err.message ?? 'Erro ao salvar promocao');
      } finally {
        setLoading(false);
      }
    };

  const handleCancel = () => {
    navigate('/catalogo/promocoes');
  };

  const handleStepClick = (stepId: number) => {
    if (visitedSteps.includes(stepId) && stepId < currentStep) {
      setCurrentStep(stepId);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="card-dashboard">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Tag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Adicionar Promoção</h1>
              <p className="text-sm text-muted-foreground">Cadastro</p>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Stepper */}
          <div className="w-56 border-r border-border p-6">
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isCompleted = visitedSteps.includes(step.id) && step.id < currentStep;
                const isActive = step.id === currentStep;
                const canClick = visitedSteps.includes(step.id) && step.id < currentStep;

                return (
                  <div key={step.id}>
                    <button
                      onClick={() => handleStepClick(step.id)}
                      disabled={!canClick}
                      className={`stepper-step w-full ${
                        isCompleted ? 'completed' : isActive ? 'active' : 'pending'
                      } ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className={`stepper-number ${
                        isCompleted ? 'completed' : isActive ? 'active' : 'pending'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <span className="text-sm">{step.label}</span>
                    </button>
                    
                    {index < steps.length - 1 && (
                      <div className="ml-7 h-4 border-l-2 border-border" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 p-6 min-h-[500px]">
            {/* Step 1: Dados Principais */}
            {currentStep === 1 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Dados Principais</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código da promoção <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => updateField('code', e.target.value)}
                      placeholder="Ex: PROMO001"
                      className={`input-field ${errors.code ? 'error' : ''}`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome da promoção <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Nome da promoção"
                      className={`input-field ${errors.name ? 'error' : ''}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tipo de promoção
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => updateField('type', e.target.value as 'add' | 'subtract')}
                      className="input-field"
                    >
                      {promotionTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Data da promoção de
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11",
                            !formData.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate ? format(formData.startDate, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => updateField('startDate', date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Data da promoção até
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11",
                            !formData.endDate && "text-muted-foreground",
                            errors.endDate && "border-destructive"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate ? format(formData.endDate, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => updateField('endDate', date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-end">
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      checked={formData.usePercentage}
                      onCheckedChange={(checked) => updateField('usePercentage', checked)}
                    />
                    <label className="text-sm font-medium text-foreground">
                      Usar porcentagem no valor
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Valor da promoção <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.value}
                        onChange={(e) => handleNumericInput('value', e.target.value)}
                        placeholder={formData.usePercentage ? "0 - 100" : "0.00"}
                        className={`input-field pr-8 ${errors.value ? 'error' : ''}`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {formData.usePercentage ? '%' : 'R$'}
                      </span>
                    </div>
                  </div>

                  <div />
                </div>

                <div className="grid grid-cols-3 gap-4 items-end">
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      checked={formData.adjustCents}
                      onCheckedChange={(checked) => updateField('adjustCents', checked)}
                    />
                    <label className="text-sm font-medium text-foreground">
                      Aplicar ajustes nos centavos
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Valor do ajuste nos centavos
                    </label>
                    <input
                      type="text"
                      value={formData.centsAdjustment}
                      onChange={(e) => handleNumericInput('centsAdjustment', e.target.value)}
                      placeholder="0.99"
                      disabled={!formData.adjustCents}
                      className={`input-field ${!formData.adjustCents ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div />
                </div>

                {/* Association Block */}
                <div className="border-t border-border pt-6 mt-6">
                  <h3 className="text-md font-medium text-foreground mb-4">Associar Produtos ou Categorias</h3>
                  
                  <div className="relative mb-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Procurar produtos ou categorias"
                      className="input-field pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="w-12 px-4 py-3 text-left"></th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Tipo</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Código</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Nome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item) => {
                          const isSelected = selectedItems.some(i => i.id === item.id);
                          return (
                            <tr 
                              key={item.id} 
                              className={`border-t border-border cursor-pointer transition-colors ${
                                isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                              }`}
                              onClick={() => toggleItemSelection(item)}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleItemSelection(item)}
                                  className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  item.type === 'product' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {item.type === 'product' ? 'Produto' : 'Categoria'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">{item.code}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{item.name}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {selectedItems.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        {selectedItems.length} item(ns) selecionado(s):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedItems.map(item => (
                          <span 
                            key={item.id}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                          >
                            {item.name}
                            <button 
                              onClick={() => toggleItemSelection(item)}
                              className="hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Integração */}
            {currentStep === 2 && (
              <div className="animate-slide-in-right">
                <h2 className="text-lg font-medium text-foreground mb-6">Integração</h2>
                
                <div className="bg-muted/30 rounded-lg p-6 border border-border">
                  <p className="text-muted-foreground">
                    Configuração de integração da promoção com outros módulos ou canais externos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Check className="w-4 h-4" />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

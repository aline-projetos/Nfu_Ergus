import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Package, Check, X, CheckCircle2, Info, Search, Plus, Calendar, Image } from 'lucide-react';
import { toast } from 'sonner';
import { fiscalOrigins, Promotion } from '@/data/mockProducts';

interface FormData {
  // Step 1: Dados Principais
  code: string;
  name: string;
  stock: string;
  reference: string;
  categoryCode: string;
  categoryName: string;
  costPrice: string;
  salePrice: string;
  sku: string;
  ean: string;
  weight: string;
  length: string;
  height: string;
  width: string;
  ncm: string;
  // Step 2: Configurações
  unit: string;
  shortDescription: string;
  longDescription: string;
  metaTitle: string;
  metaTag: string;
  metaDescription: string;
  // Step 3: Regra Comercial
  promotionCode: string;
  promotionName: string;
  promotionStart: string;
  promotionEnd: string;
  // Step 4: Tributação
  taxGroup: string;
  ncmCode: string;
  ncmDescription: string;
  cestCode: string;
  cestDescription: string;
  pisCode: string;
  pisDescription: string;
  cofinsCode: string;
  cofinsDescription: string;
  fiscalOrigin: string;
  // Step 5: Variações
  variationType: string;
  variationTypeCode: string;
  variationSku: string;
  variationEan: string;
  variationWeight: string;
  variationLength: string;
  variationHeight: string;
  variationWidth: string;
  variationShortDesc: string;
  variationLongDesc: string;
  variationMetaTitle: string;
  variationMetaTag: string;
  variationMetaDesc: string;
  variationImageLink: string;
  videoLink: string;
  otherLinks: string;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  stock: '',
  reference: '',
  categoryCode: '',
  categoryName: '',
  costPrice: '',
  salePrice: '',
  sku: '',
  ean: '',
  weight: '',
  length: '',
  height: '',
  width: '',
  ncm: '',
  unit: '',
  shortDescription: '',
  longDescription: '',
  metaTitle: '',
  metaTag: '',
  metaDescription: '',
  promotionCode: '',
  promotionName: '',
  promotionStart: '',
  promotionEnd: '',
  taxGroup: '',
  ncmCode: '',
  ncmDescription: '',
  cestCode: '',
  cestDescription: '',
  pisCode: '',
  pisDescription: '',
  cofinsCode: '',
  cofinsDescription: '',
  fiscalOrigin: '',
  variationType: '',
  variationTypeCode: '',
  variationSku: '',
  variationEan: '',
  variationWeight: '',
  variationLength: '',
  variationHeight: '',
  variationWidth: '',
  variationShortDesc: '',
  variationLongDesc: '',
  variationMetaTitle: '',
  variationMetaTag: '',
  variationMetaDesc: '',
  variationImageLink: '',
  videoLink: '',
  otherLinks: '',
};

const steps = [
  { id: 1, label: 'Dados Principais' },
  { id: 2, label: 'Configurações' },
  { id: 3, label: 'Regra Comercial' },
  { id: 4, label: 'Tributação' },
  { id: 5, label: 'Variações' },
  { id: 6, label: 'Integração' },
];

interface VariationCard {
  id: string;
  description: string;
  position: string;
  url: string;
}

export function ProductWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [variationCards, setVariationCards] = useState<VariationCard[]>([
    { id: '1', description: 'Variação 1', position: '1', url: '/variacao-1' },
    { id: '2', description: 'Variação 2', position: '2', url: '/variacao-2' },
    { id: '3', description: 'Variação 3', position: '3', url: '/variacao-3' },
  ]);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNumericInput = (field: keyof FormData, value: string) => {
    // Allow only numbers and decimal point
    const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    updateField(field, numericValue);
  };

  const validateStep1 = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.code.trim()) {
      newErrors.code = 'Código é obrigatório';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
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

  const handleConfirm = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
        setVisitedSteps(prev => [...new Set([...prev, 2])]);
      }
    } else if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      setVisitedSteps(prev => [...new Set([...prev, currentStep + 1])]);
    } else {
      // Save mock data
      console.log('Saving product:', formData);
      toast.success(isEditing ? 'Produto atualizado com sucesso' : 'Produto cadastrado com sucesso');
      navigate('/catalogo/produtos');
    }
  };

  const handleCancel = () => {
    navigate('/catalogo/produtos');
  };

  const handleStepClick = (stepId: number) => {
    if (visitedSteps.includes(stepId) && stepId < currentStep) {
      setCurrentStep(stepId);
    }
  };

  const handleAddPromotion = () => {
    if (!formData.promotionCode || !formData.promotionName) {
      toast.error('Preencha o código e nome da promoção');
      return;
    }
    
    const newPromotion: Promotion = {
      id: String(Date.now()),
      code: formData.promotionCode,
      name: formData.promotionName,
      startDate: formData.promotionStart,
      endDate: formData.promotionEnd,
    };
    
    setPromotions(prev => [...prev, newPromotion]);
    setFormData(prev => ({
      ...prev,
      promotionCode: '',
      promotionName: '',
      promotionStart: '',
      promotionEnd: '',
    }));
    toast.success('Promoção adicionada');
  };

  const removePromotion = (id: string) => {
    setPromotions(prev => prev.filter(p => p.id !== id));
  };

  const SearchInput = ({ 
    value, 
    onChange, 
    placeholder, 
    error 
  }: { 
    value: string; 
    onChange: (v: string) => void; 
    placeholder: string; 
    error?: boolean;
  }) => (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input-field pr-10 ${error ? 'error' : ''}`}
      />
      <button 
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted transition-colors"
      >
        <Search className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="card-dashboard">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {isEditing ? 'Editar Produto' : 'Produtos'}
          </h1>
        </div>

        <div className="flex">
          {/* Stepper */}
          <div className="w-64 border-r border-border p-6">
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
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => updateField('code', e.target.value)}
                      placeholder="Ex: PROD001"
                      className={`input-field ${errors.code ? 'error' : ''}`}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Nome do produto"
                      className={`input-field ${errors.name ? 'error' : ''}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Estoque
                    </label>
                    <input
                      type="text"
                      value={formData.stock}
                      onChange={(e) => handleNumericInput('stock', e.target.value)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Referência
                    </label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => updateField('reference', e.target.value)}
                      placeholder="Referência"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código Cat.
                    </label>
                    <input
                      type="text"
                      value={formData.categoryCode}
                      onChange={(e) => updateField('categoryCode', e.target.value)}
                      placeholder="CAT001"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome Categoria
                    </label>
                    <SearchInput
                      value={formData.categoryName}
                      onChange={(v) => updateField('categoryName', v)}
                      placeholder="Buscar categoria"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Preço de Custo
                    </label>
                    <input
                      type="text"
                      value={formData.costPrice}
                      onChange={(e) => handleNumericInput('costPrice', e.target.value)}
                      placeholder="0.00"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Preço de Venda
                    </label>
                    <input
                      type="text"
                      value={formData.salePrice}
                      onChange={(e) => handleNumericInput('salePrice', e.target.value)}
                      placeholder="0.00"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código SKU
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => updateField('sku', e.target.value)}
                      placeholder="SKU001"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      EAN
                    </label>
                    <input
                      type="text"
                      value={formData.ean}
                      onChange={(e) => updateField('ean', e.target.value)}
                      placeholder="7891234567890"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Peso (kg)
                    </label>
                    <input
                      type="text"
                      value={formData.weight}
                      onChange={(e) => handleNumericInput('weight', e.target.value)}
                      placeholder="0.00"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Comprimento (cm)
                    </label>
                    <input
                      type="text"
                      value={formData.length}
                      onChange={(e) => handleNumericInput('length', e.target.value)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Altura (cm)
                    </label>
                    <input
                      type="text"
                      value={formData.height}
                      onChange={(e) => handleNumericInput('height', e.target.value)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Largura (cm)
                    </label>
                    <input
                      type="text"
                      value={formData.width}
                      onChange={(e) => handleNumericInput('width', e.target.value)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      NCM
                    </label>
                    <SearchInput
                      value={formData.ncm}
                      onChange={(v) => updateField('ncm', v)}
                      placeholder="Buscar NCM"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Configurações */}
            {currentStep === 2 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Configurações</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Unidade
                    </label>
                    <SearchInput
                      value={formData.unit}
                      onChange={(v) => updateField('unit', v)}
                      placeholder="Buscar unidade"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição Curta
                    </label>
                    <input
                      type="text"
                      value={formData.shortDescription}
                      onChange={(e) => updateField('shortDescription', e.target.value)}
                      placeholder="Descrição resumida"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descrição Longa
                  </label>
                  <textarea
                    value={formData.longDescription}
                    onChange={(e) => updateField('longDescription', e.target.value)}
                    placeholder="Descrição detalhada do produto"
                    rows={5}
                    className="input-field resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      value={formData.metaTitle}
                      onChange={(e) => updateField('metaTitle', e.target.value)}
                      placeholder="Título para SEO"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Meta Tag
                    </label>
                    <input
                      type="text"
                      value={formData.metaTag}
                      onChange={(e) => updateField('metaTag', e.target.value)}
                      placeholder="Tags para SEO"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={formData.metaDescription}
                    onChange={(e) => updateField('metaDescription', e.target.value)}
                    placeholder="Descrição para SEO"
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Regra Comercial */}
            {currentStep === 3 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Regra Comercial</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código Promoção
                    </label>
                    <SearchInput
                      value={formData.promotionCode}
                      onChange={(v) => updateField('promotionCode', v)}
                      placeholder="Buscar promoção"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome da Promoção
                    </label>
                    <input
                      type="text"
                      value={formData.promotionName}
                      onChange={(e) => updateField('promotionName', e.target.value)}
                      placeholder="Nome da promoção"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Início da Promoção
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.promotionStart}
                        onChange={(e) => updateField('promotionStart', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fim da Promoção
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.promotionEnd}
                        onChange={(e) => updateField('promotionEnd', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddPromotion}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADICIONAR PROMOÇÃO</span>
                </button>

                {promotions.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-foreground mb-3">Promoções Adicionadas</h3>
                    <div className="flex flex-wrap gap-2">
                      {promotions.map(promo => (
                        <div 
                          key={promo.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"
                        >
                          <span>{promo.code} - {promo.name}</span>
                          <button 
                            onClick={() => removePromotion(promo.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Tributação */}
            {currentStep === 4 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Tributação</h2>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Grupo de Tributação
                  </label>
                  <SearchInput
                    value={formData.taxGroup}
                    onChange={(v) => updateField('taxGroup', v)}
                    placeholder="Buscar grupo de tributação"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código NCM
                    </label>
                    <SearchInput
                      value={formData.ncmCode}
                      onChange={(v) => updateField('ncmCode', v)}
                      placeholder="Buscar NCM"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição NCM
                    </label>
                    <input
                      type="text"
                      value={formData.ncmDescription}
                      onChange={(e) => updateField('ncmDescription', e.target.value)}
                      placeholder="Descrição do NCM"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código CEST
                    </label>
                    <SearchInput
                      value={formData.cestCode}
                      onChange={(v) => updateField('cestCode', v)}
                      placeholder="Buscar CEST"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição CEST
                    </label>
                    <input
                      type="text"
                      value={formData.cestDescription}
                      onChange={(e) => updateField('cestDescription', e.target.value)}
                      placeholder="Descrição do CEST"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código PIS
                    </label>
                    <SearchInput
                      value={formData.pisCode}
                      onChange={(v) => updateField('pisCode', v)}
                      placeholder="Buscar PIS"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição PIS
                    </label>
                    <input
                      type="text"
                      value={formData.pisDescription}
                      onChange={(e) => updateField('pisDescription', e.target.value)}
                      placeholder="Descrição do PIS"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código COFINS
                    </label>
                    <SearchInput
                      value={formData.cofinsCode}
                      onChange={(v) => updateField('cofinsCode', v)}
                      placeholder="Buscar COFINS"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição COFINS
                    </label>
                    <input
                      type="text"
                      value={formData.cofinsDescription}
                      onChange={(e) => updateField('cofinsDescription', e.target.value)}
                      placeholder="Descrição do COFINS"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Origem Fiscal
                  </label>
                  <select
                    value={formData.fiscalOrigin}
                    onChange={(e) => updateField('fiscalOrigin', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Selecione a origem fiscal</option>
                    {fiscalOrigins.map(origin => (
                      <option key={origin.value} value={origin.value}>
                        {origin.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 5: Variações */}
            {currentStep === 5 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Variações</h2>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código Tipo
                    </label>
                    <input
                      type="text"
                      value={formData.variationTypeCode}
                      onChange={(e) => updateField('variationTypeCode', e.target.value)}
                      placeholder="Código"
                      className="input-field"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tipo de Variação
                    </label>
                    <SearchInput
                      value={formData.variationType}
                      onChange={(v) => updateField('variationType', v)}
                      placeholder="Buscar tipo de variação"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código SKU
                    </label>
                    <input
                      type="text"
                      value={formData.variationSku}
                      onChange={(e) => updateField('variationSku', e.target.value)}
                      placeholder="SKU da variação"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      EAN
                    </label>
                    <input
                      type="text"
                      value={formData.variationEan}
                      onChange={(e) => updateField('variationEan', e.target.value)}
                      placeholder="EAN da variação"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Peso (kg)
                    </label>
                    <input
                      type="text"
                      value={formData.variationWeight}
                      onChange={(e) => handleNumericInput('variationWeight', e.target.value)}
                      placeholder="0.00"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Comprimento (cm)
                    </label>
                    <input
                      type="text"
                      value={formData.variationLength}
                      onChange={(e) => handleNumericInput('variationLength', e.target.value)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Altura (cm)
                    </label>
                    <input
                      type="text"
                      value={formData.variationHeight}
                      onChange={(e) => handleNumericInput('variationHeight', e.target.value)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Largura (cm)
                    </label>
                    <input
                      type="text"
                      value={formData.variationWidth}
                      onChange={(e) => handleNumericInput('variationWidth', e.target.value)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição Curta
                    </label>
                    <input
                      type="text"
                      value={formData.variationShortDesc}
                      onChange={(e) => updateField('variationShortDesc', e.target.value)}
                      placeholder="Descrição curta da variação"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Local ou Link da Imagem
                    </label>
                    <SearchInput
                      value={formData.variationImageLink}
                      onChange={(v) => updateField('variationImageLink', v)}
                      placeholder="Buscar imagem"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descrição Longa
                  </label>
                  <textarea
                    value={formData.variationLongDesc}
                    onChange={(e) => updateField('variationLongDesc', e.target.value)}
                    placeholder="Descrição detalhada da variação"
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      value={formData.variationMetaTitle}
                      onChange={(e) => updateField('variationMetaTitle', e.target.value)}
                      placeholder="Meta título"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Meta Tag
                    </label>
                    <input
                      type="text"
                      value={formData.variationMetaTag}
                      onChange={(e) => updateField('variationMetaTag', e.target.value)}
                      placeholder="Meta tags"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Meta Description
                    </label>
                    <input
                      type="text"
                      value={formData.variationMetaDesc}
                      onChange={(e) => updateField('variationMetaDesc', e.target.value)}
                      placeholder="Meta descrição"
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Variation Cards Grid */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Imagens da Variação</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {variationCards.map(card => (
                      <div 
                        key={card.id}
                        className="p-4 rounded-lg border border-border bg-muted/30"
                      >
                        <div className="w-full h-24 rounded-lg bg-muted flex items-center justify-center mb-3">
                          <Image className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">{card.description}</p>
                        <p className="text-xs text-muted-foreground">Posição: {card.position}</p>
                        <p className="text-xs text-muted-foreground truncate">{card.url}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Link do Vídeo
                    </label>
                    <input
                      type="text"
                      value={formData.videoLink}
                      onChange={(e) => updateField('videoLink', e.target.value)}
                      placeholder="https://youtube.com/..."
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Outros Links
                    </label>
                    <input
                      type="text"
                      value={formData.otherLinks}
                      onChange={(e) => updateField('otherLinks', e.target.value)}
                      placeholder="Links adicionais"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Integração */}
            {currentStep === 6 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Integração</h2>
                
                <div className="p-6 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Info className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-2">
                        Configuração de integração do produto com outros canais
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Esta seção permite configurar integrações com sistemas externos, 
                        como marketplaces (Mercado Livre, Amazon, etc.), e-commerce 
                        (WooCommerce, Shopify, etc.) e outros ERPs. As configurações 
                        estarão disponíveis após a conclusão do cadastro básico.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-sm text-success font-medium">
                    ✓ Todos os dados foram preenchidos. Clique em Confirmar para salvar o produto.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>
              
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

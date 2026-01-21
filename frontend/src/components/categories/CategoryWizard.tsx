import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Check, X, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { createCategory, getCategoryById, updateCategory, getCategoryByCode } from '@/lib/api/categories';


interface FormData {
  // Step 1: Dados Principais
  code: string;
  name: string;
  parentCode: string;
  parentName: string;
  // Step 2: Detalhes
  metaTitle: string;
  metaTag: string;
  metaDescription: string;
  siteOrder: string;
  siteLink: string;
  description: string;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  parentCode: '',
  parentName: '',
  metaTitle: '',
  metaTag: '',
  metaDescription: '',
  siteOrder: '',
  siteLink: '',
  description: '',
};

const steps = [
  { id: 1, label: 'Dados Principais' },
  { id: 2, label: 'Detalhes' },
  { id: 3, label: 'Integração' },
];

export function CategoryWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const { id } = useParams();
  const isEdit = !!id;

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep1 = () => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (formData.parentCode.trim() && !formData.parentName.trim()) {
      newErrors.parentName = 'Nome da Categoria Pai é obrigatório quando Código Pai está preenchido';
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

  useEffect(() => {
    if (!isEdit) return;

    async function loadCategory() {
      try {
        const cat = await getCategoryById(id!);

        setFormData({
          code: cat.code ?? '',
          name: cat.name ?? "",
          parentCode: cat.parentCode ?? "",
          parentName: cat.parentName ?? "",
          metaTitle: cat.metaTitle ?? "",
          metaTag: cat.metaTag ?? "",
          metaDescription: cat.metaDescription ?? "",
          siteOrder: cat.siteOrder != null ? String(cat.siteOrder) : "",
          siteLink: cat.siteLink ?? "",
          description: cat.description ?? "",
        });

        // libera navegação para os passos (opcional)
        setVisitedSteps([1, 2, 3]);
      } catch (err: any) {
        toast.error(err.message ?? "Erro ao carregar categoria");
        navigate("/catalogo/categorias");
      }
    }

    loadCategory();
  }, [isEdit, id, navigate]);

  async function fetchParentNameByCode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) {
      // Se limpar o código pai, zera o nome do pai também
      setFormData(prev => ({ ...prev, parentName: '' }));
      return;
    }

    try {
      const cat = await getCategoryByCode(trimmed);
      setFormData(prev => ({
        ...prev,
        parentName: cat.name ?? ''
      }));
    } catch (err: any) {
      setFormData(prev => ({ ...prev, parentName: '' }));
      toast.error(err.message ?? 'Categoria pai não encontrada');
    }
  }

  const handleConfirm = async () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
        setVisitedSteps(prev => [...new Set([...prev, 2])]);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
      setVisitedSteps(prev => [...new Set([...prev, 3])]);
    } else if (currentStep === 3) {
      // Save mock data
      // console.log('Saving category:', formData);
      // toast.success('Categoria cadastrada com sucesso');
      // navigate('/catalogo/categorias');
      try {
        if (!isEdit) {
          await createCategory({
            name: formData.name.trim(),
            parentCode: formData.parentCode.trim() ? formData.parentCode.trim() : null,
            parentName: formData.parentName.trim() ? formData.parentName.trim() : null,
            metaTitle: formData.metaTitle.trim() ? formData.metaTitle.trim() : null,
            metaTag: formData.metaTag.trim() ? formData.metaTag.trim() : null,
            metaDescription: formData.metaDescription.trim() ? formData.metaDescription.trim() : null,
            siteOrder: formData.siteOrder.trim() ? Number(formData.siteOrder) : null,
            siteLink: formData.siteLink.trim() ? formData.siteLink.trim() : null,
            description: formData.description.trim() ? formData.description.trim() : null,
          });

          toast.success("Categoria cadastrada com sucesso");
        } else {
          await updateCategory(id!, {
            name: formData.name.trim(),
            parentCode: formData.parentCode.trim() ? formData.parentCode.trim() : null,
            parentName: formData.parentName.trim() ? formData.parentName.trim() : null,
            metaTitle: formData.metaTitle.trim() ? formData.metaTitle.trim() : null,
            metaTag: formData.metaTag.trim() ? formData.metaTag.trim() : null,
            metaDescription: formData.metaDescription.trim() ? formData.metaDescription.trim() : null,
            siteOrder: formData.siteOrder.trim() ? Number(formData.siteOrder) : null,
            siteLink: formData.siteLink.trim() ? formData.siteLink.trim() : null,
            description: formData.description.trim() ? formData.description.trim() : null,
          });

          toast.success("Categoria atualizada com sucesso");
        }

        navigate("/catalogo/categorias");
      } catch (err: any) {
        toast.error(err.message ?? "Erro ao salvar categoria");
      }


    }
  };

  const handleCancel = () => {
    navigate('/catalogo/categorias');
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
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          {/* <h1 className="text-xl font-semibold text-foreground">Categorias</h1> */}
          <h1 className="text-xl font-semibold text-foreground">
            {isEdit ? "Editar Categoria" : "Nova Categoria"}
          </h1>
        </div>

        <div className="flex">
          {/* Stepper */}
          <div className="w-64 border-r border-border p-6">
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isCompleted = visitedSteps.includes(step.id) && step.id < currentStep;
                const isActive = step.id === currentStep;
                const isPending = !visitedSteps.includes(step.id);
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
          <div className="flex-1 p-6">
            {currentStep === 1 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Dados Principais</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={
                        isEdit
                          ? formData.code || ''
                          : 'Gerado automaticamente'
                      }
                      disabled
                      className="input-field opacity-70 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Nome da categoria"
                      className={`input-field ${errors.name ? 'error' : ''}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código Pai
                    </label>
                    <input
                      type="text"
                      value={formData.parentCode}
                      onChange={(e) => updateField('parentCode', e.target.value)}
                      onBlur={(e) => fetchParentNameByCode(e.target.value)}
                      placeholder="Ex: CAT000"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome da Categoria Pai
                      {formData.parentCode && <span className="text-destructive"> *</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.parentName}
                      placeholder="Nome da categoria pai"
                      disabled
                      className={`input-field opacity-70 cursor-not-allowed ${errors.parentName ? 'error' : ''}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Detalhes</h2>
                
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ordem no Site
                    </label>
                    <input
                      type="number"
                      value={formData.siteOrder}
                      onChange={(e) => updateField('siteOrder', e.target.value)}
                      placeholder="Ex: 1"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Link Categoria Site
                    </label>
                    <input
                      type="text"
                      value={formData.siteLink}
                      onChange={(e) => updateField('siteLink', e.target.value)}
                      placeholder="Ex: /categoria/roupas"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descrição Categoria
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Descrição detalhada da categoria"
                    rows={4}
                    className="input-field resize-none"
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Integração</h2>
                
                <div className="p-6 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Info className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-2">
                        Configuração de integração da categoria
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Esta seção permite configurar integrações com sistemas externos, 
                        como marketplaces, e-commerce e outros ERPs. As configurações 
                        estarão disponíveis após a conclusão do cadastro básico.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-sm text-success font-medium">
                    ✓ Todos os dados foram preenchidos. Clique em Confirmar para salvar a categoria.
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

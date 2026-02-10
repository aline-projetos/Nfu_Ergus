import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Receipt, Check, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

import {
  createTaxGroup,
  getTaxGroupById,
  updateTaxGroup,
  CreateTaxGroupInput,
  UpdateTaxGroupInput,
} from '@/lib/api/tax';

interface FormData {
  code: string;
  name: string;
  regime: string;
  TipoProduto: string;
  useICMSST: boolean;
  usePISCOFINS: boolean;
  useISS: boolean;
  active: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  regime: '',
  TipoProduto: '',
  useICMSST: false,
  usePISCOFINS: false,
  useISS: false,
  active: true,
};

const steps = [
  { id: 1, label: 'Dados Principais' },
  { id: 2, label: 'Impostos' },
];

export function TaxGroupWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep1 = () => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.regime.trim()) newErrors.regime = 'Regime é obrigatório';
    if (!formData.TipoProduto.trim())
      newErrors.TipoProduto = 'Tipo de produto é obrigatório';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Object.values(newErrors).forEach(err => err && toast.error(err));
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isEdit) return;

    async function loadTaxGroup() {
      try {
        const tg = await getTaxGroupById(id!);

        setFormData({
          code: tg.code ?? '',
          name: tg.name ?? '',
          regime: tg.regime ?? '',
          TipoProduto: tg.TipoProduto ?? '',
          useICMSST: tg.useICMSST ?? false,
          usePISCOFINS: tg.usePISCOFINS ?? false,
          useISS: tg.useISS ?? false,
          active: tg.active ?? true,
        });

        setVisitedSteps([1, 2]);
      } catch (err: any) {
        toast.error(err.message ?? 'Erro ao carregar grupo de tributação');
        navigate('/fiscal/tributacao/grupos');
      }
    }

    loadTaxGroup();
  }, [isEdit, id, navigate]);

  const handleConfirm = async () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
        setVisitedSteps(prev => [...new Set([...prev, 2])]);
      }
      return;
    }

    // Step 2 -> salvar
    try {
      if (!isEdit) {
        const payload: CreateTaxGroupInput = {
          code: '', // backend gera
          name: formData.name.trim(),
          regime: formData.regime.trim(),
          TipoProduto: formData.TipoProduto.trim(),
          useICMSST: formData.useICMSST,
          usePISCOFINS: formData.usePISCOFINS,
          useISS: formData.useISS,
          active: formData.active,
        };
        await createTaxGroup(payload);
        toast.success('Grupo de tributação cadastrado com sucesso');
      } else {
        const payload: UpdateTaxGroupInput = {
          code: formData.code,
          name: formData.name.trim(),
          regime: formData.regime.trim(),
          TipoProduto: formData.TipoProduto.trim(),
          useICMSST: formData.useICMSST,
          usePISCOFINS: formData.usePISCOFINS,
          useISS: formData.useISS,
          active: formData.active,
          createdAt: '', // será ignorado pelo backend se você não usar
          updatedAt: '', // idem
        } as UpdateTaxGroupInput;

        await updateTaxGroup(id!, payload);
        toast.success('Grupo de tributação atualizado com sucesso');
      }

      navigate('/fiscal/tributacao/grupos');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar grupo de tributação');
    }
  };

  const handleCancel = () => {
    navigate('/fiscal/tributacao/grupos');
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
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {isEdit ? 'Editar Grupo de Tributação' : 'Novo Grupo de Tributação'}
          </h1>
        </div>

        <div className="flex">
          {/* Stepper */}
          <div className="w-64 border-r border-border p-6">
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isCompleted =
                  visitedSteps.includes(step.id) && step.id < currentStep;
                const isActive = step.id === currentStep;
                const canClick =
                  visitedSteps.includes(step.id) && step.id < currentStep;

                return (
                  <div key={step.id}>
                    <button
                      onClick={() => handleStepClick(step.id)}
                      disabled={!canClick}
                      className={`stepper-step w-full ${
                        isCompleted
                          ? 'completed'
                          : isActive
                          ? 'active'
                          : 'pending'
                      } ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div
                        className={`stepper-number ${
                          isCompleted
                            ? 'completed'
                            : isActive
                            ? 'active'
                            : 'pending'
                        }`}
                      >
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
                <h2 className="text-lg font-medium text-foreground mb-6">
                  Dados Principais
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {/* Código */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código
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

                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => updateField('name', e.target.value)}
                      placeholder="Nome do grupo de tributação"
                      className={`input-field ${errors.name ? 'error' : ''}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Regime */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Regime <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={formData.regime}
                      onChange={e => updateField('regime', e.target.value)}
                      className={`input-field ${errors.regime ? 'error' : ''}`}
                    >
                      <option value="">Selecione...</option>
                      <option value="simples_nacional">Simples Nacional</option>
                      <option value="lucro_presumido">Lucro Presumido</option>
                      <option value="lucro_real">Lucro Real</option>
                    </select>
                  </div>

                  {/* Tipo de produto */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tipo de Produto{' '}
                      <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={formData.TipoProduto}
                      onChange={e =>
                        updateField('TipoProduto', e.target.value)
                      }
                      className={`input-field ${
                        errors.TipoProduto ? 'error' : ''
                      }`}
                    >
                      <option value="">Selecione...</option>
                      <option value="produto">Produto</option>
                      <option value="servico">Serviço</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Ativo
                  </label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.active}
                      onCheckedChange={checked =>
                        updateField('active', Boolean(checked))
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      Grupo disponível para uso nos produtos
                    </span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">
                  Impostos
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        ICMS ST
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Habilite se o grupo utilizar substituição tributária.
                      </p>
                    </div>
                    <Switch
                      checked={formData.useICMSST}
                      onCheckedChange={checked =>
                        updateField('useICMSST', Boolean(checked))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        PIS/COFINS
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Indica se haverá tratamento específico de PIS/COFINS.
                      </p>
                    </div>
                    <Switch
                      checked={formData.usePISCOFINS}
                      onCheckedChange={checked =>
                        updateField('usePISCOFINS', Boolean(checked))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        ISS
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Use para grupos que representam serviços sujeitos a ISS.
                      </p>
                    </div>
                    <Switch
                      checked={formData.useISS}
                      onCheckedChange={checked =>
                        updateField('useISS', Boolean(checked))
                      }
                    />
                  </div>
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
                <span>
                  {currentStep === 2 ? 'Confirmar' : 'Próximo'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

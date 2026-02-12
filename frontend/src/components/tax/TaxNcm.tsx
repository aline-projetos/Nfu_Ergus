import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Receipt, Check, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

import {
  createNcm,
  CreateNcmInput,
  listNcm,
  deleteNcm,
  updateNcm,
  UpdateNcmInput,
  getNcmById
} from '@/lib/api/taxNcm';

interface FormData {
  code: string;
  description: string;
  exVersion: string;  
}

const initialFormData: FormData = {
  code: '',
  description: '',
  exVersion: '',
};

const steps = [
  { id: 1, label: 'Dados Principais' }
];

export function NcmWizard() {
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

    if (!formData.code.trim()) newErrors.code = 'Codigo é obrigatório';
    if (!formData.description.trim()) newErrors.description = 'Descrição é obrigatório';
    if (!formData.exVersion.trim())
      newErrors.exVersion = 'exVerion é obrigatório';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Object.values(newErrors).forEach(err => err && toast.error(err));
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isEdit) return;

    async function loadNcm() {
      try {
        const tg = await getNcmById(id!);

        setFormData({
          code: tg.code ?? '',
          description: tg.description ?? '',
          exVersion: tg.exVersion ?? '',
        });

        setVisitedSteps([1, 2]);
      } catch (err: any) {
        toast.error(err.message ?? 'Erro ao carregar grupo de tributação');
        navigate('/fiscal/ncm');
      }
    }

    loadNcm();
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
        const payload: CreateNcmInput = {
          code: formData.code,
          description: formData.description.trim(),
          exVersion: formData.exVersion.trim(),
        };
        await createNcm(payload);
        toast.success('Ncm cadastrado com sucesso');
      } else {
        const payload: UpdateNcmInput = {
          code: formData.code,
          description: formData.description.trim(),
          exVersion: formData.exVersion.trim(),
        } as UpdateNcmInput;

        await updateNcm(id!, payload);
        toast.success('Grupo de tributação atualizado com sucesso');
      }

      navigate('/fiscal/ncm');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar ncm');
    }
  };

  const handleCancel = () => {
    navigate('/fiscal/ncm');
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
                      Código <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={e => updateField('code', e.target.value)}
                      placeholder="Código do ncm"
                      className={`input-field ${errors.code ? 'error' : ''}`}
                    />
                  </div>

                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={e => updateField('description', e.target.value)}
                      placeholder="Descrição do ncm"
                      className={`input-field ${errors.description ? 'error' : ''}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Regime */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      ex Version <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.exVersion}
                      onChange={e => updateField('exVersion', e.target.value)}
                      placeholder="ex Version"
                      className={`input-field ${errors.exVersion ? 'error' : ''}`}
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

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Factory, Check, X, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Manufacturer, getManufacturerById, createManufacturer, updateManufacturer } from '@/lib/api/manufacturers';

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface FormData {
  // Identificação
  codigo: string;
  nome: string;
  tipo: 'fisica' | 'juridica';
  // Documentos
  cnpj: string;
  inscricaoEstadual: string;
  // Contato Principal
  contatoPrincipalNome: string;
  contatoPrincipalTelefone: string;
  contatoPrincipalEmail: string;
  // Contato Secundário / Endereço
  cep: string;
  contatoSecundarioNome: string;
  contatoSecundarioTelefone: string;
  contatoSecundarioEmail: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  // Localização
  codigoCidade: string;
  nomeCidade: string;
  uf: string;
  // Outros
  observacoes: string;
  // Status
  ativo: boolean;
}

const initialFormData: FormData = {
  codigo: '',
  nome: '',
  tipo: 'juridica',
  cnpj: '',
  inscricaoEstadual: '',
  contatoPrincipalNome: '',
  contatoPrincipalTelefone: '',
  contatoPrincipalEmail: '',
  cep: '',
  contatoSecundarioNome: '',
  contatoSecundarioTelefone: '',
  contatoSecundarioEmail: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  codigoCidade: '',
  nomeCidade: '',
  uf: '',
  observacoes: '',
  ativo: true,
};

const steps = [
  { id: 1, label: 'Dados Principais' },
  { id: 2, label: 'Integração' },
];

export function ManufacturerWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEditing || !id) return;

    async function load() {
      try {
        setLoading(true);
        const m: Manufacturer = await getManufacturerById(id);

        setFormData({
          codigo: m.codigo || '',
          nome: m.nome || '',
          tipo: (m.tipo as 'fisica' | 'juridica') || 'juridica',
          cnpj: m.cnpj || '',
          inscricaoEstadual: m.inscricao_estadual || '',
          contatoPrincipalNome: m.contatoPrincipalNome || '',
          contatoPrincipalTelefone: m.contatoPrincipalTelefone || '',
          contatoPrincipalEmail: m.contatoPrincipalEmail || '',
          cep: m.cep || '',
          contatoSecundarioNome: m.contatoSecundarioNome || '',
          contatoSecundarioTelefone: m.contatoSecundarioTelefone || '',
          contatoSecundarioEmail: m.contatoSecundarioEmail || '',
          logradouro: m.logradouro || '',
          numero: m.numero || '',
          complemento: m.complemento || '',
          bairro: m.bairro || '',
          codigoCidade: m.codigoCidade || '',
          nomeCidade: m.cidade || '',
          uf: m.uf || '',
          observacoes: m.observacoes || '',
          ativo: m.ativo,
        });

        setVisitedSteps([1, 2]);
      } catch (err: any) {
        toast.error(err.message ?? 'Erro ao carregar fabricante');
        navigate('/catalogo/fabricantes');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isEditing, id, navigate]);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhoneInput = (field: keyof FormData, value: string) => {
    const numericValue = value.replace(/\D/g, '');
    updateField(field, numericValue);
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateStep1 = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome do fabricante é obrigatório';
    }

    if (!formData.tipo) {
      newErrors.tipo = 'Tipo de fabricante é obrigatório';
    }

    if (formData.tipo === 'juridica' && !formData.cnpj.trim()) {
      newErrors.cnpj = 'CNPJ é obrigatório para Pessoa Jurídica';
    }

    if (formData.contatoPrincipalEmail && !validateEmail(formData.contatoPrincipalEmail)) {
      newErrors.contatoPrincipalEmail = 'E-mail inválido';
    }

    if (formData.contatoSecundarioEmail && !validateEmail(formData.contatoSecundarioEmail)) {
      newErrors.contatoSecundarioEmail = 'E-mail inválido';
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

      const payload = {
        nome: formData.nome.trim(),
        tipo: formData.tipo,
        cnpj: formData.cnpj.trim() || null,
        inscricao_estadual: formData.inscricaoEstadual.trim() || null,

        contatoPrincipalNome: formData.contatoPrincipalNome.trim() || null,
        contatoPrincipalTelefone: formData.contatoPrincipalTelefone.trim() || null,
        contatoPrincipalEmail: formData.contatoPrincipalEmail.trim() || null,

        contatoSecundarioNome: formData.contatoSecundarioNome.trim() || null,
        contatoSecundarioTelefone: formData.contatoSecundarioTelefone.trim() || null,
        contatoSecundarioEmail: formData.contatoSecundarioEmail.trim() || null,

        cep: formData.cep.trim() || null,
        logradouro: formData.logradouro.trim() || null,
        numero: formData.numero.trim() || null,
        complemento: formData.complemento.trim() || null,
        bairro: formData.bairro.trim() || null,

        codigoCidade: formData.codigoCidade.trim() || null,
        cidade: formData.nomeCidade.trim() || '',
        uf: formData.uf.trim() || '',

        observacoes: formData.observacoes.trim() || null,

        ativo: formData.ativo,
      };

      if (!payload.cidade) {
        throw new Error('Cidade é obrigatória');
      }
      if (!payload.uf) {
        throw new Error('UF é obrigatória');
      }

      if (!isEditing) {
        // criação -> sempre ativo
        payload.ativo = true;
        await createManufacturer(payload);
        toast.success('Fabricante cadastrado com sucesso');
      } else if (id) {
        // edição -> preserva o ativo atual do form
        await updateManufacturer(id, payload);
        toast.success('Fabricante atualizado com sucesso');
      }

      navigate('/catalogo/fabricantes');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar fabricante');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/catalogo/fabricantes');
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
            <Factory className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {isEditing ? 'Editar Fabricante' : 'Adicionar Fabricante'}
            </h1>
            <p className="text-sm text-muted-foreground">Cadastro</p>
          </div>
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
          <div className="flex-1 p-6 min-h-[600px]">
            {/* Step 1 */}
            {currentStep === 1 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Dados Principais</h2>

                {/* Identificação */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Identificação</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Código do Fabricante
                      </label>
                      <input
                        type="text"
                        value={
                          isEditing
                            ? formData.codigo || ''
                            : 'Gerado automaticamente'
                        }
                        disabled
                        className="input-field opacity-70 cursor-not-allowed"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nome do Fabricante <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => updateField('nome', e.target.value)}
                        placeholder="Nome do fabricante"
                        className={`input-field ${errors.nome ? 'error' : ''}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tipo de Fabricante <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={formData.tipo}
                        onChange={(e) => updateField('tipo', e.target.value as 'fisica' | 'juridica')}
                        className={`input-field ${errors.tipo ? 'error' : ''}`}
                      >
                        <option value="juridica">Pessoa Jurídica</option>
                        <option value="fisica">Pessoa Física</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Documentos */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Documentos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        CNPJ do Fabricante {formData.tipo === 'juridica' && <span className="text-destructive">*</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.cnpj}
                        onChange={(e) => updateField('cnpj', e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className={`input-field ${errors.cnpj ? 'error' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Inscrição Estadual do Fabricante
                      </label>
                      <input
                        type="text"
                        value={formData.inscricaoEstadual}
                        onChange={(e) => updateField('inscricaoEstadual', e.target.value)}
                        placeholder="000.000.000.000"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* Contato Principal */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Contato Principal</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nome do Contato
                      </label>
                      <input
                        type="text"
                        value={formData.contatoPrincipalNome}
                        onChange={(e) => updateField('contatoPrincipalNome', e.target.value)}
                        placeholder="Nome do contato"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={formData.contatoPrincipalTelefone}
                        onChange={(e) => handlePhoneInput('contatoPrincipalTelefone', e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={formData.contatoPrincipalEmail}
                        onChange={(e) => updateField('contatoPrincipalEmail', e.target.value)}
                        placeholder="email@exemplo.com"
                        className={`input-field ${errors.contatoPrincipalEmail ? 'error' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Contato Secundário / Endereço */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Contato Secundário / Endereço</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={formData.cep}
                        onChange={(e) => updateField('cep', e.target.value)}
                        placeholder="00000-000"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nome do Contato
                      </label>
                      <input
                        type="text"
                        value={formData.contatoSecundarioNome}
                        onChange={(e) => updateField('contatoSecundarioNome', e.target.value)}
                        placeholder="Nome do contato"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={formData.contatoSecundarioTelefone}
                        onChange={(e) => handlePhoneInput('contatoSecundarioTelefone', e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={formData.contatoSecundarioEmail}
                        onChange={(e) => updateField('contatoSecundarioEmail', e.target.value)}
                        placeholder="email@exemplo.com"
                        className={`input-field ${errors.contatoSecundarioEmail ? 'error' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Endereço
                      </label>
                      <input
                        type="text"
                        value={formData.logradouro}
                        onChange={(e) => updateField('logradouro', e.target.value)}
                        placeholder="Rua, Avenida, etc."
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Número
                      </label>
                      <input
                        type="text"
                        value={formData.numero}
                        onChange={(e) => updateField('numero', e.target.value)}
                        placeholder="Nº"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* Localização */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Localização</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Código da Cidade
                      </label>
                      <input
                        type="text"
                        value={formData.codigoCidade}
                        onChange={(e) => updateField('codigoCidade', e.target.value)}
                        placeholder="Código IBGE"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nome da Cidade
                      </label>
                      <input
                        type="text"
                        value={formData.nomeCidade}
                        onChange={(e) => updateField('nomeCidade', e.target.value)}
                        placeholder="Nome da cidade"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        UF
                      </label>
                      <select
                        value={formData.uf}
                        onChange={(e) => updateField('uf', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Selecione...</option>
                        {brazilianStates.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Outros</h3>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Observações
                    </label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => updateField('observacoes', e.target.value)}
                      placeholder="Observações adicionais sobre o fabricante"
                      rows={4}
                      className="input-field resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Integração */}
            {currentStep === 2 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Integração</h2>

                <div className="p-6 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Info className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-2">
                        Configuração de integração do fabricante
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Configuração de integração do fabricante com outros módulos ou sistemas externos.
                        Esta seção permite configurar integrações com ERPs, marketplaces e outros sistemas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-sm text-success font-medium">
                    ✓ Todos os dados foram preenchidos. Clique em Confirmar para salvar o fabricante.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>

              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? 'Salvando...' : 'Confirmar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

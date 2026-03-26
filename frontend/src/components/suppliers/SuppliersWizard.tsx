import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Truck, Check, X, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  createSupplier,
  getSupplierById,
  updateSupplier,
  Supplier,
} from '@/lib/api/suppliers';
import { pesquisacep } from '@/lib/api/consulta_cep';


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
  // Documentos (PF)
  cpf: string;
  rg: string;
  // Documentos (PJ)
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
}

const initialFormData: FormData = {
  codigo: '',
  nome: '',
  tipo: 'juridica',
  cpf: '',
  rg: '',
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
};

const steps = [
  { id: 1, label: 'Dados Principais' },
  { id: 2, label: 'Integração' },
];

export function SupplierWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing || !id) return;

    async function loadSupplier() {
      try {
        const supplier: Supplier = await getSupplierById(id);

        setFormData({
          codigo: supplier.codigo || '',
          nome: supplier.nome || '',
          tipo: supplier.tipo || 'juridica',
          cpf: supplier.cpf || '',
          rg: supplier.rg || '',
          cnpj: supplier.cnpj || '',
          inscricaoEstadual: supplier.inscricao_estadual || '',
          contatoPrincipalNome: supplier.contato_principal_nome || '',
          contatoPrincipalTelefone: supplier.telefone || '',
          contatoPrincipalEmail: supplier.email || '',
          cep: supplier.cep || '',
          contatoSecundarioNome: supplier.contato_secundario_nome || '',
          contatoSecundarioTelefone: supplier.contato_secundario_telefone || '',
          contatoSecundarioEmail: supplier.contato_secundario_email || '',
          logradouro: supplier.logradouro || '',
          numero: supplier.numero || '',
          complemento: supplier.complemento || '',
          bairro: supplier.bairro || '',
          codigoCidade: supplier.codigo_cidade || '',
          nomeCidade: supplier.cidade || '',
          uf: supplier.uf || '',
          observacoes: supplier.observacoes || '',
        });

        setVisitedSteps([1, 2]);
      } catch (err: any) {
        toast.error(err?.message ?? 'Erro ao carregar fornecedor');
        navigate('/catalogo/fornecedores');
      }
    }

    loadSupplier();
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
      newErrors.nome = 'Nome do fornecedor é obrigatório';
    }

    if (!formData.tipo) {
      newErrors.tipo = 'Tipo de fornecedor é obrigatório';
    }

    if (formData.tipo === 'fisica') {
      if (!formData.cpf.trim()) {
        newErrors.cpf = 'CPF é obrigatório para Pessoa Física';
      }
      if (!formData.rg.trim()) {
        newErrors.rg = 'RG é obrigatório para Pessoa Física';
      }
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

    // Step 2 → salvar no backend
    const payload = {
      codigo: formData.codigo.trim() || null,
      nome: formData.nome.trim(),
      tipo: formData.tipo,
      cpf: formData.tipo === 'fisica' ? formData.cpf.trim() || null : null,
      rg: formData.tipo === 'fisica' ? formData.rg.trim() || null : null,
      cnpj: formData.tipo === 'juridica' ? formData.cnpj.trim() || null : null,
      inscricao_estadual:
        formData.tipo === 'juridica'
          ? formData.inscricaoEstadual.trim() || null
          : null,
      telefone: formData.contatoPrincipalTelefone.trim() || null,
      email: formData.contatoPrincipalEmail.trim() || null,
      cep: formData.cep.trim() || null,
      logradouro: formData.logradouro.trim() || null,
      numero: formData.numero.trim() || null,
      complemento: formData.complemento.trim() || null,
      bairro: formData.bairro.trim() || null,
      cidade: formData.nomeCidade.trim() || null,
      codigo_cidade: formData.codigoCidade.trim() || null,
      uf: formData.uf.trim() || null,
      observacoes: formData.observacoes.trim() || null,
      contato_principal_nome: formData.contatoPrincipalNome.trim() || null,
      contato_secundario_nome: formData.contatoSecundarioNome.trim() || null,
      contato_secundario_telefone: formData.contatoSecundarioTelefone.trim() || null,
      contato_secundario_email: formData.contatoSecundarioEmail.trim() || null,
    };

    try {
      setSaving(true);

      if (isEditing && id) {
        await updateSupplier(id, payload);
        toast.success('Fornecedor atualizado com sucesso');
      } else {
        await createSupplier(payload);
        toast.success('Fornecedor cadastrado com sucesso');
      }

      navigate('/catalogo/fornecedores');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar fornecedor');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/catalogo/fornecedores');
  };

  const handleStepClick = (stepId: number) => {
    if (visitedSteps.includes(stepId) && stepId < currentStep) {
      setCurrentStep(stepId);
    }
  };

  const handleCepBlur = async () => {
  const cep = formData.cep.replace(/\D/g, '');

  if (!cep) return; // se estiver vazio, não faz nada

  try {
    const data = await pesquisacep(cep);

    if (!data) {
      toast.error('CEP não encontrado');
      return;
    }

    // Preenche os campos do endereço com o retorno da API
    setFormData(prev => ({
      ...prev,
      logradouro: data.logradouro || prev.logradouro,
      bairro: data.bairro || prev.bairro,
      nomeCidade: data.localidade || prev.nomeCidade,
      uf: data.uf || prev.uf,
      codigoCidade: data.gia || data.ibge,
    }));
  } catch (error: any) {
    toast.error(error?.message ?? 'Erro ao consultar CEP');
  }
};


  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="card-dashboard">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {isEditing ? 'Editar Fornecedor' : 'Adicionar Fornecedor'}
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
            {/* Step 1: Dados Principais */}
            {currentStep === 1 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">Dados Principais</h2>

                {/* Identificação */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Identificação</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Código do Fornecedor
                      </label>
                      <input
                        type="text"
                        value={formData.codigo}
                        onChange={(e) => updateField('codigo', e.target.value)}
                        placeholder="Ex: FORN001"
                        className="input-field"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nome do Fornecedor <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => updateField('nome', e.target.value)}
                        placeholder="Nome do fornecedor"
                        className={`input-field ${errors.nome ? 'error' : ''}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tipo de Fornecedor <span className="text-destructive">*</span>
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
                  {formData.tipo === 'fisica' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          CPF do Fornecedor <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.cpf}
                          onChange={(e) => updateField('cpf', e.target.value)}
                          placeholder="000.000.000-00"
                          className={`input-field ${errors.cpf ? 'error' : ''}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          RG do Fornecedor <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.rg}
                          onChange={(e) => updateField('rg', e.target.value)}
                          placeholder="00.000.000-0"
                          className={`input-field ${errors.rg ? 'error' : ''}`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          CNPJ do Fornecedor
                        </label>
                        <input
                          type="text"
                          value={formData.cnpj}
                          onChange={(e) => updateField('cnpj', e.target.value)}
                          placeholder="00.000.000/0001-00"
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Inscrição Estadual
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
                  )}
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
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Contato Secundário</h3>
                  <div className="grid grid-cols-3 gap-4">
                    
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
                  </div>

                </div>

                {/* Localização */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Localização</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={formData.cep}
                        onChange={(e) => updateField('cep', e.target.value)}
                        onBlur={handleCepBlur}    
                        placeholder="00000-000"
                        className="input-field"
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
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Código da Cidade (GIA)
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
                      placeholder="Observações adicionais sobre o fornecedor"
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
                        Configuração de integração do fornecedor
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Configuração de integração do fornecedor com outros módulos ou sistemas externos.
                        Esta seção permite configurar integrações com ERPs, marketplaces e outros sistemas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-sm text-success font-medium">
                    ✓ Todos os dados foram preenchidos. Clique em Confirmar para salvar o fornecedor.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>

              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : 'Confirmar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

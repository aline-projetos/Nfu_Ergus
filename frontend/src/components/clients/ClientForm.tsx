import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAuthHeaders, getBaseUrl, getTokenKey } from '@/lib/utils';

interface FormData {
  name: string;
  document: string;
  document_type: 'CPF' | 'CNPJ' | '';
  ativo: boolean;
}

const initialFormData: FormData = {
  name: '',
  document: '',
  document_type: '',
  ativo: true,
};

const documentTypes = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
];

export function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);

  useEffect(() => {
    const fetchClient = async () => {
      if (!isEdit || !id) return;
      setIsLoading(true);

      try {
        const token = getTokenKey();

        const resp = await fetch(`${getBaseUrl()}/tenants/${id}`, {
          headers: getAuthHeaders(),
        });

        if (!resp.ok) {
          if (resp.status === 404) {
            toast.error('Cliente não encontrado');
            navigate('/cadastros/admin/clientes');
            return;
          }
          const text = await resp.text();
          throw new Error(text || 'Erro ao buscar cliente');
        }

        const data: {
          id: string;
          name: string;
          document: string;
          documentType: 'CPF' | 'CNPJ';
          ativo: boolean;
        } = await resp.json();

        setFormData({
          name: data.name ?? '',
          document: data.document ?? '',
          document_type: data.documentType ?? '',
          ativo: data.ativo ?? true,
        });
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Erro ao carregar dados do cliente');
        navigate('/cadastros/admin/clientes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [isEdit, id, navigate]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!formData.document.trim()) {
      newErrors.document = 'Documento é obrigatório';
    }
    if (!formData.document_type) {
      newErrors.document_type = 'Tipo de documento é obrigatório';
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

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const token = getTokenKey();

      const payload = {
        name: formData.name.trim(),
        document: formData.document.trim(),
        documentType: formData.document_type, // 👈 backend espera documentType
        ativo: formData.ativo,
      };

      const url = isEdit && id
        ? `${getBaseUrl()}/tenants/${id}`
        : `${getBaseUrl()}/tenants`;

      const method = isEdit ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao salvar cliente');
      }

      if (isEdit) {
        toast.success('Cliente atualizado com sucesso');
      } else {
        toast.success('Cliente cadastrado com sucesso');
      }

      navigate('/cadastros/admin/clientes');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/cadastros/admin/clientes');
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="card-dashboard">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {isEdit ? 'Editar Cliente' : 'Adicionar Cliente'}
          </h1>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando dados do cliente...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nome do cliente <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Nome completo ou razão social"
                    className={`input-field ${errors.name ? 'error' : ''}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Documento <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.document}
                    onChange={(e) => updateField('document', e.target.value)}
                    placeholder="CPF ou CNPJ"
                    className={`input-field ${errors.document ? 'error' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tipo de documento <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData.document_type}
                    onValueChange={(value) => updateField('document_type', value as 'CPF' | 'CNPJ')}
                  >
                    <SelectTrigger className={errors.document_type ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => updateField('ativo', checked)}
                />
                <label className="text-sm font-medium text-foreground">
                  Cliente ativo
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
                
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  type="button"
                  disabled={isSaving}
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { InputSwitch } from 'primereact/inputswitch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAuthHeaders, getBaseUrl } from '@/lib/utils';
import { useForm } from '@/hooks/useForm';
import { FormField } from '@/components/ui/FormField';
import { PageHeaderCard } from '@/components/ui/PageHeaderCard';
import { ActionButtons } from '@/components/ui/ActionButtons';

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

  const { formData, setFormData, errors, setErrors, updateField } = useForm<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);

  useEffect(() => {
    const fetchClient = async () => {
      if (!isEdit || !id) return;
      setIsLoading(true);

      try {
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

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.document.trim()) newErrors.document = 'Documento é obrigatório';
    if (!formData.document_type) newErrors.document_type = 'Tipo de documento é obrigatório';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Object.values(newErrors).forEach(error => { if (error) toast.error(error); });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        document: formData.document.trim(),
        documentType: formData.document_type,
        ativo: formData.ativo,
      };

      const url = isEdit && id
        ? `${getBaseUrl()}/tenants/${id}`
        : `${getBaseUrl()}/tenants`;

      const resp = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao salvar cliente');
      }

      toast.success(isEdit ? 'Cliente atualizado com sucesso' : 'Cliente cadastrado com sucesso');
      navigate('/cadastros/admin/clientes');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="card-dashboard">
        <PageHeaderCard
          icon={<Users className="w-5 h-5 text-primary" />}
          title={isEdit ? 'Editar Cliente' : 'Adicionar Cliente'}
        />

        <div className="p-6 space-y-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando dados do cliente...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nome do cliente" required error={errors.name} className="col-span-2">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Nome completo ou razão social"
                    className={`input-field ${errors.name ? 'error' : ''}`}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Documento" required error={errors.document}>
                  <input
                    type="text"
                    value={formData.document}
                    onChange={(e) => updateField('document', e.target.value)}
                    placeholder="CPF ou CNPJ"
                    className={`input-field ${errors.document ? 'error' : ''}`}
                  />
                </FormField>

                <FormField label="Tipo de documento" required error={errors.document_type}>
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
                </FormField>
              </div>

              <div className="flex items-center gap-3">
                <InputSwitch
                  checked={formData.ativo}
                  onChange={(e) => updateField('ativo', e.value ?? false)}
                />
                <label className="text-sm font-medium text-foreground">
                  Cliente ativo
                </label>
              </div>

              <ActionButtons
                onCancel={() => navigate('/cadastros/admin/clientes')}
                onConfirm={handleSave}
                confirmLabel="Salvar"
                isLoading={isSaving}
                loadingLabel="Salvando..."
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

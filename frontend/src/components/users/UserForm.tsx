import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { InputSwitch } from 'primereact/inputswitch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { userTypes } from '@/data/mockUsers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getAuthHeaders, getBaseUrl } from '@/lib/utils';
import { useForm } from '@/hooks/useForm';
import { FormField } from '@/components/ui/FormField';
import { PageHeaderCard } from '@/components/ui/PageHeaderCard';
import { ActionButtons } from '@/components/ui/ActionButtons';

interface FormData {
  tenantId: string;
  codigo: string;
  username: string;
  useremail: string;
  type: string;
  ativo: boolean;
}

interface TenantOption {
  id: string;
  name: string;
}

const initialFormData: FormData = {
  tenantId: '',
  codigo: '',
  username: '',
  useremail: '',
  type: '',
  ativo: true,
};

const buildHeaders = (options?: { targetTenantId?: string }) => {
  const token = localStorage.getItem('ergus_token');
  const isSuperAdmin = JSON.parse(localStorage.getItem('ergus_user') || '{}').isSuperAdmin;
  const tenantId = JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const headerTenantId = isSuperAdmin ? options?.targetTenantId : tenantId;
  if (headerTenantId) headers['X-Tenant-ID'] = headerTenantId;

  return headers;
};

export function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { formData, setFormData, errors, setErrors, updateField } = useForm<FormData>(initialFormData);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const loggedUser = JSON.parse(localStorage.getItem('ergus_user') || '{}');
  const tenantId: string | undefined = loggedUser?.tenantId;
  const hideTenantField = !isEdit && !!tenantId;

  useEffect(() => {
    if (!isEdit && tenantId) {
      setFormData(prev => ({ ...prev, tenantId }));
    }
  }, [isEdit, tenantId]);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const resp = await fetch(`${getBaseUrl()}/tenants`, { headers: getAuthHeaders() });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || 'Erro ao buscar tenants');
        }
        const data: Array<{ id: string; name: string }> = await resp.json();
        setTenants(data.map(t => ({ id: t.id, name: t.name })));
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Erro ao carregar lista de clientes');
      }
    };
    fetchTenants();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!isEdit || !id) return;
      setIsLoading(true);
      try {
        const resp = await fetch(`${getBaseUrl()}/users/${id}`, { headers: getAuthHeaders() });
        if (!resp.ok) {
          if (resp.status === 404) {
            toast.error('Usuário não encontrado');
            navigate('/cadastros/admin/usuarios');
            return;
          }
          const text = await resp.text();
          throw new Error(text || 'Erro ao buscar usuário');
        }
        const data: {
          id: string;
          tenantId?: string | null;
          codigo?: number | null;
          username: string;
          type: string;
          isSuperAdmin: boolean;
          ativo: boolean;
        } = await resp.json();

        setFormData({
          tenantId: data.tenantId ?? '',
          codigo: data.codigo != null ? String(data.codigo) : '',
          username: data.username ?? '',
          useremail: data.username ?? '',
          type: data.type ?? '',
          ativo: data.ativo ?? true,
        });
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Erro ao carregar dados do usuário');
        navigate('/cadastros/admin/usuarios');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [isEdit, id, navigate]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    const effectiveTenantId = !isEdit && tenantId ? tenantId : formData.tenantId;

    if (!effectiveTenantId) newErrors.tenantId = 'Cliente (tenant) é obrigatório';
    if (!formData.username.trim()) newErrors.username = 'Usuário é obrigatório';
    if (!formData.useremail.trim()) newErrors.useremail = 'Email é obrigatório';
    if (!formData.type) newErrors.type = 'Tipo é obrigatório';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Object.values(newErrors).forEach(error => error && toast.error(error));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const effectiveTenantId = !isEdit && tenantId ? tenantId : formData.tenantId;
      const payload = {
        tenantId: effectiveTenantId,
        username: formData.username.trim(),
        useremail: formData.useremail.trim(),
        type: formData.type,
        ativo: formData.ativo,
      };

      const url = isEdit && id ? `${getBaseUrl()}/users/${id}` : `${getBaseUrl()}/users`;
      const resp = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: buildHeaders({ targetTenantId: effectiveTenantId }),
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao salvar usuário');
      }

      const data = await resp.json() as { id: string; password?: string };
      if (!isEdit && data.password) {
        setGeneratedPassword(data.password);
        setShowPasswordDialog(true);
      } else {
        toast.success('Usuário atualizado com sucesso');
        navigate('/cadastros/admin/usuarios');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar usuário');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="card-dashboard">
        <PageHeaderCard
          icon={<UserCog className="w-5 h-5 text-primary" />}
          title={isEdit ? 'Editar Usuário' : 'Adicionar Usuário'}
        />

        <div className="p-6 space-y-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando dados do usuário...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {!hideTenantField && (
                  <FormField label="Cliente (tenant)" required error={errors.tenantId}>
                    <Select
                      value={isEdit ? (formData.tenantId || undefined) : (tenantId || formData.tenantId || undefined)}
                      onValueChange={(value) => {
                        if (!isEdit && tenantId) return;
                        updateField('tenantId', value);
                      }}
                      disabled={!isEdit && !!tenantId}
                    >
                      <SelectTrigger className={errors.tenantId ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}

                <FormField label="Código">
                  <input
                    type="text"
                    value={formData.codigo}
                    readOnly
                    disabled
                    placeholder="Gerado automaticamente"
                    className="input-field bg-muted cursor-not-allowed"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Usuário" required error={errors.username}>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    placeholder="Nome de usuário"
                    className={`input-field ${errors.username ? 'error' : ''}`}
                  />
                </FormField>

                <FormField label="Email" required error={errors.useremail}>
                  <input
                    type="email"
                    value={formData.useremail}
                    onChange={(e) => updateField('useremail', e.target.value)}
                    placeholder="email@empresa.com"
                    className={`input-field ${errors.useremail ? 'error' : ''}`}
                  />
                </FormField>

                <FormField label="Tipo" required error={errors.type}>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => updateField('type', value)}
                  >
                    <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {userTypes.map((type) => (
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
                  Usuário ativo
                </label>
              </div>

              <ActionButtons
                onCancel={() => navigate('/cadastros/admin/usuarios')}
                onConfirm={handleSave}
                confirmLabel="Salvar"
                isLoading={isSaving}
                loadingLabel="Salvando..."
              />
            </>
          )}
        </div>
      </div>

      <AlertDialog open={showPasswordDialog} onOpenChange={(open) => {
        setShowPasswordDialog(open);
        if (!open) navigate('/cadastros/admin/usuarios');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Senha gerada para o usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Guarde esta senha com segurança. Ela não poderá ser exibida novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 p-3 rounded-lg bg-muted font-mono text-center text-lg">
            {generatedPassword}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (generatedPassword) {
                  navigator.clipboard.writeText(generatedPassword).catch(() => {});
                  toast.success('Senha copiada para área de transferência');
                }
              }}
            >
              Copiar senha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

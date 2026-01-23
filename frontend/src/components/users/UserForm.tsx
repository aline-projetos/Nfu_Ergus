import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserCog, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
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


interface FormData {
  tenantId: string;
  codigo: string;      // só exibição, vindo do backend
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

const API_BASE_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'ergus_token';

export function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const sessionTenantId: string | undefined =
    JSON.parse(localStorage.getItem('ergus_user') || '{}').tenantId;
  const hideTenantField = !isEdit && !!sessionTenantId;

  useEffect(() => {
    if (!isEdit && sessionTenantId) {
      setFormData(prev => ({
        ...prev,
        tenantId: sessionTenantId,
      }));
    }
  }, [isEdit, sessionTenantId]);

  // Carrega tenants
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const resp = await fetch(`${API_BASE_URL}/tenants`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(sessionTenantId ? { 'X-Tenant-ID': sessionTenantId } : {}),
          },
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || 'Erro ao buscar usuarios');
        }

        const data: Array<{ id: string; name: string }> = await resp.json();
        setTenants(data.map(t => ({ id: t.id, name: t.name })));
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Erro ao carregar lista de usuarios');
      }
    };

    fetchTenants();
  }, []);

  // Carrega usuário se for edição
  useEffect(() => {
    const fetchUser = async () => {
      if (!isEdit || !id) return;
      setIsLoading(true);

      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const resp = await fetch(`${API_BASE_URL}/users/${id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(sessionTenantId ? { 'X-Tenant-ID': sessionTenantId } : {}),
          },
        });

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

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    const effectiveTenantId = !isEdit && sessionTenantId
      ? sessionTenantId
      : formData.tenantId;

    if (!effectiveTenantId) {
      newErrors.tenantId = 'Cliente (tenant) é obrigatório';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Usuário é obrigatório';
    }
    if (!formData.useremail.trim()) {
      newErrors.useremail = 'Email é obrigatório';
    }
    if (!formData.type) {
      newErrors.type = 'Tipo é obrigatório';
    }

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
      const token = localStorage.getItem(TOKEN_KEY);

      const effectiveTenantId = !isEdit && sessionTenantId
        ? sessionTenantId
        : formData.tenantId;

      const payload = {
        tenantId: formData.tenantId, 
        username: formData.username.trim(),
        useremail: formData.useremail.trim(),
        type: formData.type,
        ativo: formData.ativo,
      };

      const url = isEdit && id
        ? `${API_BASE_URL}/users/${id}`
        : `${API_BASE_URL}/users`;

      const method = isEdit ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(sessionTenantId ? { 'X-Tenant-ID': sessionTenantId } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao salvar usuário');
      }

      const data = await resp.json() as {
        id: string;
        password?: string;
      };

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

  const handleCancel = () => {
    navigate('/cadastros/admin/usuarios');
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="card-dashboard">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserCog className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {isEdit ? 'Editar Usuário' : 'Adicionar Usuário'}
          </h1>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando dados do usuário...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {!hideTenantField && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Cliente (tenant) <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={
                        isEdit
                          ? (formData.tenantId || undefined)
                          : (sessionTenantId || formData.tenantId || undefined)
                      }
                      onValueChange={(value) => {
                        if (!isEdit && sessionTenantId) return;
                        updateField('tenantId', value);
                      }}
                      disabled={!isEdit && !!sessionTenantId}
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
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Código
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    readOnly
                    disabled
                    placeholder="Gerado automaticamente"
                    className="input-field bg-muted cursor-not-allowed"
                  />
                </div>
              </div>



              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Usuário <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    placeholder="Nome de usuário"
                    className={`input-field ${errors.username ? 'error' : ''}`}
                  />
                </div>

                <div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.useremail}
                    onChange={(e) => updateField('useremail', e.target.value)}
                    placeholder="email@empresa.com"
                    className={`input-field ${errors.useremail ? 'error' : ''}`}
                  />
                  </div>
                </div>
      

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tipo <span className="text-destructive">*</span>
                  </label>
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
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => updateField('ativo', checked)}
                />
                <label className="text-sm font-medium text-foreground">
                  Usuário ativo
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
                <button
                  onClick={handleCancel}
                  type="button"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>

                <button
                  onClick={handleSave}
                  type="button"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <AlertDialog open={showPasswordDialog} onOpenChange={(open) => {
        setShowPasswordDialog(open);
        if (!open) {
          // ao fechar o modal, volta pra tela de listagem
          navigate('/cadastros/admin/usuarios');
        }
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
            <AlertDialogCancel>
              Fechar
            </AlertDialogCancel>
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

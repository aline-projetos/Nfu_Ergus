import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserCog, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { User, mockUsers, userTypes } from '@/data/mockUsers';
import { mockClients } from '@/data/mockClients';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormData {
  tenant_id: string;
  codigo: string;
  username: string;
  type: string;
  is_super_admin: boolean;
  ativo: boolean;
}

const initialFormData: FormData = {
  tenant_id: '',
  codigo: '',
  username: '',
  type: '',
  is_super_admin: false,
  ativo: true,
};

export function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (isEdit && id) {
      const user = mockUsers.find(u => u.id === id);
      if (user) {
        setFormData({
          tenant_id: user.tenant_id || '',
          codigo: user.codigo ? String(user.codigo) : '',
          username: user.username,
          type: user.type,
          is_super_admin: user.is_super_admin,
          ativo: user.ativo,
        });
      } else {
        toast.error('Usuário não encontrado');
        navigate('/cadastros/admin/usuarios');
      }
    }
  }, [isEdit, id, navigate]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Usuário é obrigatório';
    }
    if (!formData.type) {
      newErrors.type = 'Tipo é obrigatório';
    }
    if (formData.codigo && isNaN(Number(formData.codigo))) {
      newErrors.codigo = 'Código deve ser numérico';
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

  const handleSave = () => {
    if (!validate()) return;

    const tenantName = formData.tenant_id 
      ? mockClients.find(c => c.id === formData.tenant_id)?.name 
      : undefined;

    if (isEdit) {
      // Mock update
      const index = mockUsers.findIndex(u => u.id === id);
      if (index !== -1) {
        mockUsers[index] = {
          ...mockUsers[index],
          tenant_id: formData.tenant_id || null,
          tenant_name: tenantName,
          codigo: formData.codigo ? Number(formData.codigo) : null,
          username: formData.username.trim(),
          type: formData.type as 'admin' | 'operador' | 'consulta',
          is_super_admin: formData.is_super_admin,
          ativo: formData.ativo,
        };
      }
      toast.success('Usuário atualizado com sucesso');
    } else {
      // Mock create - generate next codigo
      const maxCodigo = Math.max(...mockUsers.map(u => u.codigo || 0), 1000);
      const newUser: User = {
        id: String(mockUsers.length + 1),
        tenant_id: formData.tenant_id || null,
        tenant_name: tenantName,
        codigo: formData.codigo ? Number(formData.codigo) : maxCodigo + 1,
        username: formData.username.trim(),
        type: formData.type as 'admin' | 'operador' | 'consulta',
        is_super_admin: formData.is_super_admin,
        ativo: formData.ativo,
      };
      mockUsers.push(newUser);
      toast.success('Usuário cadastrado com sucesso');
    }

    navigate('/cadastros/admin/usuarios');
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Cliente (tenant)
              </label>
              <Select
                value={formData.tenant_id}
                onValueChange={(value) => updateField('tenant_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {mockClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Código
              </label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => updateField('codigo', e.target.value)}
                placeholder="Código numérico (opcional)"
                className={`input-field ${errors.codigo ? 'error' : ''}`}
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

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_super_admin}
                onCheckedChange={(checked) => updateField('is_super_admin', checked)}
              />
              <label className="text-sm font-medium text-foreground">
                Super Admin
              </label>
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
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cancelar</span>
            </button>
            
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Salvar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
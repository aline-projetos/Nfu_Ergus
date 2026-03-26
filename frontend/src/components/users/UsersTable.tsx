import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, UserCog, Plus, Search, LockKeyhole } from 'lucide-react';
import { InputSwitch } from 'primereact/inputswitch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { userTypes } from '@/data/mockUsers';
import { toast } from 'sonner';
import { getBaseUrl } from '@/lib/utils';
import { AppDataTable, TableColumn } from '@/components/ui/AppDataTable';

type FilterStatus = 'all' | 'active' | 'inactive';

interface UserRow {
  id: string;
  tenantId: string;
  tenantName?: string;
  codigo: number;
  username: string;
  type: string;
  ativo: boolean;
  isSuperAdmin?: boolean;
  useremail?: string;
}

interface TenantOption {
  id: string;
  name: string;
}

export function UsersTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserRow[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ username: string; password: string } | null>(null);
  const navigate = useNavigate();

  const loggedUser = JSON.parse(localStorage.getItem('ergus_user') || '{}');
  const tenantId: string | undefined = loggedUser?.tenantId;
  const isSuperAdmin: boolean = !!(loggedUser?.isSuperAdmin ?? loggedUser?.is_super_admin);

  const buildHeaders = (options?: { targetTenantId?: string }) => {
    const token = localStorage.getItem('ergus_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const headerTenantId = isSuperAdmin ? options?.targetTenantId : tenantId;
    if (headerTenantId) headers['X-Tenant-ID'] = headerTenantId;
    return headers;
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const targetUser = users.find(u => u.id === userId);
      const resp = await fetch(`${getBaseUrl()}/users/${userId}/reset-password`, {
        method: 'POST',
        headers: buildHeaders({ targetTenantId: targetUser?.tenantId }),
      });
      if (!resp.ok) throw new Error((await resp.text()) || 'Erro ao resetar senha');
      const data = await resp.json() as { username: string; password: string };
      setResetPasswordUser({ username: data.username, password: data.password });
      setResetPasswordDialogOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao resetar senha');
    }
  };

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const resp = await fetch(`${getBaseUrl()}/tenants`, { headers: buildHeaders() });
        if (!resp.ok) throw new Error((await resp.text()) || 'Erro ao buscar tenants');
        const data: Array<{ id: string; name: string }> = await resp.json();
        setTenants(data.map(t => ({ id: t.id, name: t.name })));
      } catch (err: any) {
        toast.error(err.message || 'Erro ao carregar lista de clientes');
      }
    };
    fetchTenants();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const resp = await fetch(`${getBaseUrl()}/users`, { headers: buildHeaders() });
        if (!resp.ok) throw new Error((await resp.text()) || 'Erro ao carregar usu\u00e1rios');
        const data: Array<{
          id: string; tenantId: string; tenant_name?: string; codigo: number;
          username: string; type: string; ativo: boolean;
          is_super_admin?: boolean; useremail?: string;
        }> = await resp.json();

        let dataFilter = data;
        if (tenantId) dataFilter = data.filter(item => item.tenantId === tenantId);

        setUsers(dataFilter.map(item => ({
          id: item.id, tenantId: item.tenantId, tenantName: item.tenant_name ?? '',
          codigo: item.codigo, username: item.username, type: item.type, ativo: item.ativo,
          isSuperAdmin: item.is_super_admin ?? false, useremail: item.useremail,
        })));
      } catch (err: any) {
        toast.error(err.message || 'Erro ao carregar usu\u00e1rios');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = term === '' ||
      user.username.toLowerCase().includes(term) ||
      user.codigo?.toString().includes(term) ||
      (user.tenantName ?? '').toLowerCase().includes(term);
    const matchesType = filterType === 'all' || user.type === filterType;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && user.ativo) ||
      (filterStatus === 'inactive' && !user.ativo);
    const matchesTenant = filterTenant === 'all' || user.tenantId === filterTenant;
    return matchesSearch && matchesType && matchesStatus && matchesTenant;
  });

  const handleToggleActive = async (id: string, checked: boolean) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ativo: checked } : u));
    try {
      const resp = await fetch(`${getBaseUrl()}/users/${id}`, {
        method: 'PUT',
        headers: buildHeaders({ targetTenantId: user.tenantId }),
        body: JSON.stringify({
          tenantId: user.tenantId, codigo: user.codigo, username: user.username,
          type: user.type, ativo: checked, useremail: user.useremail,
        }),
      });
      if (!resp.ok) throw new Error((await resp.text()) || 'Erro ao atualizar usu\u00e1rio');
      toast.success(checked ? 'Usu\u00e1rio ativado' : 'Usu\u00e1rio desativado');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar status do usu\u00e1rio');
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ativo: !checked } : u));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const targetUser = users.find(u => u.id === deleteId);
      const resp = await fetch(`${getBaseUrl()}/users/${deleteId}`, {
        method: 'DELETE',
        headers: buildHeaders({ targetTenantId: targetUser?.tenantId }),
      });
      if (!resp.ok) throw new Error((await resp.text()) || 'Erro ao excluir usu\u00e1rio');
      setUsers(prev => prev.filter(u => u.id !== deleteId));
      toast.success('Usu\u00e1rio inativado com sucesso');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir usu\u00e1rio');
    } finally {
      setDeleteId(null);
    }
  };

  const getTypeLabel = (type: string) => userTypes.find(t => t.value === type)?.label || type;

  const toolbar = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Buscar por c\u00f3digo, usu\u00e1rio ou cliente..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="input-field pl-10 w-64"
      />
    </div>
  );

  const headerExtra = (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Tipo:</span>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-input bg-background text-foreground text-sm"
        >
          <option value="all">Todos</option>
          {userTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as FilterStatus)}
          className="px-3 py-1.5 rounded-md border border-input bg-background text-foreground text-sm"
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Empresa:</span>
        <select
          value={filterTenant}
          onChange={e => setFilterTenant(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-input bg-background text-foreground text-sm"
        >
          <option value="all">Todas</option>
          {tenants.map(tenant => (
            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const columns: TableColumn[] = [
    {
      field: 'codigo', header: 'C\u00f3digo', sortable: true,
      body: (row: UserRow) => <span className="font-medium text-foreground">{row.codigo ?? '\u2014'}</span>,
    },
    { field: 'username', header: 'Usu\u00e1rio', sortable: true },
    { field: 'useremail', header: 'Email', body: (row: UserRow) => <span>{row.useremail || '\u2014'}</span> },
    { field: 'type', header: 'Tipo', sortable: true, body: (row: UserRow) => <span>{getTypeLabel(row.type)}</span> },
    {
      header: 'Empresa',
      body: (row: UserRow) => (
        <span>{tenants.find(t => t.id === row.tenantId)?.name || row.tenantId || '\u2014'}</span>
      ),
    },
    {
      header: 'Ativo', style: { textAlign: 'center' },
      body: (row: UserRow) => (
        <InputSwitch
          checked={row.ativo}
          onChange={e => handleToggleActive(row.id, e.value)}
        />
      ),
    },
    {
      header: 'A\u00e7\u00f5es', style: { textAlign: 'center', width: '8rem' },
      body: (row: UserRow) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleResetPassword(row.id)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <LockKeyhole className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Resetar senha</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(`/cadastros/admin/usuarios/${row.id}/editar`)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Editar usu\u00e1rio</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setDeleteId(row.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Excluir usu\u00e1rio</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <AppDataTable
        title="Usu\u00e1rios"
        icon={<UserCog className="w-5 h-5 text-primary" />}
        data={filteredUsers}
        columns={columns}
        loading={isLoading}
        emptyMessage="Nenhum usu\u00e1rio encontrado."
        selection={selectedUsers}
        onSelectionChange={setSelectedUsers}
        toolbar={toolbar}
        headerExtra={headerExtra}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usu\u00e1rio?</AlertDialogTitle>
            <AlertDialogDescription>O usu\u00e1rio ser\u00e1 desativado do sistema.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nova senha gerada</AlertDialogTitle>
            <AlertDialogDescription>
              Usu\u00e1rio: <strong>{resetPasswordUser?.username}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 p-3 rounded-lg bg-muted font-mono text-center text-lg">
            {resetPasswordUser?.password}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resetPasswordUser?.password) {
                  navigator.clipboard.writeText(resetPasswordUser.password).catch(() => {});
                  toast.success('Senha copiada para \u00e1rea de transfer\u00eancia');
                }
              }}
            >
              Copiar senha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Link to="/cadastros/admin/usuarios/novo" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

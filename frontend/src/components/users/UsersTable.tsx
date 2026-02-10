import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Pencil, 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  UserCog,
  Plus,
  Search,
  Shield,
  LockKeyhole
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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

type SortField = 'codigo' | 'username' | 'type';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'active' | 'inactive';

const API_BASE_URL = import.meta.env.VITE_API_URL;


interface UserRow {
  id: string;
  tenantId: string;
  tenantName?: string;      // nome amigável do tenant
  codigo: number;
  username: string;
  type: string;
  ativo: boolean;
  isSuperAdmin?: boolean;   // flag vinda do backend
  useremail?: string;
}

interface TenantOption {
  id: string;
  name: string;
}

export function UsersTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('codigo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const navigate = useNavigate();
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ username: string; password: string } | null>(null);
  const loggedUser = JSON.parse(localStorage.getItem('ergus_user') || '{}');

  const tenantId: string | undefined = loggedUser?.tenantId;
  const isSuperAdmin: boolean = !!(loggedUser?.isSuperAdmin ?? loggedUser?.is_super_admin);

  const buildHeaders = (options?: { targetTenantId?: string }) => {
    const token = localStorage.getItem('ergus_token'); 

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const headerTenantId = isSuperAdmin ? options?.targetTenantId : tenantId;

    if (headerTenantId) {
      headers['X-Tenant-ID'] = headerTenantId;
    }

    return headers;
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const targetUser = users.find(u => u.id === userId);

      const resp = await fetch(`${getBaseUrl()}/users/${userId}/reset-password`, {
        method: 'POST',
        headers: buildHeaders({ targetTenantId: targetUser?.tenantId }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao resetar senha');
      }

      const data = await resp.json() as { username: string; password: string };
      setResetPasswordUser({ username: data.username, password: data.password });
      setResetPasswordDialogOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao resetar senha');
    }
  };

    useEffect(() => {
      const fetchTenants = async () => {
        try {
          const resp = await fetch(`${getBaseUrl()}/tenants`, {
            headers: buildHeaders(),
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

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const resp = await fetch(`${getBaseUrl()}/users`, {
          headers: buildHeaders(),
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || 'Erro ao carregar usuários');
        }

        const data: Array<{
          id: string;
          tenantId: string;
          tenant_name?: string;
          codigo: number;
          username: string;
          type: string;
          ativo: boolean;
          is_super_admin?: boolean;
          useremail?: string;
        }> = await resp.json();

        let dataFilter = data;
        if (tenantId) {
          dataFilter = data.filter(item => item.tenantId === tenantId);
        } 

        const mapped: UserRow[] = dataFilter.map(item => ({
          id: item.id,
          tenantId: item.tenantId,
          tenantName: item.tenant_name ?? '',
          codigo: item.codigo,
          username: item.username,
          type: item.type,
          ativo: item.ativo,
          isSuperAdmin: item.is_super_admin ?? false,
          useremail: item.useremail,
        }));

        setUsers(mapped);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Erro ao carregar usuários');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      term === '' ||
      user.username.toLowerCase().includes(term) ||
      user.codigo?.toString().includes(term) ||
      (user.tenantName ?? '').toLowerCase().includes(term);

    const matchesType = filterType === 'all' || user.type === filterType;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && user.ativo) ||
      (filterStatus === 'inactive' && !user.ativo);

      const matchesTenant =
      filterTenant === 'all' || user.tenantId === filterTenant;

    return matchesSearch && matchesType && matchesStatus && matchesTenant;
  });

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortField] ?? '';
    const bValue = b[sortField] ?? '';
    const comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedUsers.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleToggleActive = async (id: string, checked: boolean) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    // atualização otimista
    setUsers(prev =>
      prev.map(u => (u.id === id ? { ...u, ativo: checked } : u)),
    );

    try {
      const token = localStorage.getItem('ergus_token');

      const payload = {
        tenantId: user.tenantId,
        codigo: user.codigo,
        username: user.username,
        type: user.type,
        ativo: checked,
        useremail: user.useremail,
      };

      const resp = await fetch(`${getBaseUrl()}/users/${id}`, {
      method: 'PUT',
      headers: buildHeaders({ targetTenantId: user.tenantId }),
      body: JSON.stringify(payload),
    });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao atualizar usuário');
      }

      toast.success(checked ? 'Usuário ativado' : 'Usuário desativado');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao atualizar status do usuário');

      // rollback
      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, ativo: !checked } : u)),
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const token = localStorage.getItem('ergus_token');

      const targetUser = users.find(u => u.id === deleteId);

      const resp = await fetch(`${getBaseUrl()}/users/${deleteId}`, {
        method: 'DELETE',
        headers: buildHeaders({ targetTenantId: targetUser?.tenantId }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao excluir usuário');
      }

      setUsers(prev => prev.filter(u => u.id !== deleteId));
      toast.success('Usuário inativado com sucesso');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao excluir usuário');
    } finally {
      setDeleteId(null);
    }
  };

  const getTypeLabel = (type: string) => {
    return userTypes.find(t => t.value === type)?.label || type;
  };

  const isAllSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every(u => selectedIds.includes(u.id));

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors group"
    >
      {children}
      <ArrowUpDown
        className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
          sortField === field ? 'opacity-100 text-primary' : ''
        }`}
      />
    </button>
  );

  return (
    <div className="animate-fade-in">
      <div className="card-dashboard">
        <div className="flex flex-col gap-4 p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserCog className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Usuários</h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por código, usuário ou cliente..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field pl-10 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-md border border-input bg-background text-foreground text-sm"
              >
                <option value="all">Todos</option>
                {userTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as FilterStatus);
                  setCurrentPage(1);
                }}
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
                onChange={(e) => {
                  setFilterTenant(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-md border border-input bg-background text-foreground text-sm"
              >
                <option value="all">Todas</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-12 p-4">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="codigo">Código</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="username">Usuário</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  Email
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="type">Tipo</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  Empresa
                </th>
                <th className="p-4 text-center text-sm font-medium text-muted-foreground">
                  Ativo
                </th>
                <th className="w-24 p-4 text-center text-sm font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">
                    Carregando usuários...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`table-row-hover border-b border-border last:border-b-0 ${
                      selectedIds.includes(user.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectOne(user.id, checked as boolean)}
                      />
                    </td>
                    <td className="p-4 text-sm font-medium text-foreground">
                      {user.codigo ?? '—'}
                    </td>
                    <td className="p-4 text-sm text-foreground">{user.username}</td>
                    <td className="p-4 text-sm text-foreground">{user.useremail || '—'}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {getTypeLabel(user.type)}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {tenants.find(t => t.id === user.tenantId)?.name || user.tenantId || '—'}
                    </td>
                    <td className="p-4 text-center">
                      <Switch
                        checked={user.ativo}
                        onCheckedChange={(checked) => handleToggleActive(user.id, checked)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleResetPassword(user.id)}
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
                              onClick={() =>
                                navigate(`/cadastros/admin/usuarios/${user.id}/editar`)
                              }
                              className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Editar usuário</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setDeleteId(user.id)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir usuário</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Linhas por página:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-md border border-input bg-background text-foreground text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {filteredUsers.length > 0
                ? `${startIndex + 1}-${Math.min(endIndex, filteredUsers.length)} de ${
                    filteredUsers.length
                  }`
                : '0 de 0'}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário será desativado do sistema.
            </AlertDialogDescription>
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
              Usuário: <strong>{resetPasswordUser?.username}</strong>
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
                  toast.success('Senha copiada para área de transferência');
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

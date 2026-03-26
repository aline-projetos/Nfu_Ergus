import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccessPermission, AccessProfile, CreateAccessProfileInput, UpdateAccessProfileInput } from '@/lib/api/accessControl';
import { getAuthHeaders, getBaseUrl } from '@/lib/utils';

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

interface ProfileForm {
  code: string;
  name: string;
  description: string;
  is_default: boolean;
  permissionIds: string[];
}

const emptyForm: ProfileForm = {
  code: '',
  name: '',
  description: '',
  is_default: false,
  permissionIds: [],
};

type SortField = 'name' | 'code';
type SortDir = 'asc' | 'desc';

interface TenantOption {
  id: string;
  name: string;
}

// DTO bruto vindo do backend (snake_case)
type AccessProfileDTO = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_default: boolean;
  permission_ids?: string[] | null;
};

// mesma lógica de headers do UsersForm
const buildHeaders = (options?: { targetTenantId?: string }) => {
  const token = localStorage.getItem('ergus_token');
  const loggedUser = JSON.parse(localStorage.getItem('ergus_user') || '{}');
  const isSuperAdmin: boolean = !!(
    loggedUser?.isSuperAdmin ?? loggedUser?.is_super_admin
  );
  const tenantId: string | undefined = loggedUser?.tenantId;

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

export default function AccessProfilesPage() {
  const queryClient = useQueryClient();

  // ── info do usuário logado ───────────────────────────────────────────────
  const loggedUser = JSON.parse(localStorage.getItem('ergus_user') || '{}');
  const tenantId: string | undefined = loggedUser?.tenantId;
  const isSuperAdmin: boolean = !!(
    loggedUser?.isSuperAdmin ?? loggedUser?.is_super_admin
  );

  // ── tenant atual para o contexto de perfis ───────────────────────────────
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState<string | undefined>(
    tenantId
  );

  const effectiveTenantId = isSuperAdmin ? currentTenantId : tenantId;

  // carrega tenants (apenas superadmin)
  useEffect(() => {
    if (!isSuperAdmin) return;

    const fetchTenants = async () => {
      try {
        setIsLoadingTenants(true);
        const resp = await fetch(`${getBaseUrl()}/tenants`, {
          headers: getAuthHeaders(),
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || 'Erro ao buscar clientes (tenants)');
        }

        const data: Array<{ id: string; name: string }> = await resp.json();
        setTenants(data.map((t) => ({ id: t.id, name: t.name })));

        if (!currentTenantId && data.length > 0) {
          setCurrentTenantId(data[0].id);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(
          err.message || 'Erro ao carregar lista de clientes (tenants)'
        );
      } finally {
        setIsLoadingTenants(false);
      }
    };

    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  // ── server state (perfis) ────────────────────────────────────────────────
  const {
    data: serverProfiles,
    isLoading: isLoadingProfiles,
    isError: isProfilesError,
  } = useQuery({
    queryKey: ['access-profiles', effectiveTenantId],
    enabled: !!effectiveTenantId,
    queryFn: async () => {
      const resp = await fetch(`${getBaseUrl()}/access-profiles`, {
        headers: buildHeaders({ targetTenantId: effectiveTenantId }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao carregar perfis de acesso');
      }

      const raw = (await resp.json()) as AccessProfileDTO[];

      // map snake_case → camelCase e garante array
      const mapped: AccessProfile[] = raw.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description ?? null,
        is_default: p.is_default,
        permissionIds: p.permission_ids ?? [],
      }));

      return mapped;
    },
    retry: false,
  });

  // ── server state (permissões) ────────────────────────────────────────────
  const {
    data: serverPerms,
    isError: permsError,
    isLoading: isLoadingPerms,
  } = useQuery({
    queryKey: ['access-permissions', { only_active: true, tenantId: effectiveTenantId }],
    enabled: !!effectiveTenantId,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('only_active', 'true');

      const resp = await fetch(
        `${getBaseUrl()}/access-permissions?${qs.toString()}`,
        {
          headers: buildHeaders({ targetTenantId: effectiveTenantId }),
        }
      );

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao carregar permissões');
      }

      return (await resp.json()) as AccessPermission[];
    },
    retry: false,
  });

  const profiles: AccessProfile[] =
    (serverProfiles || []).map((p) => ({
      ...p,
      permissionIds: p.permissionIds ?? [],
    }));

  const allPerms: AccessPermission[] =
    permsError || !serverPerms ? [] : serverPerms;

  // ── local UI state ──────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<ProfileForm>>({});

  const [permSearch, setPermSearch] = useState('');
  const [permModuleFilter, setPermModuleFilter] = useState('all');

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: CreateAccessProfileInput) => {
      if (!effectiveTenantId) {
        throw new Error('Selecione um cliente (tenant) antes de criar perfis');
      }

      const resp = await fetch(`${getBaseUrl()}/access-profiles`, {
        method: 'POST',
        headers: buildHeaders({ targetTenantId: effectiveTenantId }),
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao criar perfil');
      }

      return await resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['access-profiles', effectiveTenantId],
      });
      toast.success('Perfil criado com sucesso');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateAccessProfileInput;
    }) => {
      if (!effectiveTenantId) {
        throw new Error('Selecione um cliente (tenant) antes de atualizar perfis');
      }

      const resp = await fetch(`${getBaseUrl()}/access-profiles/${id}`, {
        method: 'PUT',
        headers: buildHeaders({ targetTenantId: effectiveTenantId }),
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao atualizar perfil');
      }

      return await resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['access-profiles', effectiveTenantId],
      });
      toast.success('Perfil atualizado com sucesso');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!effectiveTenantId) {
        throw new Error('Selecione um cliente (tenant) antes de excluir perfis');
      }

      const resp = await fetch(`${getBaseUrl()}/access-profiles/${id}`, {
        method: 'DELETE',
        headers: buildHeaders({ targetTenantId: effectiveTenantId }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao excluir perfil');
      }

      return await resp.text();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['access-profiles', effectiveTenantId],
      });
      toast.success('Perfil excluído com sucesso');
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── derived ─────────────────────────────────────────────────────────────
  const permModules = Array.from(new Set(allPerms.map((p) => p.module))).sort();

  const filteredPermsForPicker = allPerms.filter((p) => {
    const matchSearch =
      p.code.toLowerCase().includes(permSearch.toLowerCase()) ||
      p.name.toLowerCase().includes(permSearch.toLowerCase());
    const matchMod =
      permModuleFilter === 'all' || p.module === permModuleFilter;
    return matchSearch && matchMod;
  });

  const filtered = profiles.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const cmp = a[sortField].localeCompare(b[sortField]);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const paginated = sorted.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // ── helpers ──────────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field)
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const openCreate = () => {
    if (!effectiveTenantId) {
      toast.error('Selecione um cliente (tenant) antes de criar perfis');
      return;
    }
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setPermSearch('');
    setPermModuleFilter('all');
    setDialogOpen(true);
  };

  const openEdit = (profile: AccessProfile) => {
    if (!effectiveTenantId) {
      toast.error('Selecione um cliente (tenant) antes de editar perfis');
      return;
    }
    setEditingId(profile.id);
    setForm({
      code: profile.code,
      name: profile.name,
      description: profile.description ?? '',
      is_default: profile.is_default,
      permissionIds: [...(profile.permissionIds ?? [])],
    });
    setFormErrors({});
    setPermSearch('');
    setPermModuleFilter('all');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const updateForm = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    if (formErrors[k])
      setFormErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const togglePermission = (permId: string) => {
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permId)
        ? prev.permissionIds.filter((id) => id !== permId)
        : [...prev.permissionIds, permId],
    }));
  };

  const validate = (): boolean => {
    const errs: Partial<ProfileForm> = {};
    if (!form.code.trim()) errs.code = 'Identificador é obrigatório';
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      Object.values(errs).forEach(
        (e) => typeof e === 'string' && e && toast.error(e)
      );
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (!effectiveTenantId) {
      toast.error('Selecione um cliente (tenant) antes de salvar');
      return;
    }

    const payload: CreateAccessProfileInput = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      is_default: form.is_default,
      permissionIds: form.permissionIds,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isLoadingAny =
    isLoadingProfiles || isLoadingPerms || (isSuperAdmin && isLoadingTenants);

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
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
        {/* Header */}
        <div className="flex flex-col gap-4 p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Perfis de Acesso
                </h1>
                {isSuperAdmin && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Como superusuário, selecione o cliente (tenant) para
                    gerenciar os perfis.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Cliente (tenant)
                  </span>
                  <Select
                    value={currentTenantId || ''}
                    onValueChange={(value) => {
                      setCurrentTenantId(value);
                      setCurrentPage(1);
                    }}
                    disabled={isLoadingTenants}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue
                        placeholder={
                          isLoadingTenants
                            ? 'Carregando clientes...'
                            : 'Selecione um cliente'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou Identificador..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="input-field pl-10 w-72"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mensagem se não tiver tenant selecioando para superadmin */}
        {!effectiveTenantId && isSuperAdmin && (
          <div className="p-6 text-sm text-muted-foreground">
            Selecione um cliente (tenant) para visualizar e gerenciar os
            perfis de acesso.
          </div>
        )}

        {/* Table */}
        {effectiveTenantId && (
          <>
            {isLoadingAny && (
              <div className="p-4 text-sm text-muted-foreground">
                Carregando dados...
              </div>
            )}

            {isProfilesError && (
              <div className="p-4 text-sm text-destructive">
                Erro ao carregar perfis. Verifique o tenant selecionado.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                      <SortButton field="name">Nome</SortButton>
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                      <SortButton field="code">Identificador</SortButton>
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                      Descrição
                    </th>
                    <th className="p-4 text-center text-sm font-medium text-muted-foreground">
                      Padrão
                    </th>
                    <th className="p-4 text-center text-sm font-medium text-muted-foreground">
                      Permissões
                    </th>
                    <th className="w-24 p-4 text-center text-sm font-medium text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground text-sm"
                      >
                        Nenhum perfil encontrado.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((profile) => {
                      const permCount = profile.permissionIds?.length ?? 0;
                      return (
                        <tr
                          key={profile.id}
                          className="table-row-hover border-b border-border last:border-b-0"
                        >
                          <td className="p-4 text-sm font-medium text-foreground">
                            {profile.name}
                          </td>
                          <td className="p-4 text-sm font-mono text-muted-foreground">
                            {profile.code}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
                            {profile.description || '—'}
                          </td>
                          <td className="p-4 text-center">
                            {profile.is_default ? (
                              <Badge
                                variant="default"
                                className="bg-primary/10 text-primary hover:bg-primary/20 border-0"
                              >
                                Padrão
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                —
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                              {permCount} permissões
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => openEdit(profile)}
                                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                  >
                                    <Pencil className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Editar perfil</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setDeleteId(profile.id)}
                                    className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir perfil</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
                  {[5, 10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {sorted.length > 0
                    ? `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(
                        currentPage * rowsPerPage,
                        sorted.length
                      )} de ${sorted.length}`
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
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
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
          </>
        )}
      </div>

      {/* Dialog de criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {editingId ? 'Editar Perfil' : 'Novo Perfil de Acesso'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-5 py-2 pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Identificador <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => updateForm('code', e.target.value)}
                  placeholder="ex: vendedor"
                  className={`input-field font-mono ${
                    formErrors.code ? 'error' : ''
                  }`}
                />
                {formErrors.code && (
                  <p className="text-destructive text-xs mt-1">
                    {formErrors.code}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="ex: Vendedor"
                  className={`input-field ${
                    formErrors.name ? 'error' : ''
                  }`}
                />
                {formErrors.name && (
                  <p className="text-destructive text-xs mt-1">
                    {formErrors.name}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Descrição
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Descrição opcional do perfil"
                rows={2}
                className="input-field resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_default}
                onCheckedChange={(c) => updateForm('is_default', c)}
              />
              <label className="text-sm font-medium text-foreground">
                Perfil padrão
              </label>
            </div>

            {/* Picker de permissões */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Permissões
                </label>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  {form.permissionIds.length} selecionadas
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar permissão..."
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    className="input-field pl-8 py-2 text-sm"
                  />
                </div>
                <select
                  value={permModuleFilter}
                  onChange={(e) => setPermModuleFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                >
                  <option value="all">Todos</option>
                  {permModules.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border border-border rounded-lg overflow-hidden max-h-56 overflow-y-auto scrollbar-thin">
                {filteredPermsForPicker.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma permissão encontrada.
                  </div>
                ) : (
                  filteredPermsForPicker.map((perm) => {
                    const checked = form.permissionIds.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-border last:border-0 ${
                          checked ? 'bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => togglePermission(perm.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground">
                            {perm.name}
                          </span>
                          <span className="ml-2 text-xs font-mono text-muted-foreground">
                            {perm.code}
                          </span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                          {perm.module}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-2">
            <button
              onClick={closeDialog}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cancelar</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O perfil será removido
              permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FAB */}
      <button
        onClick={openCreate}
        disabled={!effectiveTenantId}
        className="fab-button disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

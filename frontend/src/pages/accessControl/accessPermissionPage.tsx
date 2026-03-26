import { useState } from 'react';
import {
  Shield,
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
  AccessPermission,
  CreateAccessPermissionInput,
  listAccessPermissions,
  createAccessPermission,
  updateAccessPermission,
  deleteAccessPermission,
} from '@/lib/api/accessControl';

// ─── Mock fallback while backend is not available ───────────────────────────
const MOCK_PERMISSIONS: AccessPermission[] = [
  { id: '1', code: 'products.view', name: 'Visualizar produtos', module: 'products', description: 'Permite visualizar a listagem de produtos', is_active: true },
  { id: '2', code: 'products.create', name: 'Criar produtos', module: 'products', description: null, is_active: true },
  { id: '3', code: 'products.edit', name: 'Editar produtos', module: 'products', description: null, is_active: true },
  { id: '4', code: 'products.delete', name: 'Excluir produtos', module: 'products', description: null, is_active: false },
  { id: '5', code: 'sales.view', name: 'Visualizar vendas', module: 'sales', description: null, is_active: true },
  { id: '6', code: 'sales.create', name: 'Criar vendas', module: 'sales', description: null, is_active: true },
  { id: '7', code: 'finance.view', name: 'Visualizar financeiro', module: 'finance', description: null, is_active: true },
  { id: '8', code: 'finance.reports', name: 'Relatórios financeiros', module: 'finance', description: null, is_active: false },
  { id: '9', code: 'users.manage', name: 'Gerenciar usuários', module: 'users', description: null, is_active: true },
  { id: '10', code: 'users.view', name: 'Visualizar usuários', module: 'users', description: null, is_active: true },
];

const MOCK_MODULES = ['products', 'sales', 'finance', 'users'];

// ─── Form state ──────────────────────────────────────────────────────────────
interface PermissionForm {
  code: string;
  name: string;
  module: string;
  description: string;
  is_active: boolean;
}

const emptyForm: PermissionForm = {
  code: '',
  name: '',
  module: '',
  description: '',
  is_active: true,
};

type SortField = 'code' | 'name' | 'module';
type SortDir = 'asc' | 'desc';

export default function AccessPermissionsPage() {
  const queryClient = useQueryClient();

  // ── server state ────────────────────────────────────────────────────────
  const { data: serverData, isError } = useQuery({
    queryKey: ['access-permissions'],
    queryFn: () => listAccessPermissions(),
    retry: false,
  });

  // Use mock when backend is not available
  const [mockData, setMockData] = useState<AccessPermission[]>(MOCK_PERMISSIONS);
  const permissions: AccessPermission[] = isError || !serverData ? mockData : serverData;
//   const usingMock = isError || !serverData;

  // ── local UI state ──────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PermissionForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<PermissionForm>>({});

  // delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: CreateAccessPermissionInput) => createAccessPermission(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-permissions'] });
      toast.success('Permissão criada com sucesso');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateAccessPermissionInput }) =>
      updateAccessPermission(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-permissions'] });
      toast.success('Permissão atualizada com sucesso');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAccessPermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-permissions'] });
      toast.success('Permissão excluída com sucesso');
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── derived data ─────────────────────────────────────────────────────────
  const modules = Array.from(
    new Set([...MOCK_MODULES, ...permissions.map((p) => p.module)])
  ).sort();

  const filtered = permissions.filter((p) => {
    const matchSearch =
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchModule = filterModule === 'all' || p.module === filterModule;
    return matchSearch && matchModule;
  });

  const sorted = [...filtered].sort((a, b) => {
    const cmp = a[sortField].localeCompare(b[sortField]);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const isAllSelected =
    paginated.length > 0 && paginated.every((p) => selectedIds.includes(p.id));

  // ── helpers ──────────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

//   const openCreate = () => {
//     setEditingId(null);
//     setForm(emptyForm);
//     setFormErrors({});
//     setDialogOpen(true);
//   };

//   const openEdit = (perm: AccessPermission) => {
//     setEditingId(perm.id);
//     setForm({
//       code: perm.code,
//       name: perm.name,
//       module: perm.module,
//       description: perm.description ?? '',
//       is_active: perm.is_active,
//     });
//     setFormErrors({});
//     setDialogOpen(true);
//   };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
  };

//   const updateForm = <K extends keyof PermissionForm>(k: K, v: PermissionForm[K]) => {
//     setForm((prev) => ({ ...prev, [k]: v }));
//     if (formErrors[k]) setFormErrors((prev) => ({ ...prev, [k]: undefined }));
//   };

//   const validate = (): boolean => {
//     const errs: Partial<PermissionForm> = {};
//     if (!form.code.trim()) errs.code = 'Chave é obrigatório';
//     if (!form.name.trim()) errs.name = 'Nome é obrigatório';
//     if (!form.module.trim()) errs.module = 'Módulo é obrigatório';
//     setFormErrors(errs);
//     if (Object.keys(errs).length > 0) {
//       Object.values(errs).forEach((e) => e && toast.error(e));
//       return false;
//     }
//     return true;
//   };

//   const handleSave = () => {
//     if (!validate()) return;
//     const payload: CreateAccessPermissionInput = {
//       code: form.code.trim(),
//       name: form.name.trim(),
//       module: form.module.trim(),
//       description: form.description.trim() || null,
//       is_active: form.is_active,
//     };

//     if (usingMock) {
//       // mock persistence
//       if (editingId) {
//         setMockData((prev) =>
//           prev.map((p) => (p.id === editingId ? { ...p, ...payload } : p))
//         );
//         toast.success('Permissão atualizada com sucesso');
//       } else {
//         setMockData((prev) => [
//           ...prev,
//           { id: String(Date.now()), ...payload },
//         ]);
//         toast.success('Permissão criada com sucesso');
//       }
//       closeDialog();
//       return;
//     }

//     if (editingId) {
//       updateMutation.mutate({ id: editingId, payload });
//     } else {
//       createMutation.mutate(payload);
//     }
//   };

//   const handleDelete = () => {
//     if (!deleteId) return;
//     if (usingMock) {
//       setMockData((prev) => prev.filter((p) => p.id !== deleteId));
//       toast.success('Permissão excluída com sucesso');
//       setDeleteId(null);
//       return;
//     }
//     deleteMutation.mutate(deleteId);
//   };

//   const isSaving = createMutation.isPending || updateMutation.isPending;

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
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Permissões de Acesso</h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por Chave ou nome..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="input-field pl-10 w-72"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Módulo:</span>
              <select
                value={filterModule}
                onChange={(e) => { setFilterModule(e.target.value); setCurrentPage(1); }}
                className="px-3 py-1.5 rounded-md border border-input bg-background text-foreground text-sm"
              >
                <option value="all">Todos os módulos</option>
                {modules.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {/* <th className="w-12 p-4">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(c) =>
                      c
                        ? setSelectedIds(paginated.map((p) => p.id))
                        : setSelectedIds([])
                    }
                  />
                </th> */}
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="code">Chave</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="name">Nome</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="module">Módulo</SortButton>
                </th>
                {/* <th className="w-24 p-4 text-center text-sm font-medium text-muted-foreground">Ações</th> */}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                    Nenhuma permissão encontrada.
                  </td>
                </tr>
              ) : (
                paginated.map((perm) => (
                  <tr
                    key={perm.id}
                    className={`table-row-hover border-b border-border last:border-b-0 ${
                      selectedIds.includes(perm.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(perm.id)}
                        onCheckedChange={(c) =>
                          c
                            ? setSelectedIds((p) => [...p, perm.id])
                            : setSelectedIds((p) => p.filter((i) => i !== perm.id))
                        }
                      />
                    </td> */}
                    <td className="p-4 text-sm font-mono font-medium text-foreground">{perm.code}</td>
                    <td className="p-4 text-sm text-foreground">{perm.name}</td>
                    <td className="p-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {perm.module}
                      </span>
                    </td>
                    {/* <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => openEdit(perm)}
                              className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Editar permissão</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setDeleteId(perm.id)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir permissão</TooltipContent>
                        </Tooltip>
                      </div>
                    </td> */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Linhas por página:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 rounded-md border border-input bg-background text-foreground text-sm"
            >
              {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {sorted.length > 0
                ? `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, sorted.length)} de ${sorted.length}`
                : '0 de 0'}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronsLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronsRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Create / Edit Dialog ── */}
      {/* <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {editingId ? 'Editar Permissão' : 'Nova Permissão'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Chave <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => updateForm('code', e.target.value)}
                  placeholder="ex: products.view"
                  className={`input-field font-mono ${formErrors.code ? 'error' : ''}`}
                />
                {formErrors.code && (
                  <p className="text-destructive text-xs mt-1">{formErrors.code}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Módulo <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.module}
                  onChange={(e) => updateForm('module', e.target.value)}
                  placeholder="ex: products"
                  list="modules-list"
                  className={`input-field ${formErrors.module ? 'error' : ''}`}
                />
                <datalist id="modules-list">
                  {modules.map((m) => <option key={m} value={m} />)}
                </datalist>
                {formErrors.module && (
                  <p className="text-destructive text-xs mt-1">{formErrors.module}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nome <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="ex: Visualizar produtos"
                className={`input-field ${formErrors.name ? 'error' : ''}`}
              />
              {formErrors.name && (
                <p className="text-destructive text-xs mt-1">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Descrição opcional da permissão"
                rows={3}
                className="input-field resize-none"
              />
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
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
      </Dialog> */}

      {/* ── Delete Confirm ── */}
      {/* <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permissão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A permissão será removida permanentemente do sistema.
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
      </AlertDialog> */}

      {/* ── FAB ── */}
      {/* <button onClick={openCreate} className="fab-button">
        <Plus className="w-6 h-6" />
      </button> */}
    </div>
  );
}

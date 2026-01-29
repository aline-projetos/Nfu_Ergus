import { useState, useEffect } from 'react';
import { 
  Pencil, 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Users,
  Plus,
  Search
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
import { toast } from 'sonner';

type SortField = 'name' | 'document' | 'document_type';
type SortDirection = 'asc' | 'desc';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'ergus_token';

interface TypeVariationRow {
  id: string;
  name: string;
}

interface TenantOption {
  id: string;
  name: string;
}

export function TypeVariationsTable() {
  const [typeVariations, setTypeVariations] = useState<TypeVariationRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const loggedUser = JSON.parse(localStorage.getItem('ergus_user') || '{}');
  const tenantId: string | undefined = loggedUser?.tenantId;
  const isSuperAdmin: boolean = !!(loggedUser?.isSuperAdmin ?? loggedUser?.is_super_admin);

  const buildHeaders = (options?: { targetTenantId?: string }) => {
    const token = localStorage.getItem(TOKEN_KEY);

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

  // -----------------------------
  // Carregar clientes do backend
  // -----------------------------
  useEffect(() => {
        const fetchTenants = async () => {
          try {
            const resp = await fetch(`${API_BASE_URL}/tenants`, {
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
  // -----------------------------
  // Filtros / ordenação / paginação
  // -----------------------------

  const filteredVariations = typeVariations.filter(variation => 
    variation.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalPages = Math.ceil(filteredVariations.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const sortedVariations = [...filteredVariations].sort((a, b) => {
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const paginatedVariations = sortedVariations.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedIds(paginatedVariations.map(c => c.id));
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

  // -----------------------------
  // Ativar / desativar cliente
  // -----------------------------
  const handleToggleActive = async (id: string, checked: boolean) => {
    const variations = typeVariations.find(c => c.id === id);
    if (!variations) return;

    // otimista
    setTypeVariations(prev =>
      prev.map(c =>
        c.id === id ? { ...c} : c
      )
    );

    try {
      const token = localStorage.getItem(TOKEN_KEY);

      const payload = {
        name: variations.name,
      };

      const resp = await fetch(`${API_BASE_URL}/type-variations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao atualizar tipo de variação');
      }

      toast.success(checked ? 'Tipo de variação ativado' : 'Tipo de variação desativado');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao atualizar status do tipo de variação');

      // rollback
      setTypeVariations(prev =>
        prev.map(c =>
          c.id === id ? { ...c} : c
        )
      );
    }
  };

  // -----------------------------
  // Delete (soft delete no backend)
  // -----------------------------
  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const token = localStorage.getItem(TOKEN_KEY);

      const resp = await fetch(`${API_BASE_URL}/type-variations/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao excluir tipo de variação');
      }

      // removemos da lista atual
      toast.success('Tipo de variação inativado com sucesso');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao excluir tipo de variação');
    } finally {
      setDeleteId(null);
    }
  };

  const isAllSelected = paginatedVariations.length > 0 && 
    paginatedVariations.every(c => selectedIds.includes(c.id));

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors group"
    >
      {children}
      <ArrowUpDown className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
        sortField === field ? 'opacity-100 text-primary' : ''
      }`} />
    </button>
  );

  return (
    <div className="animate-fade-in">
      <div className="card-dashboard">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Tipos de Variação</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="input-field pl-10 w-64"
            />
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
                  <SortButton field="name">Nome</SortButton>
                </th>
                <th className="w-24 p-4 text-center text-sm font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                    Carregando tipos de variações...
                  </td>
                </tr>
              ) : paginatedVariations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum tipo de variação encontrado.
                  </td>
                </tr>
              ) : (
                paginatedVariations.map((variation) => (
                  <tr 
                    key={variation.id} 
                    className={`table-row-hover border-b border-border last:border-b-0 ${
                      selectedIds.includes(variation.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(variation.id)}
                        onCheckedChange={(checked) => handleSelectOne(variation.id, checked as boolean)}
                      />
                    </td>
                    <td className="p-4 text-sm font-medium text-foreground">{variation.name}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => navigate(`/catalogo/variacoes/tipos/${variation.id}/editar`)}
                              className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Editar tipo de variação</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setDeleteId(variation.id)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir tipo de variação</TooltipContent>
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
              {filteredVariations.length > 0
                ? `${startIndex + 1}-${Math.min(endIndex, filteredVariations.length)} de ${filteredVariations.length}`
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar tipo de variação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir o tipo de variação no sistema.
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

      <Link to="/catalogo/variacoes/tipos/novo" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

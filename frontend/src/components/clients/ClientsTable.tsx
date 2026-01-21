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

interface ClientRow {
  id: string;
  name: string;
  document: string;
  document_type: 'CPF' | 'CNPJ';
  ativo: boolean;
}

export function ClientsTable() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // -----------------------------
  // Carregar clientes do backend
  // -----------------------------
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem(TOKEN_KEY);

        const resp = await fetch(`${API_BASE_URL}/tenants`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || 'Erro ao carregar clientes');
        }

        const data: Array<{
          id: string;
          name: string;
          document: string;
          documentType: 'CPF' | 'CNPJ';
          ativo: boolean;
        }> = await resp.json();

        const mapped: ClientRow[] = data.map(item => ({
          id: item.id,
          name: item.name,
          document: item.document,
          document_type: item.documentType,
          ativo: item.ativo,
        }));

        setClients(mapped);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Erro ao carregar clientes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  // -----------------------------
  // Filtros / ordenação / paginação
  // -----------------------------

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.document.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredClients.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const sortedClients = [...filteredClients].sort((a, b) => {
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const paginatedClients = sortedClients.slice(startIndex, endIndex);

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
      setSelectedIds(paginatedClients.map(c => c.id));
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
    const client = clients.find(c => c.id === id);
    if (!client) return;

    // otimista
    setClients(prev =>
      prev.map(c =>
        c.id === id ? { ...c, ativo: checked } : c
      )
    );

    try {
      const token = localStorage.getItem(TOKEN_KEY);

      const payload = {
        name: client.name,
        document: client.document,
        documentType: client.document_type,
        ativo: checked,
      };

      const resp = await fetch(`${API_BASE_URL}/tenants/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao atualizar cliente');
      }

      toast.success(checked ? 'Cliente ativado' : 'Cliente desativado');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao atualizar status do cliente');

      // rollback
      setClients(prev =>
        prev.map(c =>
          c.id === id ? { ...c, ativo: !checked } : c
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

      const resp = await fetch(`${API_BASE_URL}/tenants/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Erro ao excluir cliente');
      }

      // removemos da lista atual
      setClients(prev => prev.filter(c => c.id !== deleteId));
      toast.success('Cliente inativado com sucesso');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao excluir cliente');
    } finally {
      setDeleteId(null);
    }
  };

  const isAllSelected = paginatedClients.length > 0 && 
    paginatedClients.every(c => selectedIds.includes(c.id));

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
            <h1 className="text-xl font-semibold text-foreground">Clientes</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou documento..."
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
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="document">Documento</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="document_type">Tipo Doc.</SortButton>
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
                  <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                    Carregando clientes...
                  </td>
                </tr>
              ) : paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => (
                  <tr 
                    key={client.id} 
                    className={`table-row-hover border-b border-border last:border-b-0 ${
                      selectedIds.includes(client.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(client.id)}
                        onCheckedChange={(checked) => handleSelectOne(client.id, checked as boolean)}
                      />
                    </td>
                    <td className="p-4 text-sm font-medium text-foreground">{client.name}</td>
                    <td className="p-4 text-sm text-foreground">{client.document}</td>
                    <td className="p-4 text-sm text-muted-foreground">{client.document_type}</td>
                    <td className="p-4 text-center">
                      <Switch
                        checked={client.ativo}
                        onCheckedChange={(checked) => handleToggleActive(client.id, checked)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => navigate(`/cadastros/admin/clientes/${client.id}/editar`)}
                              className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Editar cliente</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setDeleteId(client.id)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir cliente</TooltipContent>
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
              {filteredClients.length > 0
                ? `${startIndex + 1}-${Math.min(endIndex, filteredClients.length)} de ${filteredClients.length}`
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
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá inativar o cliente no sistema.
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

      <Link to="/cadastros/admin/clientes/novo" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

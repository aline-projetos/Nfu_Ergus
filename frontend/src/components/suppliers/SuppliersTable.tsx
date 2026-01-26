import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Pencil, 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Truck,
  Plus,
  Search
} from 'lucide-react';
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

// agora vem do backend
import {
  Supplier,
  listSuppliers,
  deleteSupplier,
} from '@/lib/api/suppliers';

type SortField = 'codigo' | 'nome' | 'tipo' | 'cidade';
type SortDirection = 'asc' | 'desc';

export function SuppliersTable() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await listSuppliers();
        setSuppliers(data);
      } catch (err: any) {
        toast.error(err?.message ?? 'Erro ao carregar fornecedores');
      }
    }
    load();
  }, []);

  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.cnpj && supplier.cnpj.includes(searchTerm)) ||
    (supplier.cpf && supplier.cpf.includes(searchTerm))
  );

  const totalPages = Math.ceil(filteredSuppliers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const paginatedSuppliers = sortedSuppliers.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedSuppliers.map(s => s.id));
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

  // por enquanto só muda no front (igual fabricantes),
  // se depois tiver endpoint de ativar/desativar a gente pluga aqui
  const handleToggleActive = (id: string, checked: boolean) => {
    setSuppliers(prev => prev.map(s => 
      s.id === id ? { ...s, ativo: checked } : s
    ));
    toast.success(checked ? 'Fornecedor ativado' : 'Fornecedor desativado');
  };

  async function confirmDelete() {
    if (!deleteId) return;

    try {
      setLoadingDelete(true);
      await deleteSupplier(deleteId);

      setSuppliers(prev => prev.filter(s => s.id !== deleteId));
      toast.success('Fornecedor excluído com sucesso');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao excluir fornecedor');
    } finally {
      setLoadingDelete(false);
      setDeleteId(null);
    }
  }

  const isAllSelected = paginatedSuppliers.length > 0 && 
    paginatedSuppliers.every(s => selectedIds.includes(s.id));

  const getDocument = (supplier: Supplier) => {
    return supplier.tipo === 'juridica' ? supplier.cnpj : supplier.cpf;
  };

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
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Fornecedores</h1>
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
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="codigo">Código</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="nome">Nome</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="tipo">Tipo</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  Documento
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="cidade">Cidade</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  UF
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
              {paginatedSuppliers.map((supplier) => (
                <tr 
                  key={supplier.id} 
                  className={`table-row-hover border-b border-border last:border-b-0 ${
                    selectedIds.includes(supplier.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <Checkbox
                      checked={selectedIds.includes(supplier.id)}
                      onCheckedChange={(checked) => handleSelectOne(supplier.id, checked as boolean)}
                    />
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{supplier.codigo}</td>
                  <td className="p-4 text-sm font-medium text-foreground">{supplier.nome}</td>
                  <td className="p-4 text-sm text-muted-foreground capitalize">
                    {supplier.tipo === 'juridica' ? 'Jurídica' : 'Física'}
                  </td>
                  <td className="p-4 text-sm text-foreground">{getDocument(supplier)}</td>
                  <td className="p-4 text-sm text-muted-foreground">{supplier.cidade}</td>
                  <td className="p-4 text-sm text-muted-foreground">{supplier.uf}</td>
                  <td className="p-4 text-center">
                    <Switch
                      checked={supplier.ativo}
                      onCheckedChange={(checked) => handleToggleActive(supplier.id, checked)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => navigate(`/catalogo/fornecedores/${supplier.id}/editar`)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Editar fornecedor</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setDeleteId(supplier.id)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir fornecedor</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
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
              {filteredSuppliers.length > 0
                ? `${startIndex + 1}-${Math.min(endIndex, filteredSuppliers.length)} de ${filteredSuppliers.length}`
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
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fornecedor será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingDelete}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loadingDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loadingDelete ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Link to="/catalogo/fornecedores/novo" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

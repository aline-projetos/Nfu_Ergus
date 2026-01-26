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
  Factory,
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
import { Manufacturer, listManufacturers, deleteManufacturer, updateManufacturer } from '@/lib/api/manufacturers';
import { toast } from 'sonner';

type SortField = 'codigo' | 'nome' | 'cidade';
type SortDirection = 'asc' | 'desc';

export function ManufacturersTable() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState<string | null>(null);
  const navigate = useNavigate();

  // Carrega do backend
  useEffect(() => {
    async function load() {
      try {
        const data = await listManufacturers();
        setManufacturers(data);
      } catch (err: any) {
        toast.error(err.message ?? 'Erro ao carregar fabricantes');
      }
    }
    load();
  }, []);

  const filteredManufacturers = manufacturers.filter(manufacturer => 
    manufacturer.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (manufacturer.cnpj && manufacturer.cnpj.includes(searchTerm))
  );

  const totalPages = Math.ceil(filteredManufacturers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const sortedManufacturers = [...filteredManufacturers].sort((a, b) => {
    const aValue = (a as any)[sortField] || '';
    const bValue = (b as any)[sortField] || '';
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const paginatedManufacturers = sortedManufacturers.slice(startIndex, endIndex);

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
      setSelectedIds(paginatedManufacturers.map(m => m.id));
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

  // Toggle ativo -> chama backend
  const handleToggleActive = async (id: string, checked: boolean) => {
    const original = manufacturers.find(m => m.id === id);
    if (!original) return;

    // otimista
    setManufacturers(prev =>
      prev.map(m => (m.id === id ? { ...m, ativo: checked } : m))
    );
    setLoadingToggle(id);

    try {
      await updateManufacturer(id, {
        nome: original.nome,
        tipo: original.tipo,
        cnpj: original.cnpj ?? null,
        inscricao_estadual: original.inscricao_estadual ?? null,

        contatoPrincipalNome: original.contatoPrincipalNome ?? null,
        contatoPrincipalTelefone: original.contatoPrincipalTelefone ?? null,
        contatoPrincipalEmail: original.contatoPrincipalEmail ?? null,

        contatoSecundarioNome: original.contatoSecundarioNome ?? null,
        contatoSecundarioTelefone: original.contatoSecundarioTelefone ?? null,
        contatoSecundarioEmail: original.contatoSecundarioEmail ?? null,

        cep: original.cep ?? null,
        logradouro: original.logradouro ?? null,
        numero: original.numero ?? null,
        complemento: original.complemento ?? null,
        bairro: original.bairro ?? null,

        codigoCidade: original.codigoCidade ?? null,
        cidade: original.cidade,
        uf: original.uf,

        observacoes: original.observacoes ?? null,
        ativo: checked,
      });

      toast.success(checked ? 'Fabricante ativado' : 'Fabricante desativado');
    } catch (err: any) {
      // volta estado anterior
      setManufacturers(prev =>
        prev.map(m => (m.id === id ? { ...m, ativo: !checked } : m))
      );
      toast.error(err.message ?? 'Erro ao atualizar status do fabricante');
    } finally {
      setLoadingToggle(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      setLoadingDelete(true);
      await deleteManufacturer(deleteId);

      setManufacturers(prev => prev.filter(m => m.id !== deleteId));
      toast.success('Fabricante excluído com sucesso');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao excluir fabricante');
    } finally {
      setLoadingDelete(false);
      setDeleteId(null);
    }
  };

  const isAllSelected = paginatedManufacturers.length > 0 && 
    paginatedManufacturers.every(m => selectedIds.includes(m.id));

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
        {/* Header com busca */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Factory className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Fabricantes</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="input-field pl-10 w-64"
            />
          </div>
        </div>

        {/* Tabela */}
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
                  Tipo
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  CNPJ
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  Inscrição Estadual
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
              {paginatedManufacturers.map((manufacturer) => (
                <tr 
                  key={manufacturer.id} 
                  className={`table-row-hover border-b border-border last:border-b-0 ${
                    selectedIds.includes(manufacturer.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <Checkbox
                      checked={selectedIds.includes(manufacturer.id)}
                      onCheckedChange={(checked) => handleSelectOne(manufacturer.id, checked as boolean)}
                    />
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{manufacturer.codigo}</td>
                  <td className="p-4 text-sm font-medium text-foreground">{manufacturer.nome}</td>
                  <td className="p-4 text-sm text-muted-foreground capitalize">
                    {manufacturer.tipo === 'juridica' ? 'Jurídica' : 'Física'}
                  </td>
                  <td className="p-4 text-sm text-foreground">{manufacturer.cnpj || '-'}</td>
                  <td className="p-4 text-sm text-muted-foreground">{manufacturer.inscricao_estadual || '-'}</td>
                  <td className="p-4 text-sm text-muted-foreground">{manufacturer.cidade}</td>
                  <td className="p-4 text-sm text-muted-foreground">{manufacturer.uf}</td>
                  <td className="p-4 text-center">
                    <Switch
                      checked={manufacturer.ativo}
                      disabled={loadingToggle === manufacturer.id}
                      onCheckedChange={(checked) => handleToggleActive(manufacturer.id, checked as boolean)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => navigate(`/catalogo/fabricantes/${manufacturer.id}/editar`)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Editar fabricante</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setDeleteId(manufacturer.id)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir fabricante</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
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
              {filteredManufacturers.length > 0
                ? `${startIndex + 1}-${Math.min(endIndex, filteredManufacturers.length)} de ${filteredManufacturers.length}`
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
            <AlertDialogTitle>Excluir fabricante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fabricante será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingDelete}>Cancelar</AlertDialogCancel>
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

      <Link to="/catalogo/fabricantes/novo" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

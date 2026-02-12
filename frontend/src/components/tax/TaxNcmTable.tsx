import { Link, useNavigate } from 'react-router-dom';
import {
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Receipt,
  Plus,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/alert-dialog';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  Ncm, listNcm, createNcm, updateNcm, deleteNcm
} from '@/lib/api/taxNcm';

type SortField = 'code' | 'name';
type SortDirection = 'asc' | 'desc';

export function NcmTable() {
  const [ncm, setNcm] = useState<Ncm[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await listNcm();
        setNcm(data);
      } catch (err: any) {
        toast.error(err.message ?? 'Erro ao carregar Ncm`s');
      }
    }
    load();
  }, []);

  const totalPages = Math.ceil(ncm.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const sortedNcm = [...ncm].sort((a, b) => {
    const aValue = (a as any)[sortField] || '';
    const bValue = (b as any)[sortField] || '';
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const paginatedNcm = sortedNcm.slice(startIndex, endIndex);

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
      setSelectedIds(paginatedNcm.map(t => t.id));
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

  async function confirmDelete() {
    if (!deleteId) return;

    try {
      setLoadingDelete(true);
      await deleteNcm(deleteId);

      setNcm(prev => prev.filter(t => t.id !== deleteId));
      toast.success('Ncm excluído com sucesso');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao excluir ncm');
    } finally {
      setLoadingDelete(false);
      setDeleteId(null);
    }
  }

  const isAllSelected =
    paginatedNcm.length > 0 &&
    paginatedNcm.every(t => selectedIds.includes(t.id));

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
      {/* Header */}
      <div className="card-dashboard">
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Ncm
          </h1>
        </div>

        {/* Table */}
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
                  <SortButton field="code">Código</SortButton>
                </th>
                <th className="w-32 p-4 text-center text-sm font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedNcm.map(ncm => (
                <tr
                  key={ncm.id}
                  className={`table-row-hover border-b border-border last:border-b-0 ${
                    selectedIds.includes(ncm.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <Checkbox
                      checked={selectedIds.includes(ncm.id)}
                      onCheckedChange={checked =>
                        handleSelectOne(ncm.id, checked as boolean)
                      }
                    />
                  </td>
                  <td className="p-4 text-sm font-medium text-foreground">
                    {ncm.code}
                  </td>
                  <td className="p-4 text-sm text-foreground">{ncm.description}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {ncm.exVersion}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {ncm.createdAt}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              navigate(
                                `/fiscal/ncm/${ncm.id}/editar`,
                              )
                            }
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setDeleteId(ncm.id)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedNcm.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center text-sm text-muted-foreground"
                  >
                    Nenhum ncm cadastrado.
                  </td>
                </tr>
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
              onChange={e => {
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
              {ncm.length > 0
                ? `${startIndex + 1}-${Math.min(
                    endIndex,
                    ncm.length,
                  )} de ${ncm.length}`
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
                  setCurrentPage(prev => Math.max(1, prev - 1))
                }
                disabled={currentPage === 1}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage(prev => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog exclui */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ncm?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O ncm será removido
              permanentemente do sistema.
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

      {/* FAB */}
      <Link to="/fiscal/ncm/novo" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

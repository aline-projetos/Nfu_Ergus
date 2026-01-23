import { Link, useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Pencil, 
  Trash2, 
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  FileText,
  Plus
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
} from "@/components/ui/alert-dialog";
//import { Category, mockCategories } from '@/data/mockCategories';
import { Category, listCategories, deleteCategory, duplicateCategory } from '@/lib/api/categories';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type SortField = 'code' | 'name' | 'parentCode' | 'parentName';
type SortDirection = 'asc' | 'desc';

export function CategoriesTable() {
  const [categories, setCategories] = useState<Category[]>([]);
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
        const data = await listCategories();
        setCategories(data);
      } catch (err: any) {
        toast.error(err.message ?? 'Erro ao carregar categorias');
      }
    }
    load();
  }, []);


  const totalPages = Math.ceil(categories.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const sortedCategories = [...categories].sort((a, b) => {
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    const comparison = aValue.localeCompare(bValue);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const paginatedCategories = sortedCategories.slice(startIndex, endIndex);

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
      setSelectedIds(paginatedCategories.map(c => c.id));
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

  // const handleDelete = (id: string) => {
  //   setCategories(prev => prev.filter(c => c.id !== id));
  //   toast.success('Categoria excluída com sucesso');
  // };
  async function confirmDelete() {
    if (!deleteId) return;

    try {
      setLoadingDelete(true);
      await deleteCategory(deleteId);

      setCategories(prev => prev.filter(c => c.id !== deleteId));
      toast.success("Categoria excluída com sucesso");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao excluir categoria");
    } finally {
      setLoadingDelete(false);
      setDeleteId(null);
    }
  }

  const handleDuplicate = async (category: Category) => {
    try {
      const newCategory = await duplicateCategory(category.id);
      setCategories(prev => [...prev, newCategory]);
      toast.success("Categoria duplicada com sucesso");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao duplicar categoria");
    }
  };

  const isAllSelected = paginatedCategories.length > 0 && 
    paginatedCategories.every(c => selectedIds.includes(c.id));

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
      {/* Header */}
      <div className="card-dashboard">
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Categorias</h1>
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
                  <SortButton field="code">Código Categoria</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="name">Nome Categoria</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="parentCode">Código Categoria Pai</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  <SortButton field="parentName">Nome Categoria Pai</SortButton>
                </th>
                <th className="w-32 p-4 text-center text-sm font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedCategories.map((category) => (
                <tr 
                  key={category.id} 
                  className={`table-row-hover border-b border-border last:border-b-0 ${
                    selectedIds.includes(category.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <Checkbox
                      checked={selectedIds.includes(category.id)}
                      onCheckedChange={(checked) => handleSelectOne(category.id, checked as boolean)}
                    />
                  </td>
                  <td className="p-4 text-sm font-medium text-foreground">{category.code}</td>
                  <td className="p-4 text-sm text-foreground">{category.name}</td>
                  <td className="p-4 text-sm text-muted-foreground">{category.parentCode || '—'}</td>
                  <td className="p-4 text-sm text-muted-foreground">{category.parentName || '—'}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={() => handleDuplicate(category)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicar</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => navigate(`/catalogo/categorias/${category.id}/editar`)}
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
                            onClick={() => setDeleteId(category.id)}
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
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {startIndex + 1}-{Math.min(endIndex, categories.length)} de {categories.length}
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
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.  
              A categoria será removida permanentemente do sistema.
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
              {loadingDelete ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FAB */}
      <Link to="/catalogo/categorias/nova" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

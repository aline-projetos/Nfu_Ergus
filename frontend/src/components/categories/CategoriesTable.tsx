import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Copy, FileText, Plus } from 'lucide-react';
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
import { Category, listCategories, deleteCategory, duplicateCategory } from '@/lib/api/categories';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppDataTable, TableColumn } from '@/components/ui/AppDataTable';

export function CategoriesTable() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
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

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      setLoadingDelete(true);
      await deleteCategory(deleteId);
      setCategories(prev => prev.filter(c => c.id !== deleteId));
      toast.success('Categoria exclu\u00edda com sucesso');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao excluir categoria');
    } finally {
      setLoadingDelete(false);
      setDeleteId(null);
    }
  }

  const handleDuplicate = async (category: Category) => {
    try {
      const newCategory = await duplicateCategory(category.id);
      setCategories(prev => [...prev, newCategory]);
      toast.success('Categoria duplicada com sucesso');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao duplicar categoria');
    }
  };

  const columns: TableColumn[] = [
    { field: 'code', header: 'C\u00f3digo Categoria', sortable: true },
    { field: 'name', header: 'Nome Categoria', sortable: true },
    {
      field: 'parentCode', header: 'C\u00f3digo Categoria Pai', sortable: true,
      body: (row: Category) => <span>{row.parentCode || '\u2014'}</span>,
    },
    {
      field: 'parentName', header: 'Nome Categoria Pai', sortable: true,
      body: (row: Category) => <span>{row.parentName || '\u2014'}</span>,
    },
    {
      header: 'A\u00e7\u00f5es', style: { textAlign: 'center', width: '8rem' },
      body: (row: Category) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleDuplicate(row)}
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
                onClick={() => navigate(`/catalogo/categorias/${row.id}/editar`)}
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
                onClick={() => setDeleteId(row.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Excluir</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <AppDataTable
        title="Categorias"
        icon={<FileText className="w-5 h-5 text-primary" />}
        data={categories}
        columns={columns}
        emptyMessage="Nenhuma categoria encontrada."
        selection={selectedCategories}
        onSelectionChange={setSelectedCategories}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita. A categoria ser\u00e1 removida permanentemente do sistema.
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

      <Link to="/catalogo/categorias/nova" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

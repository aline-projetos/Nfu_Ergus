import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Receipt, Plus } from 'lucide-react';
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
import { Ncm, listNcm, deleteNcm } from '@/lib/api/taxNcm';
import { AppDataTable, TableColumn } from '@/components/ui/AppDataTable';

export function NcmTable() {
  const [ncmList, setNcmList] = useState<Ncm[]>([]);
  const [selectedNcm, setSelectedNcm] = useState<Ncm[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await listNcm();
        setNcmList(data);
      } catch (err: any) {
        toast.error(err.message ?? "Erro ao carregar NCM's");
      }
    }
    load();
  }, []);

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      setLoadingDelete(true);
      await deleteNcm(deleteId);
      setNcmList(prev => prev.filter(t => t.id !== deleteId));
      toast.success('NCM exclu\u00eddo com sucesso');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao excluir NCM');
    } finally {
      setLoadingDelete(false);
      setDeleteId(null);
    }
  }

  const columns: TableColumn[] = [
    { field: 'code', header: 'C\u00f3digo', sortable: true },
    { field: 'description', header: 'Descri\u00e7\u00e3o', sortable: true },
    { field: 'exVersion', header: 'EX', body: (row: Ncm) => <span>{row.exVersion ?? '-'}</span> },
    { field: 'createdAt', header: 'Criado em', body: (row: Ncm) => <span>{row.createdAt ?? '-'}</span> },
    {
      header: 'A\u00e7\u00f5es', style: { textAlign: 'center', width: '6rem' },
      body: (row: Ncm) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(`/fiscal/ncm/${row.id}/editar`)}
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
        title="NCM"
        icon={<Receipt className="w-5 h-5 text-primary" />}
        data={ncmList}
        columns={columns}
        emptyMessage="Nenhum NCM cadastrado."
        selection={selectedNcm}
        onSelectionChange={setSelectedNcm}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir NCM?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita. O NCM ser\u00e1 removido permanentemente do sistema.
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

      <Link to="/fiscal/ncm/novo" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

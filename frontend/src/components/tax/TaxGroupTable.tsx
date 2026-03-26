import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Receipt, Plus } from 'lucide-react';
import { InputSwitch } from 'primereact/inputswitch';
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
import { TaxGroup, listTaxGroups, deleteTaxGroup } from '@/lib/api/tax';
import { AppDataTable, TableColumn } from '@/components/ui/AppDataTable';

export function TaxGroupsTable() {
  const [taxGroups, setTaxGroups] = useState<TaxGroup[]>([]);
  const [selectedTaxGroups, setSelectedTaxGroups] = useState<TaxGroup[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await listTaxGroups();
        setTaxGroups(data);
      } catch (err: any) {
        toast.error(err.message ?? 'Erro ao carregar grupos de tributa\u00e7\u00e3o');
      }
    }
    load();
  }, []);

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      setLoadingDelete(true);
      await deleteTaxGroup(deleteId);
      setTaxGroups(prev => prev.filter(t => t.id !== deleteId));
      toast.success('Grupo de tributa\u00e7\u00e3o exclu\u00eddo com sucesso');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao excluir grupo de tributa\u00e7\u00e3o');
    } finally {
      setLoadingDelete(false);
      setDeleteId(null);
    }
  }

  const columns: TableColumn[] = [
    { field: 'code', header: 'C\u00f3digo', sortable: true },
    { field: 'name', header: 'Nome', sortable: true },
    { field: 'regime', header: 'Regime', sortable: true },
    { field: 'TipoProduto', header: 'Tipo de Produto', sortable: true },
    {
      header: 'Ativo', style: { textAlign: 'center' },
      body: (row: TaxGroup) => <InputSwitch checked={row.active} disabled />,
    },
    {
      header: 'A\u00e7\u00f5es', style: { textAlign: 'center', width: '6rem' },
      body: (row: TaxGroup) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(`/fiscal/tributacao/grupos/${row.id}/editar`)}
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
        title="Grupos de Tributa\u00e7\u00e3o"
        icon={<Receipt className="w-5 h-5 text-primary" />}
        data={taxGroups}
        columns={columns}
        emptyMessage="Nenhum grupo de tributa\u00e7\u00e3o cadastrado."
        selection={selectedTaxGroups}
        onSelectionChange={setSelectedTaxGroups}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo de tributa\u00e7\u00e3o?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita. O grupo ser\u00e1 removido permanentemente do sistema.
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

      <Link to="/fiscal/tributacao/grupos/novo" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

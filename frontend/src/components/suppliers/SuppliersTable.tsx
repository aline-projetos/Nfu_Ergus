import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Truck, Plus, Search } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Supplier, listSuppliers, deleteSupplier } from '@/lib/api/suppliers';
import { AppDataTable, TableColumn } from '@/components/ui/AppDataTable';

export function SuppliersTable() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Supplier[]>([]);
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

  const filteredSuppliers = suppliers.filter(s =>
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.cnpj && s.cnpj.includes(searchTerm)) ||
    (s.cpf && s.cpf.includes(searchTerm))
  );

  const handleToggleActive = (id: string, checked: boolean) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ativo: checked } : s));
    toast.success(checked ? 'Fornecedor ativado' : 'Fornecedor desativado');
  };

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      setLoadingDelete(true);
      await deleteSupplier(deleteId);
      setSuppliers(prev => prev.filter(s => s.id !== deleteId));
      toast.success('Fornecedor exclu\u00eddo com sucesso');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao excluir fornecedor');
    } finally {
      setLoadingDelete(false);
      setDeleteId(null);
    }
  }

  const getDocument = (s: Supplier) => s.tipo === 'juridica' ? s.cnpj : s.cpf;

  const toolbar = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Buscar por nome ou documento..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="input-field pl-10 w-64"
      />
    </div>
  );

  const columns: TableColumn[] = [
    { field: 'codigo', header: 'C\u00f3digo', sortable: true },
    {
      field: 'nome', header: 'Nome', sortable: true,
      body: (row: Supplier) => <span className="font-medium text-foreground">{row.nome}</span>,
    },
    {
      field: 'tipo', header: 'Tipo', sortable: true,
      body: (row: Supplier) => <span className="capitalize">{row.tipo === 'juridica' ? 'Jur\u00eddica' : 'F\u00edsica'}</span>,
    },
    { header: 'Documento', body: (row: Supplier) => <span>{getDocument(row)}</span> },
    { field: 'cidade', header: 'Cidade', sortable: true },
    { field: 'uf', header: 'UF' },
    {
      header: 'Ativo', style: { textAlign: 'center' },
      body: (row: Supplier) => (
        <InputSwitch
          checked={row.ativo}
          onChange={e => handleToggleActive(row.id, e.value)}
        />
      ),
    },
    {
      header: 'A\u00e7\u00f5es', style: { textAlign: 'center', width: '6rem' },
      body: (row: Supplier) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(`/catalogo/fornecedores/${row.id}/editar`)}
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
                onClick={() => setDeleteId(row.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Excluir fornecedor</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <AppDataTable
        title="Fornecedores"
        icon={<Truck className="w-5 h-5 text-primary" />}
        data={filteredSuppliers}
        columns={columns}
        emptyMessage="Nenhum fornecedor cadastrado."
        selection={selectedSuppliers}
        onSelectionChange={setSelectedSuppliers}
        toolbar={toolbar}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita. O fornecedor ser\u00e1 removido permanentemente do sistema.
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

      <Link to="/catalogo/fornecedores/novo" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

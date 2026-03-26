import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Factory, Plus, Search } from 'lucide-react';
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
import { Manufacturer, listManufacturers, deleteManufacturer, updateManufacturer } from '@/lib/api/manufacturers';
import { toast } from 'sonner';
import { AppDataTable, TableColumn } from '@/components/ui/AppDataTable';

export function ManufacturersTable() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState<Manufacturer[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const filteredManufacturers = manufacturers.filter(m =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.cnpj && m.cnpj.includes(searchTerm))
  );

  const handleToggleActive = async (id: string, checked: boolean) => {
    const original = manufacturers.find(m => m.id === id);
    if (!original) return;
    setManufacturers(prev => prev.map(m => m.id === id ? { ...m, ativo: checked } : m));
    setLoadingToggle(id);
    try {
      await updateManufacturer(id, {
        nome: original.nome, tipo: original.tipo, cnpj: original.cnpj ?? null,
        inscricao_estadual: original.inscricao_estadual ?? null,
        contatoPrincipalNome: original.contatoPrincipalNome ?? null,
        contatoPrincipalTelefone: original.contatoPrincipalTelefone ?? null,
        contatoPrincipalEmail: original.contatoPrincipalEmail ?? null,
        contatoSecundarioNome: original.contatoSecundarioNome ?? null,
        contatoSecundarioTelefone: original.contatoSecundarioTelefone ?? null,
        contatoSecundarioEmail: original.contatoSecundarioEmail ?? null,
        cep: original.cep ?? null, logradouro: original.logradouro ?? null,
        numero: original.numero ?? null, complemento: original.complemento ?? null,
        bairro: original.bairro ?? null, codigoCidade: original.codigoCidade ?? null,
        cidade: original.cidade, uf: original.uf,
        observacoes: original.observacoes ?? null, ativo: checked,
      });
      toast.success(checked ? 'Fabricante ativado' : 'Fabricante desativado');
    } catch (err: any) {
      setManufacturers(prev => prev.map(m => m.id === id ? { ...m, ativo: !checked } : m));
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
      toast.success('Fabricante exclu\u00eddo com sucesso');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao excluir fabricante');
    } finally {
      setLoadingDelete(false);
      setDeleteId(null);
    }
  };

  const toolbar = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Buscar por nome ou CNPJ..."
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
      body: (row: Manufacturer) => <span className="font-medium text-foreground">{row.nome}</span>,
    },
    {
      field: 'tipo', header: 'Tipo',
      body: (row: Manufacturer) => <span className="capitalize">{row.tipo === 'juridica' ? 'Jur\u00eddica' : 'F\u00edsica'}</span>,
    },
    { field: 'cnpj', header: 'CNPJ', body: (row: Manufacturer) => <span>{row.cnpj || '-'}</span> },
    { field: 'inscricao_estadual', header: 'Inscri\u00e7\u00e3o Estadual', body: (row: Manufacturer) => <span>{row.inscricao_estadual || '-'}</span> },
    { field: 'cidade', header: 'Cidade', sortable: true },
    { field: 'uf', header: 'UF' },
    {
      header: 'Ativo', style: { textAlign: 'center' },
      body: (row: Manufacturer) => (
        <InputSwitch
          checked={row.ativo}
          disabled={loadingToggle === row.id}
          onChange={e => handleToggleActive(row.id, e.value)}
        />
      ),
    },
    {
      header: 'A\u00e7\u00f5es', style: { textAlign: 'center', width: '6rem' },
      body: (row: Manufacturer) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(`/catalogo/fabricantes/${row.id}/editar`)}
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
                onClick={() => setDeleteId(row.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Excluir fabricante</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <AppDataTable
        title="Fabricantes"
        icon={<Factory className="w-5 h-5 text-primary" />}
        data={filteredManufacturers}
        columns={columns}
        emptyMessage="Nenhum fabricante cadastrado."
        selection={selectedManufacturers}
        onSelectionChange={setSelectedManufacturers}
        toolbar={toolbar}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fabricante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita. O fabricante ser\u00e1 removido permanentemente do sistema.
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

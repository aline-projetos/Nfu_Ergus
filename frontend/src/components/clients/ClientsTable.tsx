import { useState, useEffect } from 'react';
import { Pencil, Trash2, Users, Plus, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
import { getAuthHeaders, getBaseUrl } from '@/lib/utils';
import { AppDataTable, TableColumn } from '@/components/ui/AppDataTable';

interface ClientRow {
  id: string;
  name: string;
  document: string;
  document_type: 'CPF' | 'CNPJ';
  ativo: boolean;
}

export function ClientsTable() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClients, setSelectedClients] = useState<ClientRow[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      setIsLoading(true);
      try {
        const resp = await fetch(`${getBaseUrl()}/tenants`, {
          headers: getAuthHeaders(),
        });
        if (!resp.ok) throw new Error((await resp.text()) || 'Erro ao carregar clientes');

        const data: Array<{
          id: string; name: string; document: string;
          documentType: 'CPF' | 'CNPJ'; ativo: boolean;
        }> = await resp.json();

        setClients(data.map(item => ({
          id: item.id, name: item.name, document: item.document,
          document_type: item.documentType, ativo: item.ativo,
        })));
      } catch (err: any) {
        toast.error(err.message || 'Erro ao carregar clientes');
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document.includes(searchTerm)
  );

  const handleToggleActive = async (id: string, checked: boolean) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    setClients(prev => prev.map(c => c.id === id ? { ...c, ativo: checked } : c));
    try {
      const resp = await fetch(`${getBaseUrl()}/tenants/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: client.name, document: client.document,
          documentType: client.document_type, ativo: checked,
        }),
      });
      if (!resp.ok) throw new Error((await resp.text()) || 'Erro ao atualizar cliente');
      toast.success(checked ? 'Cliente ativado' : 'Cliente desativado');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar status do cliente');
      setClients(prev => prev.map(c => c.id === id ? { ...c, ativo: !checked } : c));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const resp = await fetch(`${getBaseUrl()}/tenants/${deleteId}`, {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      if (!resp.ok) throw new Error((await resp.text()) || 'Erro ao excluir cliente');
      toast.success('Cliente inativado com sucesso');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir cliente');
    } finally {
      setDeleteId(null);
    }
  };

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
    {
      field: 'name', header: 'Nome', sortable: true,
      body: (row: ClientRow) => <span className="font-medium text-foreground">{row.name}</span>,
    },
    { field: 'document', header: 'Documento', sortable: true },
    { field: 'document_type', header: 'Tipo Doc.', sortable: true },
    {
      header: 'Ativo', style: { textAlign: 'center' },
      body: (row: ClientRow) => (
        <InputSwitch
          checked={row.ativo}
          onChange={e => handleToggleActive(row.id, e.value)}
        />
      ),
    },
    {
      header: 'A\u00e7\u00f5es', style: { textAlign: 'center', width: '6rem' },
      body: (row: ClientRow) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(`/cadastros/admin/clientes/${row.id}/editar`)}
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
                onClick={() => setDeleteId(row.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Excluir cliente</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <AppDataTable
        title="Clientes"
        icon={<Users className="w-5 h-5 text-primary" />}
        data={filteredClients}
        columns={columns}
        loading={isLoading}
        emptyMessage="Nenhum cliente encontrado."
        selection={selectedClients}
        onSelectionChange={setSelectedClients}
        toolbar={toolbar}
      />

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta a\u00e7\u00e3o ir\u00e1 inativar o cliente no sistema.
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

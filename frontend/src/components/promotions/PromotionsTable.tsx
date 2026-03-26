import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Plus, Copy, Edit, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { listPromotions, Promotion } from '@/lib/api/promotions';
import { AppDataTable, TableColumn } from '@/components/ui/AppDataTable';

export function PromotionsTable() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromotions, setSelectedPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await listPromotions();
        setPromotions(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro inesperado ao carregar promo\u00e7\u00f5es';
        toast.error(`N\u00e3o foi poss\u00edvel carregar as promo\u00e7\u00f5es: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try { return format(new Date(dateStr), 'dd/MM/yyyy'); }
    catch { return dateStr; }
  };

  const columns: TableColumn[] = [
    {
      field: 'code', header: 'C\u00f3digo', sortable: true,
      body: (row: Promotion) => <span className="font-medium text-foreground">{row.code}</span>,
    },
    { field: 'name', header: 'Nome', sortable: true },
    {
      field: 'type', header: 'Tipo', sortable: true,
      body: (row: Promotion) => (
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
          row.type === 'subtract' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
        }`}>
          {row.type === 'subtract' ? 'Desconto' : 'Acr\u00e9scimo'}
        </span>
      ),
    },
    {
      field: 'start_date', header: 'In\u00edcio', sortable: true,
      body: (row: Promotion) => <span>{formatDate(row.start_date)}</span>,
    },
    {
      field: 'end_date', header: 'Fim', sortable: true,
      body: (row: Promotion) => <span>{formatDate(row.end_date)}</span>,
    },
    {
      field: 'value', header: 'Valor', sortable: true,
      body: (row: Promotion) => (
        <span>{row.use_percentage ? `${row.value}%` : `R$ ${Number(row.value ?? 0).toFixed(2)}`}</span>
      ),
    },
    {
      header: 'A\u00e7\u00f5es', style: { textAlign: 'right', width: '8rem' },
      body: (row: Promotion) => (
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <Copy className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Duplicar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(`/catalogo/promocoes/${row.id}/editar`)}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <Edit className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
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
        title="Promo\u00e7\u00f5es"
        icon={<Tag className="w-5 h-5 text-primary" />}
        data={promotions}
        columns={columns}
        loading={isLoading}
        emptyMessage="Nenhuma promo\u00e7\u00e3o cadastrada."
        selection={selectedPromotions}
        onSelectionChange={setSelectedPromotions}
      />

      <button
        onClick={() => navigate('/catalogo/promocoes/nova')}
        className="fab-button"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

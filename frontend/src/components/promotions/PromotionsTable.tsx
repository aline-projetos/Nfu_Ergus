import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Plus, Copy, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { mockPromotions, PromotionItem } from '@/data/mockPromotions';
import { format } from 'date-fns';

type SortField = 'code' | 'name' | 'type' | 'startDate' | 'endDate' | 'value';
type SortDirection = 'asc' | 'desc';

export function PromotionsTable() {
  const navigate = useNavigate();
  const [promotions] = useState<PromotionItem[]>(mockPromotions);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPromotions = [...promotions].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'code':
        comparison = a.code.localeCompare(b.code);
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'startDate':
        comparison = a.startDate.localeCompare(b.startDate);
        break;
      case 'endDate':
        comparison = a.endDate.localeCompare(b.endDate);
        break;
      case 'value':
        comparison = a.value - b.value;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedPromotions.length / rowsPerPage);
  const paginatedPromotions = sortedPromotions.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedPromotions.map(p => p.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-4 py-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="card-dashboard">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Tag className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Promoções</h1>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedPromotions.length && paginatedPromotions.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                  />
                </th>
                <SortableHeader field="code">Código</SortableHeader>
                <SortableHeader field="name">Nome</SortableHeader>
                <SortableHeader field="type">Tipo</SortableHeader>
                <SortableHeader field="startDate">Início</SortableHeader>
                <SortableHeader field="endDate">Fim</SortableHeader>
                <SortableHeader field="value">Valor</SortableHeader>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPromotions.map((promo) => (
                <tr
                  key={promo.id}
                  className={`table-row-hover border-t border-border ${
                    selectedRows.includes(promo.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(promo.id)}
                      onChange={() => handleSelectRow(promo.id)}
                      className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{promo.code}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{promo.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      promo.type === 'subtract' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {promo.type === 'subtract' ? 'Desconto' : 'Acréscimo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(promo.startDate)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(promo.endDate)}</td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {promo.usePercentage ? `${promo.value}%` : `R$ ${promo.value.toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <Copy className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicar</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Linhas por página:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-input rounded px-2 py-1 bg-background text-foreground"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, sortedPromotions.length)} de {sortedPromotions.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/catalogo/promocoes/nova')}
        className="fab-button"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

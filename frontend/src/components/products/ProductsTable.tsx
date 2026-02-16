import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Pencil,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Package,
  Plus,
  Grid3X3,
  X,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Product,
  listProducts,
  createProduct,
  deleteProduct
} from '@/lib/api/products';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type SortField = 'code' | 'description' | 'reference' | 'stock';
type SortDirection = 'asc' | 'desc';

// ✅ Ajuste: tipo simples para exibir no modal.
// Se você já tem o tipo no backend, troque por ele.
type ProductVariation = {
  id: string;
  product_id: string;
  combination: string;
  is_default: boolean;
  sku: string;
  ean?: string | null;
  active: boolean;
  details?: Record<string, any>;
};


export function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isLoading, setIsLoading] = useState(false);

  // ✅ NOVO: modal de variações
  const [isVariationsOpen, setIsVariationsOpen] = useState(false);
  const [variationsProduct, setVariationsProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [isVariationsLoading, setIsVariationsLoading] = useState(false);

  // ===== CARREGAR PRODUTOS DO BACKEND =====
  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await listProducts();
      setProducts(data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Erro inesperado ao carregar produtos';

      toast.error(`Não foi possível carregar as promoções: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const totalPages = Math.max(1, Math.ceil(products.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const sortedProducts = [...products].sort((a, b) => {
    const aValue = (a as any)[sortField];
    const bValue = (b as any)[sortField];

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    const aStr = String(aValue ?? '');
    const bStr = String(bValue ?? '');
    const comparison = aStr.localeCompare(bStr);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

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
      setSelectedIds(paginatedProducts.map(p => p.id));
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

  // ===== EXCLUIR PRODUTO NO BACKEND =====
  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setSelectedIds(prev => prev.filter(selId => selId !== id));
      toast.success('Produto excluído com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao carregar promoções';

      toast.error(`Não foi possível excluir o produto: ${message}`);
    }
  };

  // ===== DUPLICAR PRODUTO (CREATE NO BACKEND) =====
  const handleDuplicate = async (product: Product) => {
    try {
      const { id, ...rest } = product as any;

      const payload = {
        ...rest,
        code: `${(product as any).code}-COPY`,
        name: `${(product as any).name} (Cópia)`,
        variations: (product as any).variations ?? [],
      };

      const newProduct = await createProduct(payload);
      setProducts(prev => [...prev, newProduct]);
      toast.success('Produto duplicado com sucesso.');
    } catch (error) {
      console.error('Erro ao duplicar produto:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao carregar produtos';

      toast.error(`Não foi possível duplicar o produto: ${message}`);
    }
  };

  const isAllSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every(p => selectedIds.includes(p.id));

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

  // ✅ NOVO: abrir modal e carregar variações (por enquanto do próprio product)
  const openVariations = async (product: Product) => {
    setIsVariationsOpen(true);
    setVariationsProduct(product);
    setIsVariationsLoading(true);

    try {
      // 1) Se o backend já devolve as variações dentro do produto:
      const v = ((product as any).variations ?? []) as ProductVariation[];

      // 2) Se você tiver endpoint específico, troque por algo assim:
      // const v = await listProductVariations(product.id);

      setVariations(v);
    } catch (e) {
      console.error('Erro ao carregar variações:', e);
      toast.error('Não foi possível carregar as variações deste produto.');
      setVariations([]);
    } finally {
      setIsVariationsLoading(false);
    }
  };

  const closeVariations = () => {
    setIsVariationsOpen(false);
    setVariationsProduct(null);
    setVariations([]);
  };

  // ✅ Para montar colunas dinâmicas (cor/tamanho/sabor/etc)
  const variationAttributeKeys = Array.from(
    new Set(
      variations.flatMap(v => Object.keys(v.details ?? {}))
    )
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="card-dashboard">
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-foreground">Produtos</h1>
            {isLoading && (
              <span className="text-xs text-muted-foreground">
                Carregando produtos...
              </span>
            )}
          </div>
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
                  <SortButton field="code">Código Produto</SortButton>
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  {/* seu SortField não tem "name" tipado, mas mantive como estava */}
                  <SortButton field={'description' as SortField}>Nome Produto</SortButton>
                </th>

                {/* ✅ NOVO: coluna Variações */}
                <th className="w-28 p-4 text-center text-sm font-medium text-muted-foreground">
                  Variações
                </th>

                <th className="w-32 p-4 text-center text-sm font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedProducts.map((product) => (
                <tr
                  key={product.id}
                  className={`table-row-hover border-b border-border last:border-b-0 ${
                    selectedIds.includes(product.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(product.id, checked as boolean)
                      }
                    />
                  </td>

                  <td className="p-4 text-sm font-medium text-foreground">
                    {(product as any).code}
                  </td>

                  <td className="p-4 text-sm text-foreground">
                    {(product as any).name}
                  </td>

                  {/* ✅ NOVO: botão grid abre modal */}
                  <td className="p-4">
                    <div className="flex items-center justify-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => openVariations(product)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Ver variações</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(product)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicar</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            to={`/catalogo/produtos/${product.id}/editar`}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id)}
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

              {!isLoading && products.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum produto encontrado.
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
              {products.length === 0
                ? '0-0 de 0'
                : `${startIndex + 1}-${Math.min(endIndex, products.length)} de ${products.length}`}
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

      {/* FAB */}
      <Link to="/catalogo/produtos/novo" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>

      {/* ✅ MODAL: Grid de Variações */}
      <Dialog open={isVariationsOpen} onOpenChange={(open) => (open ? null : closeVariations())}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>
                Variações — {(variationsProduct as any)?.name ?? ''}
              </DialogTitle>

              <Button variant="ghost" size="icon" onClick={closeVariations}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="mt-2">
            {isVariationsLoading ? (
              <div className="text-sm text-muted-foreground">
                Carregando variações...
              </div>
            ) : variations.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Nenhuma variação cadastrada para este produto.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">SKU</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Código</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Nome</th>

                      {variationAttributeKeys.map((k) => (
                        <th key={k} className="p-3 text-left text-sm font-medium text-muted-foreground">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {variations.map((v) => (
                      <tr key={v.id} className="border-b border-border last:border-b-0">
                        <td className="p-3 text-sm text-foreground">{v.sku ?? '-'}</td>
                        <td className="p-3 text-sm text-foreground">{v.combination ?? '-'}</td>
                        <td className="p-3 text-sm text-foreground">
                          {v.is_default ? 'Sim' : 'Não'}
                        </td>

                        {variationAttributeKeys.map((k) => (
                          <td key={k} className="p-3 text-sm text-foreground">
                            {v.details?.[k] ?? '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

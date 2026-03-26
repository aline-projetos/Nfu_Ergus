import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Grid3X3, Package, Plus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Product, listProducts, deleteProduct } from '@/lib/api/products';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppDataTable, TableColumn } from '@/components/ui/AppDataTable';

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
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVariationsOpen, setIsVariationsOpen] = useState(false);
  const [variationsProduct, setVariationsProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [isVariationsLoading, setIsVariationsLoading] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const data = await listProducts();
        setProducts(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro inesperado';
        toast.error(`N\u00e3o foi poss\u00edvel carregar os produtos: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setSelectedProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Produto exclu\u00eddo com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado';
      toast.error(`N\u00e3o foi poss\u00edvel excluir o produto: ${message}`);
    }
  };

  const openVariations = async (product: Product) => {
    setIsVariationsOpen(true);
    setVariationsProduct(product);
    setIsVariationsLoading(true);
    try {
      const v = ((product as any).variations ?? []) as ProductVariation[];
      setVariations(v);
    } catch {
      toast.error('N\u00e3o foi poss\u00edvel carregar as varia\u00e7\u00f5es deste produto.');
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

  const variationAttributeKeys = Array.from(
    new Set(variations.flatMap(v => Object.keys(v.details ?? {})))
  );

  const columns: TableColumn[] = [
    {
      field: 'code', header: 'C\u00f3digo Produto', sortable: true,
      body: (row: any) => <span className="font-medium text-foreground">{row.code}</span>,
    },
    { field: 'name', header: 'Nome Produto', sortable: true },
    {
      header: 'Varia\u00e7\u00f5es', style: { textAlign: 'center', width: '7rem' },
      body: (row: Product) => (
        <div className="flex items-center justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => openVariations(row)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <Grid3X3 className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Ver varia\u00e7\u00f5es</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
    {
      header: 'A\u00e7\u00f5es', style: { textAlign: 'center', width: '6rem' },
      body: (row: Product) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={`/catalogo/produtos/${row.id}/editar`}
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
                onClick={() => handleDelete(row.id)}
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
        title="Produtos"
        icon={<Package className="w-5 h-5 text-primary" />}
        data={products}
        columns={columns}
        loading={isLoading}
        emptyMessage="Nenhum produto encontrado."
        selection={selectedProducts}
        onSelectionChange={setSelectedProducts}
      />

      <Link to="/catalogo/produtos/novo" className="fab-button">
        <Plus className="w-6 h-6" />
      </Link>

      <Dialog open={isVariationsOpen} onOpenChange={open => !open && closeVariations()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Varia\u00e7\u00f5es \u2014 {(variationsProduct as any)?.name ?? ''}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {isVariationsLoading ? (
              <div className="text-sm text-muted-foreground">Carregando varia\u00e7\u00f5es...</div>
            ) : variations.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma varia\u00e7\u00e3o cadastrada para este produto.</div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">SKU</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Nome</th>
                      {variationAttributeKeys.map(k => (
                        <th key={k} className="p-3 text-left text-sm font-medium text-muted-foreground">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {variations.map(v => (
                      <tr key={v.id} className="border-b border-border last:border-b-0">
                        <td className="p-3 text-sm text-foreground">{v.sku ?? '-'}</td>
                        <td className="p-3 text-sm text-foreground">{v.combination ?? '-'}</td>
                        {variationAttributeKeys.map(k => (
                          <td key={k} className="p-3 text-sm text-foreground">{v.details?.[k] ?? '-'}</td>
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

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Package, Check, X, CheckCircle2, Info, Search, Plus, Calendar, Image, Grid3X3, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { fiscalOrigins, Promotion } from '@/data/mockProducts';
import {
  Product,
  createProductWizard,
  updateProductWizard,
  getProductById,
  type ProductWizardCreateInput,
  type ProductWizardUpdateInput,
  ProductVariationCreateInput,
  VariationDetails,
} from '@/lib/api/products';

import {
  searchCategories,
  searchManufacturers,
  searchSuppliers,
  Category,
  Manufacturer,
  Supplier,
  getCategoryById,
  getSupplierById,
  getManufacturerById,
} from '@/lib/api/lookups';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VariationModel1Modal } from './VariationModal';
import { VariationImageModal, type VariationImage } from './VariationImageModal';
import { VariationDetailsModal } from './VariationDetailsModal';
import { Badge } from '@/components/ui/badge';
import { UNIT_OPTIONS } from './ProductUtils';

interface FormData {
  // ====== Produto (pai / agrupador) ======
  code: string; // só leitura no edit
  name: string;

  categoryId: string;
  categoryName: string; // campo de busca/visual
  supplierId: string;
  supplierName: string; // campo de busca/visual
  manufacturerId: string;
  manufacturerName: string; // campo de busca/visual

  taxGroupId: string;
  ncmId: string;
  cestId: string;
  fiscalOrigin: string;

  videoLink: string;
  otherLinks: string;

  // ====== Variação DEFAULT (base) ======
  // esses campos representam a variação default e também os defaults do produto
  sku: string;
  ean: string;
  reference: string;

  salePrice: string; // price
  costPrice: string; // cost_price

  weight: string;
  length: string;
  height: string;
  width: string;

  active: boolean;

  // ====== Campos só de UI (não vão direto pro wizard) ======
  stock: string; // só exibição

  unit: string;
  shortDescription: string;
  longDescription: string;
  metaTitle: string;
  metaTag: string;
  metaDescription: string;

  // promoção (UI) – o que realmente vai pro backend é promotion_id
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  promotionStart: string;
  promotionEnd: string;

  // descrições auxiliares fiscais (UI)
  ncmDescription: string;
  cestDescription: string;
  pisCode: string;
  pisDescription: string;
  cofinsCode: string;
  cofinsDescription: string;
}


const initialFormData: FormData = {
  // pai
  code: '',
  name: '',
  categoryId: '',
  categoryName: '',
  supplierId: '',
  supplierName: '',
  manufacturerId: '',
  manufacturerName: '',
  taxGroupId: '',
  ncmId: '',
  cestId: '',
  fiscalOrigin: '',
  videoLink: '',
  otherLinks: '',

  // variação default / base
  sku: '',
  ean: '',
  reference: '',
  salePrice: '',
  costPrice: '',
  weight: '',
  length: '',
  height: '',
  width: '',
  active: true,

  // UI
  stock: '',
  unit: '',
  shortDescription: '',
  longDescription: '',
  metaTitle: '',
  metaTag: '',
  metaDescription: '',

  promotionId: '',
  promotionCode: '',
  promotionName: '',
  promotionStart: '',
  promotionEnd: '',

  ncmDescription: '',
  cestDescription: '',
  pisCode: '',
  pisDescription: '',
  cofinsCode: '',
  cofinsDescription: '',
};


const steps = [
  { id: 1, label: 'Dados Principais' },
  { id: 2, label: 'Configurações' },
  { id: 3, label: 'Regra Comercial' },
  { id: 4, label: 'Tributação' },
  { id: 5, label: 'Variações' },
  { id: 6, label: 'Integração' },
];

interface VariationCard {
  id: string;
  description: string;
  position: string;
  url: string;
}

const SearchInput = ({
    value,
    onChange,
    placeholder,
    error,
    onSearch,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    error?: boolean;
    onSearch?: (term: string) => void;
  }) => (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input-field pr-10 ${error ? 'error' : ''}`}
      />
      <button
        type="button"
        onClick={() => onSearch?.(value)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted transition-colors"
      >
        <Search className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );


export function ProductWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [model1Open, setModel1Open] = useState(false);

  const [savedVariations, setSavedVariations] = useState<Array<{
    combination: string;
    sku: string;
    ean: string;
    price: string;
    stock: string;
    active?: boolean; 
    images?: VariationImage[];
    currentImageIndex?: number;
    details?: VariationDetails;
  }>>([]);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalCombination, setImageModalCombination] = useState('');
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [categoryResults, setCategoryResults] = useState<Category[]>([]);
  const [manufacturerResults, setManufacturerResults] = useState<Manufacturer[]>([]);
  const [supplierResults, setSupplierResults] = useState<Supplier[]>([]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isManufacturerModalOpen, setIsManufacturerModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

    // Imagens do PRODUTO (Step 2)
  const [productImages, setProductImages] = useState<VariationImage[]>([]);
  const [productImageIndex, setProductImageIndex] = useState(0);
  const [productImageModalOpen, setProductImageModalOpen] = useState(false);

  function getOrderedImages(images: VariationImage[]): VariationImage[] {
    const primary = images.filter((i) => i.isPrimary);
    const rest = images
      .filter((i) => !i.isPrimary)
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    return [...primary, ...rest];
  }

  const orderedProductImages = useMemo(
    () => getOrderedImages(productImages || []),
    [productImages]
  );

  const currentProductImage = orderedProductImages[productImageIndex] || null;
  const productHasImages = orderedProductImages.length > 0;
  const productHasMultiple = orderedProductImages.length > 1;

  const openProductImageModal = () => setProductImageModalOpen(true);

  const saveProductImages = (images: VariationImage[]) => {
    setProductImages(images);
    setProductImageIndex(0);
  };

  const navigateProductImage = (direction: number) => {
    setProductImageIndex(prev => {
      const list = orderedProductImages;
      if (list.length <= 1) return 0;
      let next = prev + direction;
      if (next < 0) next = list.length - 1;
      if (next >= list.length) next = 0;
      return next;
    });
  };

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsModalCombination, setDetailsModalCombination] = useState('');
  const [detailsModalData, setDetailsModalData] = useState<VariationDetails>({});

  const openDetailsModal = (combination: string) => {
    setDetailsModalCombination(combination);

    // pega a variação atual (se já existir)
    const variation = savedVariations.find(v => v.combination === combination);

    // base puxando do produto pai (formData)
    const baseFromProduct: VariationDetails = {
      descriptionShort: formData.shortDescription || '',
      descriptionLong: formData.longDescription || '',
      metaTitle: formData.metaTitle || '',
      metaTag: formData.metaTag || '',
      metaDescription: formData.metaDescription || '',
      videoLink: formData.videoLink || '',
      otherLinks: formData.otherLinks || '',
    };

    // se a variação já tiver detalhes, eles sobrescrevem o base
    const merged: VariationDetails = {
      ...baseFromProduct,
      ...(variation?.details || {}),
    };

    setDetailsModalData(merged);
    setDetailsModalOpen(true);
  };

  const saveDetailsForVariation = (combination: string, details: VariationDetails) => {
    setSavedVariations(prev =>
      prev.map(v => (v.combination === combination ? { ...v, details } : v))
    );
  };

  const hasDetails = (details?: VariationDetails): boolean => {
    if (!details) return false;
    return Object.values(details).some(v => v && v.trim() !== '');
  };


  const openImageModal = (combination: string) => {
    setImageModalCombination(combination);
    setImageModalOpen(true);
  };
  const saveImagesForVariation = (combination: string, images: VariationImage[]) => {
    setSavedVariations(prev =>
      prev.map(v => (v.combination === combination ? { ...v, images, currentImageIndex: 0 } : v))
    );
  };
  const navigateImage = (combination: string, direction: number) => {
    setSavedVariations(prev =>
      prev.map(v => {
        if (v.combination !== combination) return v;
        const ordered = getOrderedImages(v.images || []);
        if (ordered.length <= 1) return v;
        const currentIdx = v.currentImageIndex ?? 0;
        let next = currentIdx + direction;
        if (next < 0) next = ordered.length - 1;
        if (next >= ordered.length) next = 0;
        return { ...v, currentImageIndex: next };
      })
    );
  };

  const toggleSavedVariationActive = (combination: string) => {
    setSavedVariations(prev =>
      prev.map(v => v.combination === combination ? { ...v, active: !(v.active ?? true) } : v)
    );
  };

  const deleteSavedVariation = (combination: string) => {
    setSavedVariations(prev => prev.filter(v => v.combination !== combination));
    toast.success('Variação removida');
  };


  // ========== helpers de mapeamento para o backend ==========

  const mapProductToFormData = (product: Product): FormData => {
  const p = product as any;
  const variations = Array.isArray(p.variations) ? p.variations : [];
  const def = variations.find((v: any) => v.is_default) || variations[0] || null;

  return {
    ...initialFormData,

    // ====== Produto pai ======
    code: p.code ?? '',
    name: p.name ?? '',

    categoryId: p.category_id ?? '',
    categoryName: '', // preenchido só na busca
    supplierId: p.supplier_id ?? '',
    supplierName: '',
    manufacturerId: p.manufacturer_id ?? '',
    manufacturerName: '',

    taxGroupId: p.tax_group_id ?? '',
    ncmId: p.ncm_id ?? '',
    cestId: p.cest_id ?? '',
    fiscalOrigin: p.fiscal_origin ?? '',

    videoLink: p.video_link ?? '',
    otherLinks: p.other_links ?? '',

    // SEO / descrições (produto pai)
    unit: p.unit ?? '',
    shortDescription: p.short_description ?? '',
    longDescription: p.long_description ?? '',
    metaTitle: p.meta_title ?? '',
    metaTag: p.meta_tag ?? '',
    metaDescription: p.meta_description ?? '',

    promotionId: p.promotion_id ?? '',
    // promotionCode/Name/Start/End continuam só como UI
    // (você pode preencher aqui se tiver isso salvo em outro lugar)

    // ====== Variação default (se existir) ======
    sku: def?.sku ?? '',
    ean: def?.ean ?? '',
    reference: p.reference ?? '',

    salePrice:
      def?.price != null
        ? String(def.price)
        : p.price != null
        ? String(p.price)
        : '',
    costPrice:
      def?.cost_price != null
        ? String(def.cost_price)
        : p.cost_price != null
        ? String(p.cost_price)
        : '',

    weight:
      def?.weight != null
        ? String(def.weight)
        : p.weight != null
        ? String(p.weight)
        : '',
    length:
      def?.length != null
        ? String(def.length)
        : p.length != null
        ? String(p.length)
        : '',
    height:
      def?.height != null
        ? String(def.height)
        : p.height != null
        ? String(p.height)
        : '',
    width:
      def?.width != null
        ? String(def.width)
        : p.width != null
        ? String(p.width)
        : '',

    active:
      def?.active != null
        ? Boolean(def.active)
        : p.active != null
        ? Boolean(p.active)
        : true,

    // estoque é só visual por enquanto
    stock: '',

    // campos fiscais/descrições extras continuam vazios
    ncmDescription: '',
    cestDescription: '',
    pisCode: '',
    pisDescription: '',
    cofinsCode: '',
    cofinsDescription: '',
  };
};


  // ====== payload wizard (novo modelo) ======
  // ====== payload wizard (novo modelo) ======
const buildCreatePayload = (data: FormData): ProductWizardCreateInput => {
  // base = produto pai + campos herdáveis
  const base: ProductWizardCreateInput = {
    // produto pai
    name: data.name.trim(),

    reference: data.reference.trim(),
    sku: data.sku.trim(),
    ean: data.ean?.trim() || null,

    // herdáveis (defaults)
    price: data.salePrice || null,
    cost_price: data.costPrice || null,
    weight: data.weight || null,
    length: data.length || null,
    height: data.height || null,
    width: data.width || null,

    active: data.active,

    // descrições / SEO (snake_case pra bater com backend)
    unit: data.unit || undefined,
    short_description: data.shortDescription || undefined,
    long_description: data.longDescription || undefined,
    meta_title: data.metaTitle || undefined,
    meta_tag: data.metaTag || undefined,
    meta_description: data.metaDescription || undefined,

    // vínculos
    promotion_id: data.promotionId || null,
    category_id: data.categoryId || null,
    supplier_id: data.supplierId || null,
    manufacturer_id: data.manufacturerId || null,

    // fiscais
    tax_group_id: data.taxGroupId || null,
    ncm_id: data.ncmId || null,
    cest_id: data.cestId || null,
    fiscal_origin: data.fiscalOrigin || null,

    // mídia / links
    video_link: data.videoLink || null,
    other_links: data.otherLinks || null,

    // imagens default do produto (variação default herda isso no backend)
    default_images: productImages || [],

    // variações virão logo abaixo
    variations: [],
  };

  const parentImages = productImages || [];

  // ===========================
  // CASO 1 – SEM grade: produto simples
  // ===========================
  if (!savedVariations || savedVariations.length === 0) {
    const defaultVariation: ProductVariationCreateInput = {
      sku: data.sku.trim(),
      ean: data.ean?.trim() || null,

      price: data.salePrice || null,
      cost_price: data.costPrice || null,
      weight: data.weight || null,
      length: data.length || null,
      height: data.height || null,
      width: data.width || null,

      active: data.active,
      is_default: true,

      combination: 'DEFAULT',
      details: null,
      images: parentImages,
    };

    return {
      ...base,
      variations: [defaultVariation],
    };
  }

  // ===========================
  // CASO 2 – COM grade: várias variações
  // ===========================
  const mapped: ProductVariationCreateInput[] = savedVariations.map((v) => ({
    sku: v.sku?.trim() || '',
    ean: v.ean?.trim() || null,

    // se não quiser sobrescrever, poderia mandar null aqui
    price: v.price || null,
    // cost_price/dimensões podem ser herdados do pai → deixamos null/undefined
    cost_price: null,
    weight: null,
    length: null,
    height: null,
    width: null,

    active: v.active ?? true,
    is_default: false,

    combination: v.combination || null,
    details: v.details || null,
    images: v.images || [],
  }));

  return {
    ...base,
    variations: mapped,
  };
};


const buildUpdatePayload = (data: FormData): ProductWizardUpdateInput => {
  return buildCreatePayload(data) as unknown as ProductWizardUpdateInput;
};


  // ========== efeitos: carregar produto ao editar ==========

  useEffect(() => {
    const loadProduct = async () => {
      if (!isEditing || !id) return;
      try {
        setIsLoadingProduct(true);
        const product = await getProductById(id);
        setFormData(mapProductToFormData(product));

        const [cat, sup, man] = await Promise.all([
          product.category_id ? getCategoryById(product.category_id) : Promise.resolve(null),
          product.supplier_id ? getSupplierById(product.supplier_id) : Promise.resolve(null),
          product.manufacturer_id ? getManufacturerById(product.manufacturer_id) : Promise.resolve(null),
        ]);

        setFormData(prev => ({
          ...prev,
          categoryId: product.category_id ?? null,
          categoryCode: cat?.code ?? "",
          categoryName: cat ? `${cat.code} - ${cat.name}` : "",

          supplierId: product.supplier_id ?? null,
          supplierCode: sup?.codigo ?? "",
          supplierName: sup ? `${sup.codigo} - ${sup.nome}` : "",

          manufacturerId: product.manufacturer_id ?? null,
          manufacturerCode: man?.codigo ?? "",
          manufacturerName: man ? `${man.codigo} - ${man.nome}` : "",
        }));

        const variations = (product as any).variations || [];
        const def = variations.find((v: any) => v.is_default) || variations[0];
        setProductImages((def?.images || []) as VariationImage[]);
        setProductImageIndex(0);

        // se tiver variações além da default, popula a grade do step 5
        const nonDefault = variations.filter((v: any) => !v.is_default);
        if (nonDefault.length > 0) {
          setSavedVariations(
            nonDefault.map((v: any) => ({
              combination: v.combination || '',
              sku: v.sku || '',
              ean: v.ean || '',
              price: v.price != null ? String(v.price) : '',
              stock: '', // estoque não usa
              active: v.active ?? true,
              images: (v.images || []) as VariationImage[],
              currentImageIndex: 0,
              details: (v.details || {}) as VariationDetails,
            }))
          );
        } else {
          setSavedVariations([]);
        }

      } catch (error) {
        console.error('Erro ao carregar produto:', error);

        const message =
          error instanceof Error
            ? error.message
            : 'Erro inesperado ao carregar dados';

        toast.error(`Não foi possível carregar dados: ${message}`);
      } finally {
        setIsLoadingProduct(false);
      }
    };

    loadProduct();
  }, [isEditing, id]);

  // ========== helpers gerais do formulário ==========

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNumericInput = (field: keyof FormData, value: string) => {
    const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    updateField(field, numericValue);
  };

  const validateStep1 = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'Sku é obrigatório';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Object.values(newErrors).forEach(error => {
        if (error) toast.error(error);
      });
      return false;
    }
    return true;
  };

  // ========== salvar (create/update) ==========

  const saveProduct = async () => {
    if (!validateStep1()) return;

    try {
      setIsSaving(true);

      const payload = isEditing ? buildUpdatePayload(formData) : buildCreatePayload(formData);

      if (isEditing && id) {
        await updateProductWizard(id, payload);
        toast.success('Produto atualizado com sucesso');
      } else {
        await createProductWizard(payload);
        toast.success('Produto cadastrado com sucesso');
      }

      navigate('/catalogo/produtos');
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      const message =
        error instanceof Error ? error.message : 'Erro inesperado ao salvar';
      toast.error(`Não foi possível salvar: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };


  // ========== navegação do wizard ==========

  const handleConfirm = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
        setVisitedSteps(prev => [...new Set([...prev, 2])]);
      }
    } else if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      setVisitedSteps(prev => [...new Set([...prev, currentStep + 1])]);
    } else {
      void saveProduct();
    }
  };

  const handleCancel = () => {
    navigate('/catalogo/produtos');
  };

  const handleStepClick = (stepId: number) => {
    if (visitedSteps.includes(stepId) && stepId < currentStep) {
      setCurrentStep(stepId);
    }
  };

  const handleAddPromotion = () => {
    if (!formData.promotionCode || !formData.promotionName) {
      toast.error('Preencha o código e nome da promoção');
      return;
    }

    const newPromotion: Promotion = {
      id: String(Date.now()),
      code: formData.promotionCode,
      name: formData.promotionName,
      startDate: formData.promotionStart,
      endDate: formData.promotionEnd,
    };

    setPromotions(prev => [...prev, newPromotion]);
    setFormData(prev => ({
      ...prev,
      promotionCode: '',
      promotionName: '',
      promotionStart: '',
      promotionEnd: '',
    }));
    toast.success('Promoção adicionada');
  };

  const removePromotion = (promoId: string) => {
    setPromotions(prev => prev.filter(p => p.id !== promoId));
  };

  // ========== buscas e seleção: Categoria / Fabricante / Fornecedor ==========

  const handleSearchCategory = async () => {
    try {
      const term = formData.categoryName.trim();

      if (!term) {
        toast.error('Informe o nome ou código da categoria para buscar');
        return;
      }

      const results = await searchCategories(term, 1, 20);

      if (results.length === 0) {
        toast.error('Nenhuma categoria encontrada');
        setCategoryResults([]);
        setIsCategoryModalOpen(false);
        return;
      }

      if (results.length === 1) {
        const cat = results[0];
        setFormData(prev => ({
          ...prev,
          categoryId: cat.id,
          // aqui você pode exibir código + nome no campo, igual faz no modal
          categoryName: `${cat.code} - ${cat.name}`,
          // se ainda quiser manter o code internamente:
          categoryCode: cat.code,
        }));
        toast.success('Categoria selecionada');
        return;
      }

      setCategoryResults(results);
      setCategoryFilter('');
      setIsCategoryModalOpen(true);
    } catch (err) {
      console.error('Erro ao buscar categorias', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Erro inesperado ao carregar categorias';

      toast.error(`Erro ao buscar categorias: ${message}`);
    }
  };

  const handleSelectCategory = (cat: Category) => {
    setFormData(prev => ({
      ...prev,
      categoryId: cat.id,
      categoryCode: cat.code,
      categoryName: `${cat.code} - ${cat.name}`,
    }));
    setIsCategoryModalOpen(false);
  };

  // FABRICANTE
  const handleSearchManufacturer = async () => {
    try {
      const term = formData.manufacturerName.trim();

      if (!term) {
        toast.error('Informe o nome ou código do fabricante para buscar');
        return;
      }

      const results = await searchManufacturers(term, 1, 20);

      if (results.length === 0) {
        toast.error('Nenhum fabricante encontrado');
        setManufacturerResults([]);
        setIsManufacturerModalOpen(false);
        return;
      }

      if (results.length === 1) {
        const mf = results[0];
        setFormData(prev => ({
          ...prev,
          manufacturerId: mf.id,
          manufacturerName: mf.nome,
        }));
        toast.success('Fabricante selecionado');
        return;
      }

      setManufacturerResults(results);
      setManufacturerFilter('');
      setIsManufacturerModalOpen(true);
    } catch (err) {
      console.error('Erro ao buscar fabricantes', err);
      const message =
          err instanceof Error
            ? err.message
            : 'Erro inesperado ao carregarfabricantes';

      toast.error(`Erro ao buscar fabricantes: ${message}`);
    }
  };

  const handleSelectManufacturer = (mf: Manufacturer) => {
    setFormData(prev => ({
      ...prev,
      manufacturerId: mf.id,
      manufacturerName: mf.nome,
    }));
    setIsManufacturerModalOpen(false);
  };

  // FORNECEDOR
  const handleSearchSupplier = async () => {
    try {
      const term = formData.supplierName.trim();

      if (!term) {
        toast.error('Informe o nome ou código do fornecedor para buscar');
        return;
      }

      const results = await searchSuppliers(term, 1, 20);

      if (results.length === 0) {
        toast.error('Nenhum fornecedor encontrado');
        setSupplierResults([]);
        setIsSupplierModalOpen(false);
        return;
      }

      if (results.length === 1) {
        const sp = results[0];
        setFormData(prev => ({
          ...prev,
          supplierId: sp.id,
          supplierName: sp.nome,
        }));
        toast.success('Fornecedor selecionado');
        return;
      }

      setSupplierResults(results);
      setSupplierFilter('');
      setIsSupplierModalOpen(true);
    } catch (err) {
      console.error('Erro ao buscar fornecedores', err);

      const message =
          err instanceof Error
            ? err.message
            : 'Erro inesperado ao carregar fornecedores';

      toast.error(`Erro ao buscar fornecedores: ${message}`);
    }
  };

  const handleSelectSupplier = (sp: Supplier) => {
    setFormData(prev => ({
      ...prev,
      supplierId: sp.id,
      supplierName: sp.nome,
    }));
    setIsSupplierModalOpen(false);
  };
  
  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="card-dashboard">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-foreground">
              {isEditing ? 'Editar Produto' : 'Novo Produto'}
            </h1>
            {isLoadingProduct && (
              <span className="text-xs text-muted-foreground mt-1">
                Carregando dados do produto...
              </span>
            )}
          </div>
        </div>

        <div className="flex">
          {/* Stepper */}
          <div className="w-64 border-r border-border p-6">
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isCompleted =
                  visitedSteps.includes(step.id) && step.id < currentStep;
                const isActive = step.id === currentStep;
                const canClick = visitedSteps.includes(step.id) && step.id < currentStep;

                return (
                  <div key={step.id}>
                    <button
                      onClick={() => handleStepClick(step.id)}
                      disabled={!canClick}
                      className={`stepper-step w-full ${
                        isCompleted ? 'completed' : isActive ? 'active' : 'pending'
                      } ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div
                        className={`stepper-number ${
                          isCompleted ? 'completed' : isActive ? 'active' : 'pending'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <span className="text-sm">{step.label}</span>
                    </button>

                    {index < steps.length - 1 && (
                      <div className="ml-7 h-4 border-l-2 border-border" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 p-6 min-h-[500px]">
            {/* Step 1: Dados Principais */}
            {currentStep === 1 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">
                  Dados Principais
                </h2>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código
                    </label>
                    <input
                      type="text"
                      value={
                        isEditing
                          ? formData.code || ''
                          : 'Gerado automaticamente'
                      }
                      disabled
                      className="input-field opacity-70 cursor-not-allowed"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Nome do produto"
                      className={`input-field ${errors.name ? 'error' : ''}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Referência
                    </label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => updateField('reference', e.target.value)}
                      placeholder="Referência"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código SKU <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => updateField('sku', e.target.value)}
                      placeholder="SKU001"
                      className={`input-field ${errors.sku ? 'error' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      EAN
                    </label>
                    <input
                      type="text"
                      value={formData.ean}
                      onChange={(e) => updateField('ean', e.target.value)}
                      placeholder="7891234567890"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Estoque
                    </label>
                    <input
                      type="text"
                      value={formData.stock}
                      onChange={(e) => handleNumericInput('stock', e.target.value)}
                      placeholder="0"
                      disabled
                      className="input-field opacity-70 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Preço de Custo
                    </label>
                    <input
                      type="text"
                      value={formData.costPrice}
                      onChange={(e) => handleNumericInput('costPrice', e.target.value)}
                      placeholder="0.00"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Preço de Venda
                    </label>
                    <input
                      type="text"
                      value={formData.salePrice}
                      onChange={(e) => handleNumericInput('salePrice', e.target.value)}
                      placeholder="0.00"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Relações do Produto
                    </h3>
                  </div>

                  <div className="col-span-3 md:col-span-3">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome Categoria
                    </label>
                    <SearchInput
                      value={formData.categoryName}
                      onChange={(v) => updateField('categoryName', v)}
                      placeholder="Buscar categoria por nome ou codigo"
                      onSearch={handleSearchCategory}
                    />
                  </div>

                  <div className="col-span-3 md:col-span-3">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fornecedor
                    </label>
                    <SearchInput
                      value={formData.supplierName}
                      onChange={(v) => updateField('supplierName', v)}
                      placeholder="Buscar fornecedor por nome ou código"
                      onSearch={handleSearchSupplier}
                    />
                  </div>

                  <div className="col-span-3 md:col-span-3">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fabricante
                    </label>
                    <SearchInput
                      value={formData.manufacturerName}
                      onChange={(v) => updateField('manufacturerName', v)}
                      placeholder="Buscar fabricante por nome ou código"
                      onSearch={handleSearchManufacturer}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Peso (kg)
                    </label>
                    <input
                      type="text"
                      value={formData.weight}
                      onChange={(e) => handleNumericInput('weight', e.target.value)}
                      placeholder="0.00"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Comprimento (cm)
                    </label>
                    <input
                      type="text"
                      value={formData.length}
                      onChange={(e) => handleNumericInput('length', e.target.value)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Altura (cm)
                    </label>
                    <input
                      type="text"
                      value={formData.height}
                      onChange={(e) => handleNumericInput('height', e.target.value)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Largura (cm)
                    </label>
                    <input
                      type="text"
                      value={formData.width}
                      onChange={(e) => handleNumericInput('width', e.target.value)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Configurações */}
            {currentStep === 2 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">
                  Configurações
                </h2>

                {/* Imagens do Produto */}
                <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Imagens do Produto</h3>

                    <button
                      type="button"
                      onClick={openProductImageModal}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors text-sm"
                    >
                      <Image className="w-4 h-4" />
                      {productHasImages ? 'Editar imagens' : 'Selecionar imagens'}
                    </button>
                  </div>

                  {!productHasImages ? (
                    <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-background/40 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Image className="w-4 h-4" />
                        Nenhuma imagem selecionada
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Use o botão “Selecionar imagens”
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {productHasMultiple && (
                        <button
                          type="button"
                          onClick={() => navigateProductImage(-1)}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                          title="Imagem anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}

                      <div className="relative">
                        <img
                          src={currentProductImage!.url}
                          alt="Imagem do produto"
                          className="w-20 h-20 rounded-lg object-cover border border-border"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                        />
                        {currentProductImage?.isPrimary && (
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full leading-tight">
                            ★
                          </span>
                        )}
                      </div>

                      {productHasMultiple && (
                        <button
                          type="button"
                          onClick={() => navigateProductImage(1)}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                          title="Próxima imagem"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                      <div className="text-xs text-muted-foreground">
                        {productImageIndex + 1} / {orderedProductImages.length}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Unidade
                    </label>
                    <select
                    value={formData.unit}
                    onChange={(e) => updateField('unit', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Selecione a unidade</option>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>

                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição Curta
                    </label>
                    <input
                      type="text"
                      value={formData.shortDescription}
                      onChange={(e) =>
                        updateField('shortDescription', e.target.value)
                      }
                      placeholder="Descrição resumida"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descrição Longa
                  </label>
                  <textarea
                    value={formData.longDescription}
                    onChange={(e) =>
                      updateField('longDescription', e.target.value)
                    }
                    placeholder="Descrição detalhada do produto"
                    rows={5}
                    className="input-field resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      value={formData.metaTitle}
                      onChange={(e) => updateField('metaTitle', e.target.value)}
                      placeholder="Título para SEO"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Meta Tag
                    </label>
                    <input
                      type="text"
                      value={formData.metaTag}
                      onChange={(e) => updateField('metaTag', e.target.value)}
                      placeholder="Tags para SEO"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={formData.metaDescription}
                    onChange={(e) =>
                      updateField('metaDescription', e.target.value)
                    }
                    placeholder="Descrição para SEO"
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Regra Comercial */}
            {currentStep === 3 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">
                  Regra Comercial
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código Promoção
                    </label>
                    <SearchInput
                      value={formData.promotionCode}
                      onChange={(v) => updateField('promotionCode', v)}
                      placeholder="Buscar promoção"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome da Promoção
                    </label>
                    <input
                      type="text"
                      value={formData.promotionName}
                      onChange={(e) =>
                        updateField('promotionName', e.target.value)
                      }
                      placeholder="Nome da promoção"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Início da Promoção
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.promotionStart}
                        onChange={(e) =>
                          updateField('promotionStart', e.target.value)
                        }
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fim da Promoção
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.promotionEnd}
                        onChange={(e) =>
                          updateField('promotionEnd', e.target.value)
                        }
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddPromotion}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADICIONAR PROMOÇÃO</span>
                </button>

                {promotions.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-foreground mb-3">
                      Promoções Adicionadas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {promotions.map((promo) => (
                        <div
                          key={promo.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"
                        >
                          <span>
                            {promo.code} - {promo.name}
                          </span>
                          <button
                            onClick={() => removePromotion(promo.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Tributação */}
            {currentStep === 4 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">
                  Tributação
                </h2>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Grupo de Tributação
                  </label>
                  <SearchInput
                    value={formData.taxGroupId}
                    onChange={(v) => updateField('taxGroupId', v)}
                    placeholder="Buscar grupo de tributação"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código NCM
                    </label>
                    <SearchInput
                      value={formData.ncmId}
                      onChange={(v) => updateField('ncmId', v)}
                      placeholder="Buscar NCM"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição NCM
                    </label>
                    <input
                      type="text"
                      value={formData.ncmDescription}
                      onChange={(e) =>
                        updateField('ncmDescription', e.target.value)
                      }
                      placeholder="Descrição do NCM"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código CEST
                    </label>
                    <SearchInput
                      value={formData.cestId}
                      onChange={(v) => updateField('cestId', v)}
                      placeholder="Buscar CEST"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição CEST
                    </label>
                    <input
                      type="text"
                      value={formData.cestDescription}
                      onChange={(e) =>
                        updateField('cestDescription', e.target.value)
                      }
                      placeholder="Descrição do CEST"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código PIS
                    </label>
                    <SearchInput
                      value={formData.pisCode}
                      onChange={(v) => updateField('pisCode', v)}
                      placeholder="Buscar PIS"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição PIS
                    </label>
                    <input
                      type="text"
                      value={formData.pisDescription}
                      onChange={(e) =>
                        updateField('pisDescription', e.target.value)
                      }
                      placeholder="Descrição do PIS"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código COFINS
                    </label>
                    <SearchInput
                      value={formData.cofinsCode}
                      onChange={(v) => updateField('cofinsCode', v)}
                      placeholder="Buscar COFINS"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Descrição COFINS
                    </label>
                    <input
                      type="text"
                      value={formData.cofinsDescription}
                      onChange={(e) =>
                        updateField('cofinsDescription', e.target.value)
                      }
                      placeholder="Descrição do COFINS"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Origem Fiscal
                  </label>
                  <select
                    value={formData.fiscalOrigin}
                    onChange={(e) =>
                      updateField('fiscalOrigin', e.target.value)
                    }
                    className="input-field"
                  >
                    <option value="">Selecione a origem fiscal</option>
                    {fiscalOrigins.map((origin) => (
                      <option key={origin.value} value={origin.value}>
                        {origin.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 5: Variações */}
            {currentStep === 5 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-2">Variações</h2>
                
                {/* Model Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModel1Open(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
                  >
                    <Grid3X3 className="w-4 h-4" />
                    Adicionar Variações
                  </button>
                </div>

                {/* Saved Variations Summary */}
                {savedVariations.length > 0 && (
                  <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Variações Criadas ({savedVariations.length})</h3>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Ativo</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Combinação</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Imagem</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">SKU</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">EAN</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Preço</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Estoque</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Detalhes</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {savedVariations.map((v) => {
                            const isActive = v.active ?? true;
                            const orderedImages = getOrderedImages(v.images || []);
                            const currentIdx = v.currentImageIndex ?? 0;
                            const displayImg = orderedImages[currentIdx] || null;
                            const hasImages = orderedImages.length > 0;
                            const hasMultiple = orderedImages.length > 1;
                            return (
                              <tr
                                key={v.combination}
                                className={`border-b border-border last:border-0 table-row-hover ${!isActive ? 'opacity-50' : ''}`}
                              >
                                {/* ATIVO */}
                                <td className="px-4 py-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleSavedVariationActive(v.combination)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                      isActive ? 'bg-primary' : 'bg-muted'
                                    }`}
                                    aria-label="Ativar/desativar variação"
                                  >
                                    <span
                                      className={`inline-block h-5 w-5 transform rounded-full bg-background transition-transform ${
                                        isActive ? 'translate-x-5' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </td>

                                {/* COMBINAÇÃO */}
                                <td className="px-4 py-2">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                    {v.combination}
                                  </span>
                                </td>

                                {/* IMAGEM (já existe) */}
                                <td className="px-4 py-2">
                                  {!hasImages ? (
                                    <button
                                      type="button"
                                      disabled={!isActive}
                                      onClick={() => openImageModal(v.combination)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
                                    >
                                      <Image className="w-3.5 h-3.5" />
                                      Selecionar
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      {hasMultiple && (
                                        <button
                                          type="button"
                                          disabled={!isActive}
                                          onClick={() => navigateImage(v.combination, -1)}
                                          className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground disabled:opacity-60"
                                        >
                                          <ChevronLeft className="w-4 h-4" />
                                        </button>
                                      )}
                                      <div className="relative">
                                        <img
                                          src={displayImg!.url}
                                          alt={v.combination}
                                          className="w-10 h-10 rounded-lg object-cover border border-border"
                                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                                        />
                                        {displayImg?.isPrimary && (
                                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] px-1 rounded-full leading-tight">
                                            ★
                                          </span>
                                        )}
                                      </div>
                                      {hasMultiple && (
                                        <button
                                          type="button"
                                          disabled={!isActive}
                                          onClick={() => navigateImage(v.combination, 1)}
                                          className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground disabled:opacity-60"
                                        >
                                          <ChevronRight className="w-4 h-4" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        disabled={!isActive}
                                        onClick={() => openImageModal(v.combination)}
                                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground ml-1 disabled:opacity-60"
                                        title="Editar imagens"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>

                                <td className="px-4 py-2 text-foreground">{v.sku || '-'}</td>
                                <td className="px-4 py-2 text-foreground">{v.ean || '-'}</td>
                                <td className="px-4 py-2 text-foreground">{v.price || '-'}</td>
                                <td className="px-4 py-2 text-muted-foreground">{v.stock}</td>
                                <td className="px-4 py-2">
                                  {hasDetails(v.details) ? (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-[10px]">Detalhado</Badge>
                                      <button
                                        type="button"
                                        onClick={() => openDetailsModal(v.combination)}
                                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                                        title="Editar detalhes"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openDetailsModal(v.combination)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Detalhes
                                    </button>
                                  )}
                                </td>

                                {/* AÇÕES */}
                                <td className="px-4 py-2">
                                  <button
                                    type="button"
                                    onClick={() => deleteSavedVariation(v.combination)}
                                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Excluir variação"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Details Modal */}
                {detailsModalOpen && (
                  <VariationDetailsModal
                    open={detailsModalOpen}
                    onClose={() => setDetailsModalOpen(false)}
                    combination={detailsModalCombination}
                    details={detailsModalData}
                    onSave={(details) => saveDetailsForVariation(detailsModalCombination, details)}
                  />
                )}


                {/* Image Modal */}
                <VariationImageModal
                  open={imageModalOpen}
                  onClose={() => setImageModalOpen(false)}
                  combination={imageModalCombination}
                  images={savedVariations.find(v => v.combination === imageModalCombination)?.images || []}
                  onSave={(images) => saveImagesForVariation(imageModalCombination, images)}
                />

                <VariationModel1Modal
                  open={model1Open}
                  onClose={() => setModel1Open(false)}
                  onSave={(rows) =>
                    setSavedVariations(
                      rows.map(r => ({
                        ...r,
                        active: r.active ?? true,
                        price: (r.price ?? '').trim() ? r.price : (formData.salePrice || ''),
                      }))
                    )
                  }
                  parentSku={formData.sku}
                  parentPrice={formData.salePrice}
                  initialRows={savedVariations.map(v => ({
                    ...v,
                    active: v.active ?? true,
                  }))}
                />
              </div>
            )}

            {/* Step 6: Integração */}
            {currentStep === 6 && (
              <div className="animate-slide-in-right space-y-6">
                <h2 className="text-lg font-medium text-foreground mb-6">
                  Integração
                </h2>

                <div className="p-6 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Info className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-2">
                        Configuração de integração do produto com outros canais
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Esta seção permite configurar integrações com sistemas
                        externos, como marketplaces (Mercado Livre, Amazon,
                        etc.), e-commerce (WooCommerce, Shopify, etc.) e outros
                        ERPs. As configurações estarão disponíveis após a
                        conclusão do cadastro básico.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Dados prontos. Clique em Confirmar para salvar o produto.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>

              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>
                  {currentStep < 6
                    ? 'Continuar'
                    : isSaving
                    ? 'Salvando...'
                    : 'Confirmar'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modais de seleção */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Selecionar Categoria</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Filtrar por código ou nome"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field"
            />

            <div className="max-h-64 overflow-y-auto border border-border rounded-md">
              {categoryResults
                .filter(cat => {
                  if (!categoryFilter.trim()) return true;
                  const term = categoryFilter.toLowerCase();
                  return (
                    cat.code.toLowerCase().includes(term) ||
                    cat.name.toLowerCase().includes(term)
                  );
                })
                .map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className="w-full flex justify-between items-center px-3 py-2 text-left hover:bg-muted/70 border-b last:border-b-0 border-border"
                  >
                    <span className="text-sm font-medium">
                      {cat.code} - {cat.name}
                    </span>
                  </button>
                ))}
              {categoryResults.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  Nenhuma categoria encontrada.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isManufacturerModalOpen} onOpenChange={setIsManufacturerModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Selecionar Fabricante</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Filtrar por código ou nome"
              value={manufacturerFilter}
              onChange={(e) => setManufacturerFilter(e.target.value)}
              className="input-field"
            />

            <div className="max-h-64 overflow-y-auto border border-border rounded-md">
              {manufacturerResults
                .filter(mf => {
                  if (!manufacturerFilter.trim()) return true;
                  const term = manufacturerFilter.toLowerCase();
                  return (
                    mf.codigo.toLowerCase().includes(term) ||
                    mf.nome.toLowerCase().includes(term)
                  );
                })
                .map(mf => (
                  <button
                    key={mf.id}
                    type="button"
                    onClick={() => handleSelectManufacturer(mf)}
                    className="w-full flex justify-between items-center px-3 py-2 text-left hover:bg-muted/70 border-b last:border-b-0 border-border"
                  >
                    <span className="text-sm font-medium">
                      {mf.codigo} - {mf.nome}
                    </span>
                  </button>
                ))}
              {manufacturerResults.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  Nenhum fabricante encontrado.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Selecionar Fornecedor</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Filtrar por código ou nome"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="input-field"
            />

            <div className="max-h-64 overflow-y-auto border border-border rounded-md">
              {supplierResults
                .filter(sp => {
                  if (!supplierFilter.trim()) return true;
                  const term = supplierFilter.toLowerCase();
                  return (
                    sp.codigo.toLowerCase().includes(term) ||
                    sp.nome.toLowerCase().includes(term)
                  );
                })
                .map(sp => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => handleSelectSupplier(sp)}
                    className="w-full flex justify-between items-center px-3 py-2 text-left hover:bg-muted/70 border-b last:border-b-0 border-border"
                  >
                    <span className="text-sm font-medium">
                      {sp.codigo} - {sp.nome}
                    </span>
                  </button>
                ))}
              {supplierResults.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  Nenhum fornecedor encontrado.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de imagens do PRODUTO (Step 2) */}
      <VariationImageModal
        open={productImageModalOpen}
        onClose={() => setProductImageModalOpen(false)}
        combination="PRODUTO"
        images={productImages}
        onSave={(images) => saveProductImages(images)}
      />

    </div>
  );
}

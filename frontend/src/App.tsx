import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Categories from "./pages/categories/Categories";
import NewCategory from "./pages/categories/NewCategory";
import Products from "./pages/products/Products";
import NewProduct from "./pages/products/NewProduct";
import EditProduct from "./pages/products/EditProduct";
import Promotions from "./pages/promotions/Promotions";
import NewPromotion from "./pages/promotions/NewPromotion";
import Clients from "./pages/clients/Clients";
import Users from "./pages/users/Users";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import { CategoryWizard } from "./components/categories/CategoryWizard";
import NewClient from "./pages/clients/NewClient";
import EditClient from "./pages/clients/EditClient";
import NewUser from "./pages/users/NewUser";
import EditUser from "./pages/users/EditUser";
import Suppliers from "./pages/suppliers/Suppliers";
import Manufacturers from "./pages/manufacturer/Manufacturers";
import NewSupplier from "./pages/suppliers/NewSupplier";
import EditSupplier from "./pages/suppliers/EditSupplier";
import NewManufacturer from "./pages/manufacturer/NewManufacturer";
import EditManufacturer from "./pages/manufacturer/EditManufacturer";
import TypeVariations from "./pages/variations/TypeVariations";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route element={<PrivateRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/catalogo/categorias" element={<Categories />} />
                <Route path="/catalogo/categorias/nova" element={<NewCategory />} />
                <Route path="/catalogo/categorias/:id/editar" element={<CategoryWizard />} />
                <Route path="/catalogo/variacoes/tipos" element={<TypeVariations />} />
                <Route path="/catalogo/variacoes/tipos/novo" element={<PlaceholderPage />} />
                <Route path="/catalogo/variacoes/tipos/:id/editar" element={<PlaceholderPage />} />
                <Route path="/catalogo/variacoes/gradex" element={<PlaceholderPage />} />
                <Route path="/catalogo/variacoes/gradex/novo" element={<PlaceholderPage />} />
                <Route path="/catalogo/variacoes/gradex/:id/editar" element={<PlaceholderPage />} />
                <Route path="/catalogo/variacoes/gradey" element={<PlaceholderPage />} />
                <Route path="/catalogo/variacoes/gradey/novo" element={<PlaceholderPage />} />
                <Route path="/catalogo/variacoes/gradey/:id/editar" element={<PlaceholderPage />} />
                <Route path="/catalogo/produtos" element={<Products />} />
                <Route path="/catalogo/produtos/novo" element={<NewProduct />} />
                <Route path="/catalogo/produtos/:id/editar" element={<EditProduct />} />
                <Route path="/catalogo/promocoes" element={<Promotions />} />
                <Route path="/catalogo/promocoes/nova" element={<NewPromotion />} />
                <Route path="/cadastros/admin/clientes" element={<Clients />} />
                <Route path="/cadastros/admin/clientes/novo" element={<NewClient />} />
                <Route path="/cadastros/admin/clientes/:id/editar" element={<EditClient />} />
                <Route path="/cadastros/admin/usuarios" element={<Users />} />
                <Route path="/cadastros/admin/usuarios/novo" element={<NewUser />} />
                <Route path="/cadastros/admin/usuarios/:id/editar" element={<EditUser />} />
                <Route path="/catalogo/fornecedores" element={<Suppliers />} />
                <Route path="/catalogo/fornecedores/novo" element={<NewSupplier />} />
                <Route path="/catalogo/fornecedores/:id/editar" element={<EditSupplier />} />
                <Route path="/catalogo/fabricantes" element={<Manufacturers />} />
                <Route path="/catalogo/fabricantes/novo" element={<NewManufacturer />} />
                <Route path="/catalogo/fabricantes/:id/editar" element={<EditManufacturer />} />
                <Route path="/fiscal" element={<PlaceholderPage />} />
                <Route path="/vendas" element={<PlaceholderPage />} />
                <Route path="/relatorios" element={<PlaceholderPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

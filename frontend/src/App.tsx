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
import Categories from "./pages/Categories";
import NewCategory from "./pages/NewCategory";
import Products from "./pages/Products";
import NewProduct from "./pages/NewProduct";
import EditProduct from "./pages/EditProduct";
import Promotions from "./pages/Promotions";
import NewPromotion from "./pages/NewPromotion";
import Clients from "./pages/Clients";
import Users from "./pages/Users";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import { CategoryWizard } from "./components/categories/CategoryWizard";
import NewClient from "./pages/NewClient";
import EditClient from "./pages/EditClient";
import NewUser from "./pages/NewUser";
import EditUser from "./pages/EditUser";
import Suppliers from "./pages/Suppliers";
import Manufacturers from "./pages/Manufacturers";
import NewSupplier from "./pages/NewSupplier";
import EditSupplier from "./pages/EditSupplier";
import NewManufacturer from "./pages/NewManufacturer";
import EditManufacturer from "./pages/EditManufacturer";

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

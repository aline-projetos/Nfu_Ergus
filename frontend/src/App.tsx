// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { MainLayout } from "@/components/layout/MainLayout";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import Categories from "./pages/categories/Categories";
import NewCategory from "./pages/categories/NewCategory";
import { CategoryWizard } from "./components/categories/CategoryWizard";

import Products from "./pages/products/Products";
import NewProduct from "./pages/products/NewProduct";
import EditProduct from "./pages/products/EditProduct";

import Promotions from "./pages/promotions/Promotions";
import NewPromotion from "./pages/promotions/NewPromotion";
import EditPromotion from "./pages/promotions/EditPromotion"

import Clients from "./pages/clients/Clients";
import NewClient from "./pages/clients/NewClient";
import EditClient from "./pages/clients/EditClient";

import Users from "./pages/users/Users";
import NewUser from "./pages/users/NewUser";
import EditUser from "./pages/users/EditUser";

import Suppliers from "./pages/suppliers/Suppliers";
import NewSupplier from "./pages/suppliers/NewSupplier";
import EditSupplier from "./pages/suppliers/EditSupplier";

import Manufacturers from "./pages/manufacturer/Manufacturers";
import NewManufacturer from "./pages/manufacturer/NewManufacturer";
import EditManufacturer from "./pages/manufacturer/EditManufacturer";

import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import { PromotionWizard } from "./components/promotions/PromotionWizard";

import TaxGroups from "./pages/tax/TaxGroup";
import NewTaxGroup from "./pages/tax/NewTaxGroup";
import EditTaxGroup from "./pages/tax/EditTaxGroup";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />

      {/* Rotas protegidas */}
      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/catalogo/categorias" element={<Categories />} />
          <Route path="/catalogo/categorias/nova" element={<NewCategory />} />
          <Route
            path="/catalogo/categorias/:id/editar"
            element={<CategoryWizard />}
          />

          <Route path="/catalogo/produtos" element={<Products />} />
          <Route path="/catalogo/produtos/novo" element={<NewProduct />} />
          <Route
            path="/catalogo/produtos/:id/editar"
            element={<EditProduct />}
          />

          <Route path="/catalogo/promocoes" element={<Promotions />} />
          <Route
            path="/catalogo/promocoes/nova"
            element={<NewPromotion />}
          />
          <Route
            path="/catalogo/promocoes/:id/editar"
            element={<PromotionWizard />}
          />

          <Route path="/cadastros/admin/clientes" element={<Clients />} />
          <Route
            path="/cadastros/admin/clientes/novo"
            element={<NewClient />}
          />
          <Route
            path="/cadastros/admin/clientes/:id/editar"
            element={<EditClient />}
          />

          <Route path="/cadastros/admin/usuarios" element={<Users />} />
          <Route
            path="/cadastros/admin/usuarios/novo"
            element={<NewUser />}
          />
          <Route
            path="/cadastros/admin/usuarios/:id/editar"
            element={<EditUser />}
          />

          <Route path="/catalogo/fornecedores" element={<Suppliers />} />
          <Route
            path="/catalogo/fornecedores/novo"
            element={<NewSupplier />}
          />
          <Route
            path="/catalogo/fornecedores/:id/editar"
            element={<EditSupplier />}
          />

          <Route path="/catalogo/fabricantes" element={<Manufacturers />} />
          <Route
            path="/catalogo/fabricantes/novo"
            element={<NewManufacturer />}
          />
          <Route
            path="/catalogo/fabricantes/:id/editar"
            element={<EditManufacturer />}
          />

          <Route path="/fiscal" element={<PlaceholderPage />} />
          <Route path="/fiscal/tributacao/grupos" element={<TaxGroups />} />
          <Route path="/fiscal/tributacao/grupos/novo" element={<NewTaxGroup />} />
          <Route path="/fiscal/tributacao/grupos/:id/editar" element={<EditTaxGroup />} />
          
          <Route path="/fiscal/ncm" element={<PlaceholderPage />} />
          <Route path="/fiscal/cest" element={<PlaceholderPage />} />

          <Route path="/vendas" element={<PlaceholderPage />} />
          <Route path="/relatorios" element={<PlaceholderPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;

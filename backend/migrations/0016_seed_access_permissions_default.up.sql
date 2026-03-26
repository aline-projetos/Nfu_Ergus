-- 0003_seed_default_access_permissions.up.sql
-- Seed de permissões padrão para o MVP, baseado no menu lateral

INSERT INTO access_permissions (code, name, module, description)
VALUES
  -- =======================================
  -- DASHBOARD
  -- =======================================
  ('dashboard.view',
   'Visualizar dashboard',
   'dashboard',
   'Permite acessar a tela de dashboard'),

  -- =======================================
  -- CATÁLOGO
  -- Categorias
  -- =======================================
  ('catalog.categories.view',
   'Visualizar categorias',
   'catalog',
   'Permite acessar a lista de categorias'),

  ('catalog.categories.manage',
   'Gerenciar categorias',
   'catalog',
   'Permite criar, editar e excluir categorias'),

  -- Produtos
  ('catalog.products.view',
   'Visualizar produtos',
   'catalog',
   'Permite acessar a lista de produtos'),

  ('catalog.products.manage',
   'Gerenciar produtos',
   'catalog',
   'Permite criar, editar e excluir produtos'),

  -- Promoções
  ('catalog.promotions.view',
   'Visualizar promoções',
   'catalog',
   'Permite acessar a lista de promoções'),

  ('catalog.promotions.manage',
   'Gerenciar promoções',
   'catalog',
   'Permite criar, editar e excluir promoções'),

  -- Fornecedores
  ('catalog.suppliers.view',
   'Visualizar fornecedores',
   'catalog',
   'Permite acessar a lista de fornecedores'),

  ('catalog.suppliers.manage',
   'Gerenciar fornecedores',
   'catalog',
   'Permite criar, editar e excluir fornecedores'),

  -- Fabricantes
  ('catalog.manufacturers.view',
   'Visualizar fabricantes',
   'catalog',
   'Permite acessar a lista de fabricantes'),

  ('catalog.manufacturers.manage',
   'Gerenciar fabricantes',
   'catalog',
   'Permite criar, editar e excluir fabricantes'),

  -- =======================================
  -- CADASTROS
  -- Clientes
  -- =======================================
  ('registers.clients.view',
   'Visualizar clientes',
   'registers',
   'Permite acessar a lista de clientes'),

  ('registers.clients.manage',
   'Gerenciar clientes',
   'registers',
   'Permite criar, editar e excluir clientes'),

  -- Permissões de Acesso
  ('access.permissions.view',
   'Visualizar permissões de acesso',
   'access',
   'Permite visualizar a lista de permissões (somente leitura no MVP)'),

  ('access.permissions.manage',
   'Gerenciar permissões de acesso',
   'access',
   'Permite criar/editar permissões (reservado para super admin / uso interno)'),

  -- Perfis de Acesso
  ('access.profiles.view',
   'Visualizar perfis de acesso',
   'access',
   'Permite visualizar os perfis de acesso do tenant'),

  ('access.profiles.manage',
   'Gerenciar perfis de acesso',
   'access',
   'Permite criar, editar, excluir e definir permissões dos perfis'),

  -- Usuários
  ('users.view',
   'Visualizar usuários',
   'access',
   'Permite visualizar a lista de usuários do tenant'),

  ('users.manage',
   'Gerenciar usuários',
   'access',
   'Permite criar, editar e inativar usuários'),

  -- =======================================
  -- FISCAL
  -- Grupos de Tributação
  -- =======================================
  ('fiscal.taxgroups.view',
   'Visualizar grupos de tributação',
   'fiscal',
   'Permite acessar a lista de grupos de tributação'),

  ('fiscal.taxgroups.manage',
   'Gerenciar grupos de tributação',
   'fiscal',
   'Permite criar, editar e excluir grupos de tributação'),

  -- NCM
  ('fiscal.ncm.view',
   'Visualizar NCM',
   'fiscal',
   'Permite acessar a lista de NCM'),

  ('fiscal.ncm.manage',
   'Gerenciar NCM',
   'fiscal',
   'Permite criar, editar e excluir NCM'),

  -- CEST
  ('fiscal.cest.view',
   'Visualizar CEST',
   'fiscal',
   'Permite acessar a lista de CEST'),

  ('fiscal.cest.manage',
   'Gerenciar CEST',
   'fiscal',
   'Permite criar, editar e excluir CEST'),

  -- CFOP
  ('fiscal.cfop.view',
   'Visualizar CFOP',
   'fiscal',
   'Permite acessar a lista de CFOP'),

  ('fiscal.cfop.manage',
   'Gerenciar CFOP',
   'fiscal',
   'Permite criar, editar e excluir CFOP'),

  -- Notas Fiscais (novo item do módulo Fiscal)
  ('fiscal.invoices.view',
   'Visualizar notas fiscais',
   'fiscal',
   'Permite acessar a tela/lista de notas fiscais'),

  ('fiscal.invoices.manage',
   'Gerenciar notas fiscais',
   'fiscal',
   'Permite emitir, editar e cancelar notas fiscais'),

  -- =======================================
  -- VENDAS
  -- =======================================
  ('sales.view',
   'Visualizar vendas',
   'sales',
   'Permite acessar a lista de vendas'),

  ('sales.manage',
   'Gerenciar vendas',
   'sales',
   'Permite criar/editar/cancelar vendas (conforme regras do sistema)'),

  -- =======================================
  -- RELATÓRIOS
  -- =======================================
  ('reports.view',
   'Visualizar relatórios',
   'reports',
   'Permite acessar a tela de relatórios'),

  ('reports.manage',
   'Gerenciar relatórios',
   'reports',
   'Permite configurar/gerar relatórios avançados')
ON CONFLICT (code) DO NOTHING;

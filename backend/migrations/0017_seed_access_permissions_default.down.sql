-- 0003_seed_default_access_permissions.down.sql

DELETE FROM access_permissions
WHERE code IN (
  'dashboard.view',

  'catalog.categories.view',
  'catalog.categories.manage',
  'catalog.products.view',
  'catalog.products.manage',
  'catalog.promotions.view',
  'catalog.promotions.manage',
  'catalog.suppliers.view',
  'catalog.suppliers.manage',
  'catalog.manufacturers.view',
  'catalog.manufacturers.manage',

  'registers.clients.view',
  'registers.clients.manage',

  'access.permissions.view',
  'access.permissions.manage',
  'access.profiles.view',
  'access.profiles.manage',
  'users.view',
  'users.manage',

  'fiscal.taxgroups.view',
  'fiscal.taxgroups.manage',
  'fiscal.ncm.view',
  'fiscal.ncm.manage',
  'fiscal.cest.view',
  'fiscal.cest.manage',
  'fiscal.cfop.view',
  'fiscal.cfop.manage',
  'fiscal.invoices.view',
  'fiscal.invoices.manage',

  'sales.view',
  'sales.manage',

  'reports.view',
  'reports.manage'
);

create table if not exists tenant_product_sequences (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  next_code bigint not null,
  updated_at timestamptz not null default now()
);

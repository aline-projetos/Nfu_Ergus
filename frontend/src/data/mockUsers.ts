export interface User {
  id: string;
  tenant_id: string | null;
  tenant_name?: string;
  codigo: number | null;
  username: string;
  type: 'admin' | 'operador' | 'consulta';
  is_super_admin: boolean;
  ativo: boolean;
}

export const userTypes = [
  { value: 'admin', label: 'Administrador' },
  { value: 'operador', label: 'Operador' },
  { value: 'consulta', label: 'Consulta' },
];

export const mockUsers: User[] = [
  { id: '1', tenant_id: '1', tenant_name: 'João Silva', codigo: 1001, username: 'joao.silva', type: 'admin', is_super_admin: true, ativo: true },
  { id: '2', tenant_id: '3', tenant_name: 'Tech Solutions Ltda', codigo: 1002, username: 'maria.tech', type: 'operador', is_super_admin: false, ativo: true },
  { id: '3', tenant_id: '6', tenant_name: 'Comércio ABC Ltda', codigo: 1003, username: 'pedro.abc', type: 'consulta', is_super_admin: false, ativo: true },
  { id: '4', tenant_id: null, tenant_name: undefined, codigo: 1004, username: 'admin.master', type: 'admin', is_super_admin: true, ativo: true },
  { id: '5', tenant_id: '2', tenant_name: 'Maria Oliveira', codigo: 1005, username: 'ana.operador', type: 'operador', is_super_admin: false, ativo: false },
  { id: '6', tenant_id: '10', tenant_name: 'Indústria Nova Era', codigo: 1006, username: 'carlos.nova', type: 'admin', is_super_admin: false, ativo: true },
  { id: '7', tenant_id: '5', tenant_name: 'Ana Costa', codigo: 1007, username: 'fernanda.consulta', type: 'consulta', is_super_admin: false, ativo: true },
  { id: '8', tenant_id: '8', tenant_name: 'Distribuidora XYZ', codigo: 1008, username: 'roberto.xyz', type: 'operador', is_super_admin: false, ativo: false },
  { id: '9', tenant_id: '1', tenant_name: 'João Silva', codigo: 1009, username: 'lucas.silva', type: 'consulta', is_super_admin: false, ativo: true },
  { id: '10', tenant_id: null, tenant_name: undefined, codigo: 1010, username: 'super.admin', type: 'admin', is_super_admin: true, ativo: true },
];

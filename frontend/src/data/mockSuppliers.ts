export interface Supplier {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'fisica' | 'juridica';
  cpf?: string;
  rg?: string;
  cnpj?: string;
  inscricao_estadual?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  uf: string;
  ativo: boolean;
}

export const mockSuppliers: Supplier[] = [
  {
    id: '1',
    codigo: 'FORN001',
    nome: 'Distribuidora ABC Ltda',
    tipo: 'juridica',
    cnpj: '12.345.678/0001-90',
    inscricao_estadual: '123.456.789.000',
    telefone: '(11) 3456-7890',
    email: 'contato@abcdistribuidora.com.br',
    cep: '01310-100',
    logradouro: 'Avenida Paulista',
    numero: '1000',
    complemento: 'Sala 501',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP',
    ativo: true,
  },
  {
    id: '2',
    codigo: 'FORN002',
    nome: 'João Silva Materiais',
    tipo: 'fisica',
    cpf: '123.456.789-00',
    rg: '12.345.678-9',
    telefone: '(21) 98765-4321',
    email: 'joao.silva@email.com',
    cep: '20040-020',
    logradouro: 'Rua da Assembleia',
    numero: '50',
    bairro: 'Centro',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    ativo: true,
  },
  {
    id: '3',
    codigo: 'FORN003',
    nome: 'Tech Suprimentos S.A.',
    tipo: 'juridica',
    cnpj: '98.765.432/0001-10',
    inscricao_estadual: '987.654.321.000',
    telefone: '(31) 3333-4444',
    email: 'vendas@techsuprimentos.com.br',
    cep: '30130-000',
    logradouro: 'Rua da Bahia',
    numero: '500',
    bairro: 'Centro',
    cidade: 'Belo Horizonte',
    uf: 'MG',
    ativo: false,
  },
  {
    id: '4',
    codigo: 'FORN004',
    nome: 'Maria Souza ME',
    tipo: 'fisica',
    cpf: '987.654.321-00',
    rg: '98.765.432-1',
    telefone: '(41) 99876-5432',
    email: 'maria.souza@gmail.com',
    cep: '80010-000',
    logradouro: 'Rua XV de Novembro',
    numero: '100',
    bairro: 'Centro',
    cidade: 'Curitiba',
    uf: 'PR',
    ativo: true,
  },
  {
    id: '5',
    codigo: 'FORN005',
    nome: 'Atacadão Sul Ltda',
    tipo: 'juridica',
    cnpj: '11.222.333/0001-44',
    inscricao_estadual: '111.222.333.444',
    telefone: '(51) 3210-9876',
    email: 'comercial@atacadaosul.com.br',
    cep: '90010-000',
    logradouro: 'Avenida Borges de Medeiros',
    numero: '1500',
    complemento: 'Loja 10',
    bairro: 'Centro Histórico',
    cidade: 'Porto Alegre',
    uf: 'RS',
    ativo: true,
  },
  {
    id: '6',
    codigo: 'FORN006',
    nome: 'Nordeste Comercial',
    tipo: 'juridica',
    cnpj: '55.666.777/0001-88',
    inscricao_estadual: '556.667.778.889',
    telefone: '(71) 3456-7890',
    email: 'contato@nordestecomercial.com.br',
    cep: '40020-000',
    logradouro: 'Avenida Sete de Setembro',
    numero: '300',
    bairro: 'Centro',
    cidade: 'Salvador',
    uf: 'BA',
    ativo: false,
  },
];
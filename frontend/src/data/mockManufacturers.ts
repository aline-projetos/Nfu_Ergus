export interface Manufacturer {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'fisica' | 'juridica';
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

export const mockManufacturers: Manufacturer[] = [
  {
    id: '1',
    codigo: 'FAB001',
    nome: 'Indústria Nacional S.A.',
    tipo: 'juridica',
    cnpj: '12.345.678/0001-90',
    inscricao_estadual: '123.456.789.000',
    telefone: '(11) 3456-7890',
    email: 'contato@industrianacional.com.br',
    cep: '09500-000',
    logradouro: 'Av. Industrial',
    numero: '1000',
    bairro: 'Distrito Industrial',
    cidade: 'São Caetano do Sul',
    uf: 'SP',
    ativo: true,
  },
  {
    id: '2',
    codigo: 'FAB002',
    nome: 'Metalúrgica Sul Ltda',
    tipo: 'juridica',
    cnpj: '98.765.432/0001-10',
    inscricao_estadual: '987.654.321.000',
    telefone: '(51) 3333-4444',
    email: 'vendas@metalurgicasul.com.br',
    cep: '93000-000',
    logradouro: 'Rua das Fábricas',
    numero: '500',
    bairro: 'Industrial',
    cidade: 'São Leopoldo',
    uf: 'RS',
    ativo: true,
  },
  {
    id: '3',
    codigo: 'FAB003',
    nome: 'Têxtil Nordeste S.A.',
    tipo: 'juridica',
    cnpj: '11.222.333/0001-44',
    inscricao_estadual: '111.222.333.444',
    telefone: '(85) 3210-9876',
    email: 'comercial@textilnordeste.com.br',
    cep: '60000-000',
    logradouro: 'Av. da Indústria',
    numero: '200',
    bairro: 'Maracanaú',
    cidade: 'Fortaleza',
    uf: 'CE',
    ativo: false,
  },
  {
    id: '4',
    codigo: 'FAB004',
    nome: 'Química Brasil Ltda',
    tipo: 'juridica',
    cnpj: '55.666.777/0001-88',
    inscricao_estadual: '556.667.778.889',
    telefone: '(21) 3456-7890',
    email: 'contato@quimicabrasil.com.br',
    cep: '25000-000',
    logradouro: 'Rod. Washington Luís',
    numero: 'Km 104',
    bairro: 'Campo Elíseos',
    cidade: 'Duque de Caxias',
    uf: 'RJ',
    ativo: true,
  },
  {
    id: '5',
    codigo: 'FAB005',
    nome: 'Eletrônicos Centro-Oeste',
    tipo: 'juridica',
    cnpj: '33.444.555/0001-66',
    inscricao_estadual: '334.445.556.667',
    telefone: '(62) 3456-7890',
    email: 'vendas@eletronicosco.com.br',
    cep: '74000-000',
    logradouro: 'Av. Anhanguera',
    numero: '3000',
    complemento: 'Galpão 5',
    bairro: 'Setor Central',
    cidade: 'Goiânia',
    uf: 'GO',
    ativo: true,
  },
  {
    id: '6',
    codigo: 'FAB006',
    nome: 'Plásticos Amazônia',
    tipo: 'juridica',
    cnpj: '77.888.999/0001-22',
    inscricao_estadual: '778.889.990.001',
    telefone: '(92) 3456-7890',
    email: 'contato@plasticosamazonia.com.br',
    cep: '69000-000',
    logradouro: 'Av. Torquato Tapajós',
    numero: '5000',
    bairro: 'Distrito Industrial',
    cidade: 'Manaus',
    uf: 'AM',
    ativo: false,
  },
];
export interface Client {
  id: string;
  name: string;
  document: string;
  document_type: 'CPF' | 'CNPJ';
  ativo: boolean;
}

export const mockClients: Client[] = [
  { id: '1', name: 'João Silva', document: '12345678901', document_type: 'CPF', ativo: true },
  { id: '2', name: 'Maria Oliveira', document: '98765432101', document_type: 'CPF', ativo: true },
  { id: '3', name: 'Tech Solutions Ltda', document: '12345678000199', document_type: 'CNPJ', ativo: true },
  { id: '4', name: 'Pedro Santos', document: '45678901234', document_type: 'CPF', ativo: false },
  { id: '5', name: 'Ana Costa', document: '78901234567', document_type: 'CPF', ativo: true },
  { id: '6', name: 'Comércio ABC Ltda', document: '98765432000188', document_type: 'CNPJ', ativo: true },
  { id: '7', name: 'Carlos Ferreira', document: '32165498701', document_type: 'CPF', ativo: true },
  { id: '8', name: 'Distribuidora XYZ', document: '11122233000144', document_type: 'CNPJ', ativo: false },
  { id: '9', name: 'Fernanda Lima', document: '65498732101', document_type: 'CPF', ativo: true },
  { id: '10', name: 'Indústria Nova Era', document: '55566677000155', document_type: 'CNPJ', ativo: true },
  { id: '11', name: 'Roberto Mendes', document: '11122233445', document_type: 'CPF', ativo: true },
  { id: '12', name: 'Loja Central ME', document: '22233344000166', document_type: 'CNPJ', ativo: false },
];

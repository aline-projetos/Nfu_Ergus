// src/lib/api/consulta_cep.ts

export interface CepInfo {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // cidade
  uf: string;
  ibge: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
}

export async function pesquisacep(valor: string): Promise<CepInfo | null> {
  const cep = valor.replace(/\D/g, '');

  if (!cep) return null;

  // CEP precisa ter 8 dígitos
  const validacep = /^[0-9]{8}$/;
  if (!validacep.test(cep)) {
    throw new Error('Formato de CEP inválido');
  }

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

  if (!res.ok) {
    throw new Error('Erro ao consultar CEP');
  }

  const data = (await res.json()) as CepInfo & { erro?: boolean };

  if ('erro' in data && data.erro) {
    return null;
  }

  return data;
}

# ErGus – Frontend

Frontend do **ErGus**, um sistema ERP web em desenvolvimento, responsável pela interface de cadastro, edição e listagem de dados do sistema, consumindo uma API REST desenvolvida em Go.

Este projeto foi pensado para ser **modular, escalável e de fácil manutenção**, servindo como base para novos módulos do ERP.

---

## 📌 Sobre o Projeto

O ErGus é um ERP focado em **cadastros estruturados**, integrações futuras e usabilidade.  
O frontend atua exclusivamente como camada de apresentação e orquestração de fluxos, delegando regras de negócio e geração de identificadores ao backend.

Atualmente, o módulo implementado é:

- **Categorias**

Este módulo serve como base para os próximos:
- Produtos
- Fornecedores
- Promoções
- Integrações externas

---

## 🧰 Tecnologias Utilizadas

- **React**
- **TypeScript**
- **Vite**
- **React Router DOM**
- **Lucide React (ícones)**
- **Sonner (toasts/notificações)**
- **Fetch API**
- **CSS utilitário / UI customizada**

---

## 📂 Estrutura do Projeto

```text
src/
 ├─ components/            # Componentes reutilizáveis
 ├─ lib/
 │   └─ api/               # Camada de comunicação com o backend
 │       └─ categories.ts
 ├─ pages/
 │   └─ catalogo/
 │       └─ categorias/
 │           ├─ CategoriesTable.tsx
 │           └─ CategoryWizard.tsx
 ├─ styles/                # Estilos globais
 ├─ router.tsx             # Definição das rotas
 ├─ main.tsx               # Bootstrap da aplicação
 └─ index.html

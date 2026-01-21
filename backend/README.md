# ErGus – Backend

Backend do **ErGus**, um sistema ERP em desenvolvimento, responsável por expor uma **API REST** para cadastro, edição, listagem e exclusão de dados do sistema, além de concentrar regras de negócio, geração de identificadores e persistência em banco de dados.

O backend foi desenvolvido em **Go**, seguindo boas práticas de organização, separação de responsabilidades e simplicidade operacional.

---

## 📌 Sobre o Projeto

O ErGus Backend atua como a **fonte de verdade do sistema**, sendo responsável por:

- Regras de negócio
- Geração de códigos sequenciais
- Persistência de dados
- Integração com banco PostgreSQL
- Exposição de endpoints REST

Atualmente, o módulo implementado é:

- **Categorias**

Este módulo serve como base para a expansão futura do ERP.

---

## 🧰 Tecnologias Utilizadas

- Go (Golang)
- net/http
- database/sql
- PostgreSQL
- UUID (google/uuid)
- godotenv
- SQL puro (sem ORM)

---

## 📂 Estrutura do Projeto

```text
.
├─ cmd/
│   └─ api/
│       └─ main.go              # Ponto de entrada da aplicação
├─ internal/
│   ├─ config/
│   │   └─ config.go            # Carregamento de variáveis de ambiente
│   ├─ db/
│   │   └─ postgres.go          # Conexão com PostgreSQL
│   ├─ httpapi/
│   │   ├─ health.go            # Endpoint de health check
│   │   └─ categories.go        # Handlers de categorias
│   └─ migrations/
│       └─ 001_create_categories.sql
├─ .env.example
├─ go.mod
├─ go.sum
└─ README.md

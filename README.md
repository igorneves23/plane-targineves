# Plane — Gestão de Projetos

Plataforma de gestão de projetos estilo Trello/Plane, construída com React + Vite + Node.js + PostgreSQL.

**Domínio:** plane.targineves.cloud

---

## Stack

| Camada    | Tecnologia                                  |
|-----------|---------------------------------------------|
| Frontend  | React 18, Vite, TailwindCSS, @dnd-kit, Zustand |
| Backend   | Node.js, Express, Prisma ORM, JWT, node-cron |
| Banco     | PostgreSQL 16                               |
| Infra     | Docker, Docker Compose, EasyPanel, Hostinger VPS |

---

## Desenvolvimento local

### Pré-requisitos
- Node.js 20+
- Docker + Docker Compose

### 1. Subir tudo com Docker

```bash
cp .env.example .env
# Edite o .env com JWT_SECRET seguro
docker compose up --build
```

Acesse:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- API Health: http://localhost:3000/health

**Login padrão:** admin@plane.com / admin123

### 2. Rodar manualmente (sem Docker)

**Backend:**
```bash
cd backend
npm install
# Configure DATABASE_URL no .env
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Deploy — VPS Hostinger + EasyPanel

### Passo 1 — Clonar no servidor

```bash
git clone https://github.com/SEU_USER/plane-targineves
cd plane-targineves
cp .env.example .env
nano .env  # Preencher JWT_SECRET e FRONTEND_URL
```

### Passo 2 — EasyPanel

1. Acesse o EasyPanel da VPS
2. Crie novo projeto: **plane**
3. Em *Services*, crie um serviço *Docker Compose*
4. Selecione o repositório ou faça upload do `docker-compose.yml`
5. Configure as variáveis de ambiente:
   ```
   JWT_SECRET=<chave-segura-de-64-chars>
   FRONTEND_URL=https://plane.targineves.cloud
   ```

### Passo 3 — Domínio e SSL

1. No EasyPanel, vá em *Domains* do serviço frontend
2. Adicione: `plane.targineves.cloud`
3. Ative *Let's Encrypt* para SSL automático

### Passo 4 — DNS (Hostinger)

```
Tipo: A
Nome: plane
Valor: IP_DA_VPS
TTL: 300
```

### Passo 5 — Deploy

```bash
docker compose up -d --build
```

---

## Funcionalidades

- [x] Login / Cadastro / JWT
- [x] Quadros (projetos) com cor customizada
- [x] Colunas reordenáveis (drag & drop)
- [x] Cartões com drag & drop entre colunas
- [x] Checklist com progresso
- [x] Comentários
- [x] Etiquetas coloridas
- [x] Múltiplos responsáveis
- [x] Prioridade (Baixa / Média / Alta / Urgente)
- [x] Data de vencimento
- [x] Tarefas recorrentes (diário / semanal / mensal / anual)
- [x] Dark mode
- [x] Upload de anexos
- [x] Registro de atividades
- [x] Sistema de permissões (Admin / Líder / Membro)
- [x] API REST completa
- [x] Docker Compose pronto para produção

---

## Estrutura

```
app-plena/
├── frontend/          # React + Vite
├── backend/           # Node.js + Express
│   └── prisma/        # Schema + migrations
├── docker-compose.yml
└── .env.example
```

---

## Variáveis de ambiente

| Variável       | Descrição                  | Exemplo                          |
|----------------|----------------------------|----------------------------------|
| DATABASE_URL   | Connection string Postgres | postgres://user:pass@db:5432/plane |
| JWT_SECRET     | Chave secreta JWT          | string aleatória 64+ chars       |
| NODE_ENV       | Ambiente                   | production                       |
| FRONTEND_URL   | URL do frontend            | https://plane.targineves.cloud   |
| PORT           | Porta do backend           | 3000                             |

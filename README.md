# Kore Base Platform — Enterprise Full-Stack Foundation

Repositório base padronizado para início de projetos corporativos, construído com **TypeScript, Express, React 19, PostgreSQL (padrão), Redis + BullMQ (opcional), RBAC (Admin e Cliente), Multi-idiomas (PT-BR, ES, EN), Gateway Multi-LLM (Gemini, OpenRouter, Llama), Recuperação de Senha (Resend / SMTP) e Auditoria Integral**.

---

## 1. Visão Geral da Arquitetura

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React 19 + TS)                         │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │ AuthSplitScreen         │  │ Authenticated Workspace                 │  │
│  │ - Coluna Esq: Login,    │  │ - DashboardView (Métricas + Gráficos)   │  │
│  │   Cadastro, Recuperação │  │ - UsersManagementView (Admin CRUD)      │  │
│  │ - Coluna Dir: Slider    │  │ - ProfileView (Admin & Cliente)         │  │
│  │ - Idiomas: PT-BR/ES/EN  │  │ - Logs & Infra Console (Admin)          │  │
│  └────────────┬────────────┘  └────────────────────┬────────────────────┘  │
└───────────────┼────────────────────────────────────┼───────────────────────┘
                │ Bearer JWT (HS256)                 │ REST JSON (/api/*)
┌───────────────▼────────────────────────────────────▼───────────────────────┐
│                        BACKEND (Express + TypeScript)                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Camada de Segurança (src/server/security/crypto-shield.ts)           │  │
│  │ - Rate Limiter (Sliding Window por IP e rota)                        │  │
│  │ - JWT HS256 (Timing-safe HMAC-SHA256) & Scrypt Password Hashing      │  │
│  │ - RBAC Policy Engine (Admin = Full CRUD | Cliente = Dashboard/Perfil)│  │
│  │ - Webhook Verifier (HMAC-SHA256 + janela anti-replay de 300s)        │  │
│  │ - File Upload Guard (MIME allowlist + Magic Bytes + Path Traversal)  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │ PostgreSQL Repo     │  │ Filas & Cache        │  │ Serviços Externos │  │
│  │ - Schema DDL SQL    │  │ - Redis (Opcional)   │  │ - Gemini SDK      │  │
│  │ - Users, Resets,    │  │ - BullMQ (Opcional)  │  │ - OpenRouter REST │  │
│  │   Logs, Metrics     │  │ - Fallback em memória│  │ - Meta Llama      │  │
│  └─────────────────────┘  └──────────────────────┘  │ - Resend / SMTP   │  │
│                                                     └───────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Diretórios

- `/.env.example`: Contrato completo de variáveis de ambiente documentadas por domínio.
- `/server.ts`: Servidor HTTP Express + Vite, middlewares de segurança, rate limiting, autenticação JWT, RBAC e rotas `/api/*`.
- `/src/shared/types.ts`: Tipagens compartilhadas entre cliente e servidor (`User`, `UserRole`, `AuditLog`, `DailyMetricPoint`, `InfrastructureStatus`).
- `/src/shared/i18n.ts`: Dicionário completo de internacionalização (`pt-BR`, `es`, `en`).
- `/src/server/config/env.ts`: Carregador e validador tipado de variáveis de ambiente com valores padrão seguros.
- `/src/server/security/crypto-shield.ts`: Primitivas puras de criptografia, JWT, Scrypt, RBAC, sanitização, validação de arquivos e rate limiting.
- `/src/server/security/crypto-shield.test.ts`: Suíte de testes unitários (`node:test`) validando toda a camada de segurança.
- `/src/server/db/postgres-schema.sql`: Schema DDL canônico para PostgreSQL 16+ (`users`, `password_resets`, `audit_logs`, `metrics_daily`).
- `/src/server/db/repository.ts`: Repositório transacional preparado para PostgreSQL com persistência local automática em `.data/kore_postgres_store.json`.
- `/src/server/infra/queue-cache.ts`: Adaptador de Cache e Filas para **Redis** e **BullMQ** (`REDIS_ENABLED`, `BULLMQ_ENABLED`), com fallback automático em memória quando desabilitado.
- `/src/server/services/llm-gateway.ts`: Gateway unificado server-side para **Google Gemini** (`@google/genai`), **OpenRouter** e **Meta Llama**.
- `/src/server/services/mail-service.ts`: Serviço de envio de e-mails transacionais e recuperação de senha via **Resend** ou **SMTP** integrado à fila BullMQ.

---

## 3. Níveis de Acesso (RBAC: Admin vs. Cliente)

| Recurso / Rota | Administrador (`admin`) | Cliente (`client`) |
| :--- | :--- | :--- |
| **Dashboard de Métricas** (`GET /api/dashboard/metrics`) | Permitido | Permitido |
| **Meu Perfil & Senha** (`PATCH /api/profile`, `POST /api/profile/password`) | Permitido (próprio perfil) | Permitido (próprio perfil) |
| **Gerenciar Usuários (CRUD)** (`GET/POST/PATCH/DELETE /api/users`) | Permitido (CRUD completo) | Bloqueado (`403 Forbidden` + oculto na UI) |
| **Logs de Auditoria** (`GET /api/logs`) | Permitido (visão global) | Bloqueado (`403 Forbidden`) |
| **Infraestrutura, BullMQ & LLMs** (`/api/infra/*`) | Permitido | Bloqueado (`403 Forbidden`) |

### Credenciais Padrão de Demonstração
- **Administrador**: `admin@kore.dev` / `Admin@123456`
- **Cliente**: `cliente@kore.dev` / `Cliente@123456`

---

## 4. Variáveis de Ambiente (`.env`)

Copie `.env.example` para `.env` e ajuste conforme o ambiente:

1. **Segurança**: `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`, `WEBHOOK_SECRET`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `AUTH_RATE_LIMIT_MAX_REQUESTS`, `MAX_UPLOAD_SIZE_BYTES`.
2. **PostgreSQL**: `POSTGRES_ENABLED`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_SSL`, `POSTGRES_POOL_MAX`.
3. **Redis & BullMQ (Opcional)**: `REDIS_ENABLED`, `BULLMQ_ENABLED`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `BULLMQ_PREFIX`, `BULLMQ_CONCURRENCY`.
4. **LLMs**: `GEMINI_API_KEY`, `GEMINI_DEFAULT_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_DEFAULT_MODEL`, `LLAMA_API_BASE_URL`, `LLAMA_API_KEY`, `LLAMA_DEFAULT_MODEL`.
5. **E-mail (Resend / SMTP)**: `MAIL_PROVIDER` (`resend` ou `smtp`), `MAIL_FROM`, `RESEND_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

---

## 5. Instruções Obrigatórias para Agentes de IA e IDEs (Cursor, Windsurf, Copilot, Claude, AI Studio)

Qualquer IA ou desenvolvedor que modifique ou expanda este repositório **DEVE** respeitar as seguintes diretrizes inegociáveis:

1. **Segurança e Isolamento de Segredos**:
   - **NUNCA** exponha chaves de API (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `LLAMA_API_KEY`, `RESEND_API_KEY`, `JWT_SECRET`, `WEBHOOK_SECRET`) no código do cliente (`src/components/*` ou `src/App.tsx`). Todas as chamadas a LLMs e envios de e-mail devem ocorrer exclusivamente no servidor (`src/server/*`).
   - **NUNCA** armazene senhas em texto puro ou tokens de recuperação sem hash. Utilize sempre `hashPassword` (`scrypt`) e `hashToken` (`SHA-256`) de `src/server/security/crypto-shield.ts`.
2. **Controle de Acesso Baseado em Roles (RBAC)**:
   - Toda nova rota administrativa em `server.ts` **DEVE** utilizar a cadeia de middlewares `requireAuth, requireAdmin`.
   - Rotas de cliente devem validar `req.auth.sub` contra o `ownerId` do recurso usando `canAccessResource()`.
3. **Rastreabilidade e Auditoria (`AuditLog`)**:
   - Toda mutação de estado (criação, edição, exclusão, falha de login, alteração de senha, disparo de job ou webhook) **DEVE** registrar um evento via `dbRepo.appendAuditLog(...)`.
4. **Banco de Dados e Filas**:
   - O banco de dados padrão é o **PostgreSQL**. Qualquer nova tabela ou coluna adicionada ao repositório deve ser refletida no arquivo DDL `/src/server/db/postgres-schema.sql`.
   - O sistema de cache (**Redis**) e filas (**BullMQ**) deve permanecer **opcional** (`REDIS_ENABLED` / `BULLMQ_ENABLED`), mantendo compatibilidade com o fallback em memória em `src/server/infra/queue-cache.ts` para não quebrar ambientes locais de desenvolvimento.
5. **Padrão Visual e Internacionalização (i18n)**:
   - **ZERO Emojis**: Não insira emojis na interface, botões, títulos ou mensagens de sistema.
   - **ZERO Subtítulos Acima de Títulos**: Mantenha cabeçalhos limpos e diretos, sem pequenos rótulos em caixa alta acima de `<h1>`/`<h2>`.
   - Todo texto visível ao usuário deve ser cadastrado nos três idiomas (`pt-BR`, `es`, `en`) dentro de `/src/shared/i18n.ts`.
   - Todos os valores numéricos, contadores, timestamps e métricas devem utilizar `tabular-nums` (`font-mono`).

---

## 6. Comandos de Execução e Testes

```bash
# Executar testes unitários de segurança, RBAC, JWT e Rate Limit
npx --yes tsx --test src/server/security/crypto-shield.test.ts

# Verificar tipagem TypeScript
npm run lint

# Iniciar servidor full-stack em desenvolvimento (porta 3000)
npm run dev

# Gerar build de produção
npm run build
```

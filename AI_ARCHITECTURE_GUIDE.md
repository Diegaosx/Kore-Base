# AI & IDE Architecture Guide (`.cursorrules` / AI Context Reference)

Este documento instrui assistentes de IA e IDEs inteligentes sobre como navegar, explicar e expandir este repositório base sem violar suas garantias de segurança, arquitetura e design.

## 1. Como Explicar Este Projeto em Qualquer IDE

Quando um desenvolvedor perguntar *"Como funciona esta base?"*, explique os 6 pilares:

1. **Camada de Autenticação e Tela Split (Cloudflare Pattern)**:
   - Implementada em `src/components/AuthSplitScreen.tsx`.
   - Coluna esquerda dedicada aos formulários (Login, Cadastro, Recuperação de Senha e Redefinição por Token) com seletor de idiomas (`PT-BR`, `ES`, `EN`).
   - Coluna direita dedicada ao slider visual interativo de 3 slides.
2. **Camada de Segurança Blindada (`src/server/security/crypto-shield.ts`)**:
   - **Senhas**: Derivadas via `crypto.scryptSync` com salt aleatório de 16 bytes e verificadas com `crypto.timingSafeEqual`.
   - **Sessões**: Tokens JWT `HS256` assinados e validados nativamente sem dependências vulneráveis.
   - **Rate Limiting**: Algoritmo de janela deslizante separado para rotas gerais (`RATE_LIMIT_MAX_REQUESTS`) e rotas sensíveis de autenticação (`AUTH_RATE_LIMIT_MAX_REQUESTS`).
   - **Webhooks**: Validação `HMAC-SHA256` (`X-Webhook-Signature` + `X-Webhook-Timestamp`) com janela de tolerância de 300 segundos contra ataques de replay.
   - **Arquivos**: Validação de tamanho máximo, bloqueio de Path Traversal (`..`), lista de permissão MIME e verificação de cabeçalho binário (Magic Bytes).
3. **Banco de Dados PostgreSQL (`src/server/db/`)**:
   - Schema SQL canônico em `src/server/db/postgres-schema.sql`.
   - Repositório tipado em `src/server/db/repository.ts`.
4. **Filas BullMQ & Cache Redis Opcionais (`src/server/infra/queue-cache.ts`)**:
   - Controlados por `REDIS_ENABLED` e `BULLMQ_ENABLED`.
   - Filas pré-configuradas: `email-dispatch`, `audit-sync`, `webhook-delivery`, `llm-processing`.
5. **Gateway Multi-LLM (`src/server/services/llm-gateway.ts`)**:
   - Suporte nativo no backend para **Google Gemini** (`@google/genai`), **OpenRouter** e **Meta Llama**.
6. **Recuperação de Senha com Resend e SMTP (`src/server/services/mail-service.ts`)**:
   - Gera token criptográfico (`kr_...`), salva apenas o hash `SHA-256` no banco e despacha o e-mail via **Resend** ou **SMTP** enfileirado no BullMQ.

## 2. Checklist Antes de Aceitar um Pull Request ou Edição por IA

- [ ] Nenhum segredo ou chave de API foi importado no código React (`src/components/*`).
- [ ] Todas as strings da interface existem em `pt-BR`, `es` e `en` em `src/shared/i18n.ts`.
- [ ] Nenhum emoji ou subtítulo decorativo acima de títulos foi introduzido.
- [ ] A suíte `npx --yes tsx --test src/server/security/crypto-shield.test.ts` passa com 100% de sucesso.
- [ ] `npm run lint` (`tsc --noEmit`) compila sem erros.

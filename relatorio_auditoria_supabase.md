# Relatório de Auditoria de Segurança: Supabase Schema `public` (Dollar Alvo)
**Status Atualizado da Plataforma**

Este documento atualizado consolida a arquitetura e o estado revisado de segurança (RLS, Policies, Security Definer Functions e Foreign Keys) do esquema `public` do banco de dados (Projeto: `blobgpedbfdjweiyxbzu`).

---

## 1. Visão Geral das Tabelas e Status do RLS (Row Level Security)

Nesta revalidação, averiguamos 10 tabelas registradas no sistema. Avaliando a tabela de sistema `pg_class`, atestamos que a brecha de segurança anterior foi **corrigida com sucesso**. Nenhuma tabela crítica expõe dados abertamente!

�️ **RLS ATIVADO (Sistema Totalmente Protegido):**
- `metas` *(Corrigido - Agora protegido contra acessos globais)*
- `grid_valores` *(Corrigido - Dados das parcelas devidamente blindados)*
- `profiles`
- `financial_goals`
- `all_chat`
- `chat_registros`
- `tabela_de_teste`
- `Protocolo_1_1_remessa`
- `Protocolo_1_2_remessa`
- `foco principal picado`

---

## 2. Políticas de Segurança Ativas (Policies)

A extração de políticas (`pg_policies`) reflete que não apenas o RLS foi ativado, mas as regras corretas de restrição (baseadas no usuário autenticado) foram amarradas:

### Novas Políticas Corrigidas:
- **`metas`**:
  - `Acesso isolado a metas` (ALL):
  - *Qualifier:* `(auth.uid() = user_id)` -> **Garante que o manipulador só enxergue as próprias metas.**
- **`grid_valores`**:
  - `Acesso isolado ao grid` (ALL):
  - *Qualifier:* `(meta_id IN ( SELECT metas.id FROM metas WHERE (metas.user_id = auth.uid())))` -> **Excelente uso de subquery para herdar a permissão da meta pai, blindando os grids.**

### Demais Políticas Pré-existentes:
- **`profiles`**:
  - `Privado: perfis` (ALL): `(auth.uid() = id)`
  - `Users can view own profile` (SELECT): `(auth.uid() = id)`
- **`financial_goals`**:
  - `Privado: metas` e `Users can manage own goals` (ALL): `(auth.uid() = user_id)`
- **`all_chat` / `chat_registros`**:
  - Ambos com policies (ALL) restritas pelo qualifier: `(auth.uid() = user_id)`

---

## 3. Funções e Triggers (Security Definer)

O sistema mantém ativas as 5 funções `SECURITY DEFINER` mapeadas (elas contornam as políticas RLS para automatizar tarefas cruciais no sistema):

1. **`handle_new_user()`** (Trigger Supabase Auth para perfis)
2. **`handle_deletion_status_sync()`** (Trigger para agendamento de suspensão via Auth)
3. **`perform_account_cleanup()`** (CRON para limpar do sistema usuários após 30 dias de cancelamento)
4. **`notify_account_deletion_initiated()`** (Webhook Post para o N8n)
5. **`create_meta_with_grid_periods(...)`** (Procedure de geração de parcelamento financeiro no grid)

*Essas funções foram auditadas no passo anterior e seus SQLs base estão coerentes com seu propósito.*

---

## 4. Foreign Keys e Cascading

O modelo mantém a mesma lógica referencial relatada:

- **Constraint Identificada**:
   - `grid_valores.meta_id` -> aponta para -> `metas.id` *(ON DELETE CASCADE)*. Se uma meta é deletada, seus valores grid morrem nativamente via banco.
- **Deleção via `auth.users`**:
   - As entidades-raiz (`profiles`, `metas`, etc.) continuam sem CHAVE ESTRANGEIRA (Foreign Key) formal apontando para `auth.users.id`.
   - **Mitigação Atestada:** A limpeza se dá ativamente via a função `perform_account_cleanup()` configurada acima, operando manualmente o ciclo de vida (soft-delete de 30 dias). Do ponto de vista de regra de negócio, isso está funcional.

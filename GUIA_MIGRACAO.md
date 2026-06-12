# GUIA COMPLETO DE MIGRAÇÃO — VELOX TMS
## Base44 → GitHub + Vercel + Supabase
### Para leigos — siga exatamente nesta ordem

---

## O QUE VOCÊ VAI PRECISAR
- Conta no GitHub (github.com)
- Conta no Supabase (supabase.com)
- Conta na Vercel (vercel.com)
- O arquivo ZIP do projeto que está neste pacote
- Cerca de 45 minutos

---

# PARTE 1 — SUPABASE (banco de dados)
## Criar o banco de dados do sistema

---

### PASSO 1.1 — Entrar no Supabase

1. Abra o navegador e vá para **supabase.com**
2. Clique em **Sign In** (entrar) no canto superior direito
3. Entre com sua conta

---

### PASSO 1.2 — Criar um novo projeto

1. Na tela inicial, clique no botão verde **"New project"**
2. Preencha os campos:
   - **Name:** `velox-tms`
   - **Database Password:** crie uma senha forte (ex: `Velox@2026!`) — **anote essa senha em algum lugar seguro**
   - **Region:** selecione **South America (São Paulo)** — isso deixa o sistema mais rápido para o Brasil
3. Clique em **"Create new project"**
4. ⏳ Aguarde cerca de 2 minutos enquanto o Supabase cria o projeto (uma barra de progresso aparece)

---

### PASSO 1.3 — Criar as tabelas do banco

1. Quando o projeto terminar de carregar, no menu lateral esquerdo, clique em **"SQL Editor"** (ícone de código `</>`)
2. Você verá uma área de texto em branco
3. Abra o arquivo **`supabase/schema.sql`** que está dentro do projeto (use o Bloco de Notas ou qualquer editor de texto)
4. Selecione **todo o conteúdo** do arquivo (Ctrl+A) e copie (Ctrl+C)
5. Cole (Ctrl+V) na área de texto do SQL Editor do Supabase
6. Clique no botão verde **"Run"** (ou pressione Ctrl+Enter)
7. ✅ Você deve ver a mensagem: `Schema criado com sucesso!` no rodapé

---

### PASSO 1.4 — Criar o bucket de arquivos (para fotos e documentos)

1. No menu lateral, clique em **"Storage"** (ícone de pasta)
2. Clique em **"New bucket"**
3. Preencha:
   - **Name:** `uploads`
   - Marque a opção **"Public bucket"** (deixar público para que os arquivos possam ser acessados)
4. Clique em **"Create bucket"**

---

### PASSO 1.5 — Copiar as credenciais do Supabase

Você vai precisar de 2 informações do Supabase para configurar o sistema:

1. No menu lateral, clique em **"Settings"** (ícone de engrenagem, no rodapé do menu)
2. Clique em **"API"**
3. Você vai ver:
   - **Project URL** — começa com `https://` e termina com `.supabase.co`
   - **Project API keys** → **anon public** — uma chave longa começando com `eyJ`

4. **Copie e anote esses dois valores** (você vai precisar deles no Passo 3.3):
   ```
   Project URL: https://XXXXXXXXXXXXXXXX.supabase.co
   Anon Key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXX
   ```

---

### PASSO 1.6 — Habilitar autenticação por Google (opcional, mas recomendado)

Se você quiser que os usuários entrem com o Google:

1. No menu lateral, clique em **"Authentication"**
2. Clique em **"Providers"**
3. Encontre **"Google"** e clique nele
4. Ative o toggle (botão liga/desliga)
5. Por enquanto deixe assim — você pode configurar depois

---

# PARTE 2 — GITHUB (código)
## Salvar o código no GitHub

---

### PASSO 2.1 — Entrar no GitHub

1. Abra o navegador e vá para **github.com**
2. Entre com sua conta

---

### PASSO 2.2 — Criar um novo repositório

1. Na tela inicial, clique no botão verde **"New"** (ou no `+` no canto superior direito → "New repository")
2. Preencha os campos:
   - **Repository name:** `velox-tms`
   - **Description:** `Sistema TMS Velox Transportadora`
   - Selecione **"Private"** (privado — só você vê)
   - **NÃO** marque nenhuma das checkboxes (Initialize with README, etc.)
3. Clique em **"Create repository"**
4. Você será redirecionado para uma página quase em branco com instruções

---

### PASSO 2.3 — Instalar o Git no seu computador (se não tiver)

**Verificar se já tem o Git:**
1. Aperte as teclas **Windows + R**, digite `cmd` e pressione Enter (ou pesquise "Prompt de Comando" no menu iniciar)
2. Na tela preta que abrir, digite: `git --version`
3. Se aparecer algo como `git version 2.x.x`, você já tem o Git ✅
4. Se aparecer erro, instale o Git:
   - Vá para **git-scm.com/download/win**
   - Baixe o instalador e instale com todas as opções padrão

---

### PASSO 2.4 — Preparar os arquivos do projeto

1. **Descompacte** o arquivo ZIP do projeto em alguma pasta do seu computador
   - Ex: descompactar em `C:\projetos\velox-tms\`
2. Dentro da pasta descompactada, localize o arquivo chamado **`.env`**
3. Abra esse arquivo com o Bloco de Notas
4. Substitua o conteúdo pelas suas credenciais do Supabase (copiadas no Passo 1.5):
   ```
   VITE_SUPABASE_URL=https://COLE_AQUI_SEU_PROJECT_URL
   VITE_SUPABASE_ANON_KEY=COLE_AQUI_SUA_ANON_KEY
   ```
5. Salve o arquivo (Ctrl+S)

⚠️ **IMPORTANTE:** O arquivo `.env` com as senhas **NUNCA** será enviado ao GitHub — o `.gitignore` já está configurado para bloqueá-lo.

---

### PASSO 2.5 — Enviar o código para o GitHub

1. Abra o **Prompt de Comando** (Windows + R → `cmd`)
2. Navegue até a pasta do projeto:
   ```
   cd C:\projetos\velox-tms
   ```
   *(substitua pelo caminho real onde você descompactou)*
3. Execute os comandos abaixo, **um de cada vez**, pressionando Enter após cada um:

   ```
   git init
   ```
   ```
   git add .
   ```
   ```
   git commit -m "Velox TMS - migração inicial para Supabase"
   ```
   ```
   git branch -M main
   ```

4. Agora você precisa do endereço do seu repositório no GitHub.
   Volte ao GitHub, na página do repositório que você criou.
   Copie o endereço que aparece em destaque, que se parece com:
   `https://github.com/SEU_USUARIO/velox-tms.git`

5. Execute (substituindo pelo endereço copiado):
   ```
   git remote add origin https://github.com/SEU_USUARIO/velox-tms.git
   ```
   ```
   git push -u origin main
   ```

6. O GitHub pode pedir seu usuário e senha. Digite-os.
   - Se pedir "token" em vez de senha, veja o passo abaixo.

**Se o GitHub pedir um "Personal Access Token":**
1. No GitHub, clique na sua foto de perfil → **Settings**
2. Role para baixo → **Developer settings**
3. **Personal access tokens** → **Tokens (classic)** → **Generate new token**
4. Em "Note" escreva `velox-tms`
5. Marque a checkbox **repo**
6. Clique em **Generate token**
7. Copie o token gerado e use como senha

7. ✅ Quando terminar, recarregue a página do repositório no GitHub — você deve ver todos os arquivos do projeto lá.

---

# PARTE 3 — VERCEL (hospedagem do site)
## Colocar o sistema no ar

---

### PASSO 3.1 — Entrar na Vercel

1. Abra o navegador e vá para **vercel.com**
2. Entre com sua conta (se criou com GitHub, ainda melhor)

---

### PASSO 3.2 — Criar um novo projeto na Vercel

1. Na tela inicial, clique em **"Add New..."** → **"Project"**
2. Se aparecer "Import Git Repository", você vai ver seus repositórios do GitHub
   - Se não aparecer, clique em **"Connect to GitHub"** e autorize
3. Encontre o repositório **`velox-tms`** e clique em **"Import"**

---

### PASSO 3.3 — Configurar as variáveis de ambiente

Esta é a parte mais importante. Você precisa dizer à Vercel quais são suas chaves do Supabase.

1. Antes de clicar em "Deploy", procure a seção **"Environment Variables"**
2. Adicione as duas variáveis abaixo (clicando em "Add" para cada uma):

   **Variável 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: cole aqui o **Project URL** do Supabase (ex: `https://XXXX.supabase.co`)

   **Variável 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: cole aqui a **Anon Key** do Supabase (a chave longa começando com `eyJ`)

3. Clique em **"Deploy"**
4. ⏳ Aguarde 2-3 minutos enquanto a Vercel monta e publica o sistema

---

### PASSO 3.4 — Acessar o sistema

1. Quando terminar, a Vercel vai mostrar uma tela de sucesso com confetes 🎉
2. Você verá um endereço como: `https://velox-tms.vercel.app`
3. Clique nesse endereço — o sistema deve abrir!

---

# PARTE 4 — CONFIGURAÇÃO INICIAL DO SISTEMA
## Primeiro acesso e configurações

---

### PASSO 4.1 — Criar o primeiro usuário admin

1. Acesse a URL do seu sistema (ex: `https://velox-tms.vercel.app`)
2. Clique em **"Criar conta"**
3. Preencha seu e-mail e uma senha
4. Verifique seu e-mail — chegará um link de confirmação
5. Clique no link de confirmação

---

### PASSO 4.2 — Definir você como admin no Supabase

Por padrão, o primeiro usuário fica com role `admin`, mas vamos confirmar:

1. Volte ao **Supabase** → seu projeto
2. No menu lateral, clique em **"Table Editor"**
3. Clique na tabela **`user_profiles`**
4. Você deve ver seu e-mail cadastrado com `role = admin`
5. Se o role estiver diferente de `admin`, clique na célula e altere para `admin`

---

### PASSO 4.3 — Configurar a empresa no sistema

1. No sistema, acesse **/admin/config**
2. Preencha os dados da empresa (nome, CNPJ, telefone, etc.)
3. Configure os preços de frete
4. Configure a área de atuação

---

### PASSO 4.4 — Criar usuário para motoristas

Para cada motorista que vai usar o app:

1. No Supabase → **Authentication** → **Users** → **Invite user**
2. Digite o e-mail do motorista
3. Ele receberá um e-mail para criar a senha
4. Depois, no Supabase → **Table Editor** → **user_profiles**
5. Encontre o registro do motorista e mude `role` de `admin` para `motorista`
6. No campo `driver_id`, cole o ID do motorista cadastrado no sistema

---

# PARTE 5 — ATUALIZAÇÕES FUTURAS
## Como atualizar o sistema quando houver melhorias

---

### Quando você receber arquivos atualizados do sistema:

1. Substitua os arquivos na pasta do projeto no seu computador
2. Abra o Prompt de Comando na pasta do projeto
3. Execute:
   ```
   git add .
   git commit -m "Atualização do sistema"
   git push
   ```
4. A Vercel vai detectar automaticamente e publicar a nova versão em 2-3 minutos
5. ✅ Pronto — nenhuma outra ação necessária

---

# PARTE 6 — PROBLEMAS COMUNS E SOLUÇÕES

---

### "Não consigo fazer login"
- Verifique se as variáveis de ambiente na Vercel estão corretas (Passo 3.3)
- Confirme o e-mail que você cadastrou (verifique a caixa de entrada)

### "O site abre mas aparece erro"
- No Supabase → SQL Editor → execute novamente o `schema.sql`
- Verifique se o bucket `uploads` foi criado no Storage

### "Quero usar meu próprio domínio (ex: sistema.veloxlog.com.br)"
- Na Vercel → seu projeto → **Settings** → **Domains**
- Clique em **"Add"** e siga as instruções

### "Quero fazer backup dos dados"
- No Supabase → **Settings** → **Database** → **Backups**
- O plano gratuito tem backup automático diário

---

# RESUMO RÁPIDO — SEQUÊNCIA DE PASSOS

```
1. Supabase:
   ✓ Criar projeto "velox-tms" (região São Paulo)
   ✓ Executar o schema.sql no SQL Editor
   ✓ Criar bucket "uploads" no Storage
   ✓ Copiar Project URL e Anon Key

2. GitHub:
   ✓ Criar repositório "velox-tms" (privado)
   ✓ Editar o arquivo .env com as credenciais do Supabase
   ✓ Enviar o código com git push

3. Vercel:
   ✓ Importar o repositório do GitHub
   ✓ Adicionar as 2 variáveis de ambiente (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY)
   ✓ Clicar em Deploy

4. Sistema:
   ✓ Criar conta de admin
   ✓ Configurar dados da empresa
   ✓ Pronto para usar!
```

---

# INFORMAÇÕES TÉCNICAS (para referência)

```
Banco de dados: Supabase (PostgreSQL)
Hospedagem:     Vercel
Repositório:    GitHub (privado)
Tecnologias:    React 18 + Vite + Tailwind CSS + Supabase JS

Tabelas criadas:
  - company_settings  (configurações da empresa)
  - clients           (clientes)
  - suppliers         (fornecedores)
  - drivers           (motoristas)
  - trucks            (caminhões)
  - orders            (pedidos/coletas)
  - trips             (viagens)
  - revenues          (receitas)
  - expenses          (despesas)
  - alerts            (alertas automáticos)
  - incidents         (ocorrências)
  - schedule_blocks   (bloqueios de agenda)
  - contact_messages  (mensagens do site)
  - testimonials      (depoimentos)
  - user_profiles     (usuários e permissões)
```

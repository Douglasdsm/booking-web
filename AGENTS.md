# AGENTS.md

## Objetivo do projeto

Sistema SaaS de agendamento multi-tenant para barbearias e negócios similares.

Frontend público responsável pelo fluxo de agendamento.

---

# Stack

* Angular 22
* TailwindCSS v4
* TypeScript
* Signals
* Standalone Components
* Lazy Loading

---

# Arquitetura

Utilizar:

* Feature Based Architecture
* Mobile First
* Componentização reutilizável
* Código limpo
* Separação clara de responsabilidades

Estrutura esperada:

```txt
src/app/

core/
shared/
layout/
features/
```

---

# Regras do Booking

Fluxo obrigatório:

1. Seleção de serviços
2. Seleção de prestador
3. Seleção de horário
4. Dados do cliente
5. Confirmação
6. Sucesso

---

# Regras de UX

* Mobile first obrigatório
* Interface simples
* Poucos cliques
* Alta performance
* Fluxo rápido
* Botões grandes para mobile
* Evitar excesso de informações
* UX focada em conversão

---

# Regras Técnicas

## Obrigatório

* Utilizar Signals
* Utilizar Standalone Components
* Utilizar TailwindCSS
* Utilizar Lazy Loading
* Utilizar tipagem forte
* Utilizar interceptors para autenticação
* Utilizar services centralizados
* Utilizar componentes reutilizáveis

---

# Não utilizar

* Não utilizar NgRx inicialmente
* Não utilizar PrimeNG no booking público
* Não utilizar jQuery
* Não utilizar módulos Angular antigos
* Não utilizar lógica duplicada

---

# Multi-tenant

O sistema é multi-tenant.

A empresa será identificada por slug.

Exemplo:

```txt
/agendar/barbearia-do-joao
```

O slug deve carregar:

* empresa
* tema
* logo
* banner
* configurações

---

# API

A API REST .NET utiliza autenticação visitante.

Fluxo:

1. Criar usuário visitante
2. Receber accessToken
3. Utilizar Bearer Token nas próximas requisições

---

# Regra importante de horários

A duração do agendamento deve ser:

```txt
Soma da duração de todos os serviços selecionados
```

Exemplo:

```txt
Corte = 45
Barba = 30

Total = 75 minutos
```

O valor deve ser enviado para:

```txt
POST /horariodisponivel
```

---

# Organização de Features

Estrutura esperada:

```txt
features/

home/
servicos/
prestadores/
agenda/
cliente/
confirmacao/
sucesso/
```

---

# Componentes reutilizáveis

Criar componentes reutilizáveis para:

* buttons
* cards
* loading
* stepper
* calendar
* service-card
* professional-card
* modals
* headers

---

# Estilo de código

* Código simples
* Evitar overengineering
* Priorizar legibilidade
* Componentes pequenos
* Funções curtas
* Responsabilidade única

---

# Objetivo da IA

Antes de implementar:

1. Analisar arquitetura
2. Propor melhorias
3. Validar fluxo
4. Depois implementar

Evitar gerar grandes quantidades de código sem contexto.

Implementar por etapas pequenas e organizadas.

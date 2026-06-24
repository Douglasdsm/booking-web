Fluxo do Booking Web
Objetivo

Sistema público de agendamento multi-tenant para barbearias e negócios similares.

Arquitetura:

Angular 22
TailwindCSS
Mobile First
Standalone Components
Signals
API REST .NET
Fluxo do usuário
1. Cliente informa nome e telefone
2. Sistema gera token visitante
3. Cliente escolhe serviços
4. Cliente escolhe prestador
5. Sistema consulta horários disponíveis
6. Cliente confirma agendamento
Autenticação visitante
Endpoint
POST /usuariovisitante
Request
{
  "nome": "string",
  "telefone": "string"
}
Response
{
  "nome": "dsm",
  "tokens": {
    "accessToken": "valorToken"
  }
}
Regras
Todo fluxo do booking utiliza token visitante
O token deve ser armazenado no frontend
Utilizar Authorization Bearer Token nas próximas requisições
Não existe login/senha para o cliente visitante
Listagem de serviços
Endpoint
GET /servicoprice?PessoaJuridicaID=1
Objetivo

Retorna os serviços disponíveis da empresa.

Response
{
  "servicos": [
    {
      "servicoId": 1,
      "tabelaPrecosID": 1,
      "nome": "Corte Masculino",
      "descricao": "Corte tradicional ou moderno com acabamento na navalha.",
      "duracaoMinutos": 45,
      "preco": 45
    }
  ]
}
Regras
O cliente pode selecionar múltiplos serviços
O frontend deve calcular:
duração total
valor total
A duração total será utilizada na consulta de horários
Listagem de prestadores
Endpoint
POST /prestador/list-prestador
Request
{
  "pessoaJuridicaID": 1,
  "filialID": 1
}
Response
{
  "prestadores": [
    {
      "nome": "Matheus",
      "usuarioID": 2,
      "pessoaID": 2,
      "pessoaJuridicaID": 1,
      "filialID": 1,
      "pessoaFisicaID": 2,
      "url": "https://imagem.com/avatar.webp"
    }
  ]
}
Regras
Exibir foto/avatar do prestador
Exibir nome do prestador
O cliente pode selecionar um prestador específico
Futuramente poderá existir opção “qualquer profissional”
Consulta de horários disponíveis
Endpoint
POST /horariodisponivel
Request
{
  "prestadorId": 1,
  "data": "2026-06-19T00:31:41.505Z",
  "duracaoMinutos": 50
}
Regras importantes
duraçãoMinutos

O valor enviado deve ser:

SOMA DAS DURAÇÕES DOS SERVIÇOS SELECIONADOS

Exemplo:

Corte Masculino = 45 min
Barba = 30 min

Total = 75 minutos
Response
[
  {
    "horaInicio": "08:00:00",
    "horaFim": "08:50:00"
  }
]
Regras de negócio do horário
Os horários retornam em intervalos de 5 minutos
O frontend deve exibir apenas horários disponíveis
O horário selecionado deve considerar:
prestador
data
duração total
A API já retorna apenas horários válidos
Arquitetura Frontend
Estrutura
src/app/

core/
shared/
layout/
features/
Features
features/

home/
servicos/
prestadores/
agenda/
cliente/
confirmacao/
sucesso/
Fluxo das telas
Home
↓
Seleção de serviços
↓
Seleção de prestador
↓
Seleção de data e horário
↓
Dados cliente
↓
Confirmação
↓
Sucesso
Requisitos UX
Mobile first
Fluxo rápido
Poucos cliques
Alta conversão
Performance
Interface simples
Responsivo
Multi-tenant

A aplicação será multi-tenant.

Exemplo de rota:

/agendar/:slug

Exemplo:

/agendar/barbearia-do-joao

O slug identifica:

empresa
tema
logo
banner
configurações
Regras técnicas
Utilizar Angular 22
Utilizar Standalone Components
Utilizar Signals
Utilizar TailwindCSS
Utilizar Lazy Loading
Não utilizar NgRx inicialmente
Não utilizar PrimeNG no booking público
Utilizar arquitetura baseada em features
Componentes reutilizáveis
Mobile first obrigatório

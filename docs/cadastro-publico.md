# Cadastro Publico

## Rota

- Principal: `/cadastrar`
- Compatibilidade: `/criar-conta` redireciona para `/cadastrar`
- A tela nao possui guard e nao exige token.

## Fluxo

- Login exibe: `Ainda não possui uma conta? Cadastre-se`.
- Cadastro exibe: `Já possui uma conta? Entrar`.
- Convites publicos enviam o usuario para `/cadastrar` mantendo `returnUrl` seguro.
- Apos sucesso com login automatico, o token e salvo pelo `PermanentAuthService` e o usuario retorna para a rota interna permitida ou para `/agendar/demo`.
- O e-mail criado no backend fica como nao verificado; o login imediato continua permitido nesta etapa.

## Request

O service chama `POST /usuario/public/register` com:

```json
{
  "nome": "Douglas Martins",
  "email": "douglas@exemplo.com",
  "telefone": "65999999999",
  "senha": "Senha123",
  "confirmacaoSenha": "Senha123",
  "aceitouTermos": true,
  "aceitouPoliticaPrivacidade": true
}
```

## Validacoes da Tela

- Reactive Forms.
- Nome obrigatorio, trim, maximo 255, nao aceita somente espacos.
- E-mail obrigatorio, trim, lowercase, formato valido.
- Telefone obrigatorio e enviado somente com numeros.
- Senha obrigatoria, minimo 6 caracteres, igual ao backend atual.
- Confirmacao obrigatoria e igual a senha.
- Termos e politica de privacidade devem ser marcados pelo usuario.
- Botao bloqueia duplo envio.

## UX

- Mobile-first e responsiva.
- Labels visiveis.
- Botao para mostrar/ocultar senha e confirmacao.
- Indicador simples de requisito da senha.
- Estados de loading, erro e sucesso.
- Uma acao principal: `Criar conta`.

## Backend Relacionado

- Endpoint: `POST /Usuario/public/register`.
- Normalizacao de e-mail: `Trim().ToLowerInvariant()` centralizada no backend.
- Unicidade: indice unico parcial `UX_Usuario_UserNormalizado_Ativo`.
- Consentimentos: o backend registra separadamente termos de uso e politica de privacidade.
- Versoes atuais: `terms-of-use-v1` e `privacy-policy-v1`.
- Rate limiting: IP, hash do e-mail normalizado e limite global do endpoint.
- Conflito de e-mail: `409 Conflict`; essa resposta permite enumeracao de contas e esta documentada como decisao a revisar se a politica de privacidade ficar mais restritiva.

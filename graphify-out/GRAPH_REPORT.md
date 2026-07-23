# Graph Report - booking-web  (2026-07-22)

## Corpus Check
- 63 files · ~30,119 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 408 nodes · 762 edges · 20 communities (14 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4a8db744`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]

## God Nodes (most connected - your core abstractions)
1. `PublicConviteStore` - 30 edges
2. `BookingShellPage` - 21 edges
3. `PublicConvitePage` - 21 edges
4. `BookingStore` - 20 edges
5. `BookingAvailableSlot` - 16 edges
6. `AuthReturnUrlService` - 14 edges
7. `bookingAuthContext` - 13 edges
8. `PermanentAuthService` - 13 edges
9. `API_CONFIG` - 12 edges
10. `BookingApiService` - 11 edges

## Surprising Connections (you probably didn't know these)
- `PublicConviteState` --references--> `PublicConvite`  [EXTRACTED]
  src/app/features/convites-publicos/store/public-convite.store.ts → src/app/features/convites-publicos/models/public-convite.models.ts
- `PublicConviteState` --references--> `AcceptClientConviteResponse`  [EXTRACTED]
  src/app/features/convites-publicos/store/public-convite.store.ts → src/app/features/convites-publicos/models/public-convite.models.ts
- `PublicConviteState` --references--> `AcceptConviteResponse`  [EXTRACTED]
  src/app/features/convites-publicos/store/public-convite.store.ts → src/app/features/convites-publicos/models/public-convite.models.ts

## Import Cycles
- None detected.

## Communities (20 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (28): BookingClienteStepComponent, BookingConfirmacaoStepComponent, BookingDataHorarioStepComponent, BookingDateOption, BookingFooterActionsComponent, BookingLayoutComponent, BookingProfissionalStepComponent, BookingServicoStepComponent (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (28): prefix, projectType, root, schematics, sourceRoot, cli, analytics, packageManager (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (21): API_CONFIG, ApiConfig, ApiEndpointsConfig, BOOKING_AUTH_CONTEXT, bookingAuthContext, authContextInterceptor(), getTokenForContext(), PermanentAuthResponse (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (24): dependencies, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/platform-server, @angular/router (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (33): AcceptClientConviteRequest, AcceptClientConviteResponse, AcceptConviteResponse, AcceptProviderConviteRequest, AcceptProviderConviteResponse, EscopoAutorizacaoPessoaJuridica, PublicConvite, PublicConvitePrestador (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (32): build, serve, test, architect, builder, configurations, defaultConfiguration, options (+24 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (15): API, Arquitetura, Componentes reutilizáveis, Estilo de código, Multi-tenant, Não utilizar, Objetivo da IA, Objetivo do projeto (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (6): App, appConfig, config, serverConfig, routes, serverRoutes

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (3): PublicConviteStore, normalizeCpf(), publicConviteScopeFlags()

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (8): AuthReturnUrlService, PermanentAuthService, LoginPage, RegisterPage, consumeAuthReturnUrl(), extractApiErrorMessage(), onlyDigits(), resolveInitialReturnUrl()

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (7): Additional Resources, BookingWeb, Building, Code scaffolding, Development server, Running end-to-end tests, Running unit tests

### Community 14 - "Community 14"
Cohesion: 0.40
Nodes (4): angularApp, app, browserDistFolder, reqHandler

## Knowledge Gaps
- **114 isolated node(s):** `$schema`, `version`, `packageManager`, `analytics`, `newProjectRoot` (+109 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PublicConviteStore` connect `Community 10` to `Community 2`, `Community 4`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `BookingShellPage` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `packageManager` to the rest of the system?**
  _114 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.058126619770455384 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10505050505050505 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
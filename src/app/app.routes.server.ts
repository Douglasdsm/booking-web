import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'entrar',
    renderMode: RenderMode.Server
  },
  {
    path: 'criar-conta',
    renderMode: RenderMode.Server
  },
  {
    path: 'convite/:token',
    renderMode: RenderMode.Server
  },
  {
    path: 'agendar/:slug',
    renderMode: RenderMode.Server
  },
  {
    path: 'agendar/:slug/:etapa',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];

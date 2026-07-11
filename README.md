# BookingWeb
DOCKER 
Alterar código
→ gerar nova imagem Docker
→ testar localmente
→ enviar ao Docker Hub
→ atualizar o container na nuvem

Na pasta do projeto: cd /e/Projetos/Barbers/Web/booking-web
npm run build -- --configuration production

2. Escolher a versão da imagem

Evite trabalhar somente com latest. Use versões:


v1
v2
v3

Por exemplo, para a próxima publicação:
docker build \
  -t douglassmartins/agendamento-booking-web:v3 \
  -t douglassmartins/agendamento-booking-web:latest \


  docker build -t douglassmartins/agendamento-booking-web:latest .
  .
Isso cria duas tags apontando para a mesma imagem:
douglassmartins/agendamento-booking-web:v3
douglassmartins/agendamento-booking-web:latest

Normalmente, não precisa usar --no-cache. Use somente quando suspeitar que o Docker está reutilizando arquivos antigos:

docker build --no-cache \
  -t douglassmartins/agendamento-booking-web:v3 \
  -t douglassmartins/agendamento-booking-web:latest \
  .


  docker build --no-cache -t douglassmartins/agendamento-booking-web:latest .
3. Testar a nova imagem localmente

Remova o container antigo:

docker rm -f agendamento-booking-web 2>/dev/null || true


docker rm -f agendamento-booking-web
Inicie a nova versão:

docker run -d \
  --name agendamento-booking-web \
  --restart unless-stopped \
  -p 4200:80 \
  douglassmartins/agendamento-booking-web:v3

docker run -d  --name agendamento-booking-web  --restart unless-stopped  -p 4200:80  douglassmartins/agendamento-booking-web:v3


docker run -d  --name agendamento-booking-web  --restart unless-stopped  -p 4200:80  douglassmartins/agendamento-booking-web:latest
Confira:
docker ps
Acesse:http://localhost:4200

Envie a versão: docker push douglassmartins/agendamento-booking-web:v3

docker push douglassmartins/agendamento-booking-web:latest




atualizar:  docker pull douglassmartins/agendamento-booking-web:latest
Remover o container atual
    docker stop agendamento-booking-web
    docker rm agendamento-booking-web



docker run -d \
  --name agendamento-booking-web \
  --restart unless-stopped \
  -p 4200:80 \
  douglassmartins/agendamento-booking-web:latest
 


This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

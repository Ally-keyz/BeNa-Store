import { Router } from 'express';
import { buildOpenApiDocument } from './openapi';

const SWAGGER_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BeNa Origins API docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; }
      .banner { padding: 12px 20px; background: #1f2937; color: #f9fafb; font-size: 14px; }
      .banner strong { color: #fbbf24; }
    </style>
  </head>
  <body>
    <div class="banner">
      BeNa Origins backend — read-only commerce API. Responses are wrapped as
      <strong>{ success, data, meta }</strong>. Fixture mode responses are mocks.
    </div>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
      });
    </script>
  </body>
</html>`;

export function createDocsRouter(serverUrl: string): Router {
  const router = Router();
  const document = buildOpenApiDocument(serverUrl);

  router.get('/', (_req, res) => {
    res.type('text/html').send(SWAGGER_HTML);
  });

  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });

  return router;
}

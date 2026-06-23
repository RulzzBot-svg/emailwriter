import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' 

function geminiProxyPlugin() {
  const routePath = '/api/generate-email';
  const modelName = 'gemini-3.5-flash';

  const handler = async (req, res) => {
    if (req.method !== 'POST' || req.url !== routePath) {
      return false;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const { apiKey, prompt } = JSON.parse(body || '{}');

        if (!apiKey || !prompt) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: { message: 'Missing apiKey or prompt.' } }));
          return;
        }

        const upstreamResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey.trim()
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const payload = await upstreamResponse.text();
        res.statusCode = upstreamResponse.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(payload);
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: { message: error.message || 'Proxy request failed.' } }));
      }
    });

    return true;
  };

  return {
    name: 'gemini-proxy-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        handler(req, res).then((handled) => {
          if (!handled) next();
        }).catch(next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        handler(req, res).then((handled) => {
          if (!handled) next();
        }).catch(next);
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), geminiProxyPlugin()],
})

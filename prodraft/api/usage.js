import { handleUsageRequest } from '../server/handlers.js';
import { applyCors, handleCorsPreflight } from '../server/cors.js';

export default async function handler(req, res) {
  if (handleCorsPreflight(req, res)) {
    return;
  }
  applyCors(res);

  if (req.method !== 'GET') {
    res.status(405).json({ error: { message: 'Method not allowed.' } });
    return;
  }

  try {
    const result = await handleUsageRequest(req);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ error: { message: error?.message || 'Could not load usage.' } });
  }
}

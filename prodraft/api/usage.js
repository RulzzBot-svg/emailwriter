import { handleUsageRequest } from './handlers.js';

export default async function handler(req, res) {
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

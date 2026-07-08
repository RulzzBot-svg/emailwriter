import { handleStripeWebhook } from '../../server/handlers.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed.' } });
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    const result = await handleStripeWebhook(rawBody, signature);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(400).json({ error: { message: error?.message || 'Webhook error.' } });
  }
}

const BASE_URL = 'https://api.pluralonline.com';

export type PineLabsConfig = {
  apiKey: string;
  merchantId: string;
  authToken?: string;
};

export const pineLabsCoverage = [
  { category: 'Orders', endpoint: 'POST /api/v2/orders', role: 'Create transaction records per hospital invoice' },
  { category: 'Balance', endpoint: 'GET /api/v1/balance', role: 'Pre-flight balance and reserve checks' },
  { category: 'Payouts', endpoint: 'POST /api/v1/payouts', role: 'Disburse vendor or partner payouts' },
  { category: 'Settlements', endpoint: 'GET /api/settlements/v1/detail/{utr}', role: 'Fetch live settlement details by UTR for reconciliation' },
  { category: 'Payment Links', endpoint: 'POST /api/pay/v1/paymentlink', role: 'Fallback collections for failed or overdue payments' },
  { category: 'Webhooks', endpoint: 'ORDER_PROCESSED, PAYMENT_FAILED', role: 'Drive reconciliation state transitions' },
  { category: 'Subscriptions', endpoint: 'POST /api/v1/subscriptions/retry', role: 'Retry mandates or recurring collections' },
  { category: 'Affordability', endpoint: 'POST /api/affordability/v1/offer/discovery', role: 'Attach offer intelligence to overdue cases' },
  { category: 'Offer Engine', endpoint: 'POST /api/offer-engine/v1/complete-payment', role: 'Track redemption and completion context' },
  { category: 'MCP Server', endpoint: '60+ tools', role: 'Preferred agent tool layer in production deployments' }
];

export const pineLabsWorkflow = [
  'Fetch settlement details from Pine Labs using the UTR endpoint',
  'Join hospital bank credits against Pine Labs using UTR as the primary key',
  'Flag delayed or high-variance cases for operator review',
  'Persist webhook-driven status changes for full auditability'
];

function buildHeaders(config: PineLabsConfig) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
    'x-merchant-id': config.merchantId,
    Authorization: config.authToken ? `Bearer ${config.authToken}` : ''
  };
}

export async function fetchSettlementByUtr(config: PineLabsConfig, utr: string) {
  const response = await fetch(`${BASE_URL}/api/settlements/v1/detail/${encodeURIComponent(utr)}`, {
    method: 'GET',
    headers: buildHeaders(config)
  });
  return response.json();
}

export async function fetchBalance(config: PineLabsConfig) {
  const response = await fetch(`${BASE_URL}/api/v1/balance`, {
    method: 'GET',
    headers: buildHeaders(config)
  });
  return response.json();
}

export async function createOrder(config: PineLabsConfig, payload: unknown) {
  const response = await fetch(`${BASE_URL}/api/v2/orders`, {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function createPayout(config: PineLabsConfig, payload: unknown) {
  const response = await fetch(`${BASE_URL}/api/v1/payouts`, {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function createPaymentLink(config: PineLabsConfig, payload: unknown) {
  const response = await fetch(`${BASE_URL}/api/pay/v1/paymentlink`, {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify(payload)
  });
  return response.json();
}

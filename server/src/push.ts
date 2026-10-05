// Expo Push Service: https://docs.expo.dev/push-notifications/sending-notifications/
const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const SEND_BATCH = 100;
const RECEIPT_BATCH = 1000;

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default';
  priority?: 'high';
}

export type PushTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error?: string } };

export type PushReceipt = { status: 'ok' } | { status: 'error'; message: string; details?: { error?: string } };

// Returns one ticket per message, in the same order.
export async function sendPush(messages: PushMessage[], accessToken?: string): Promise<PushTicket[]> {
  const tickets: PushTicket[] = [];
  for (let i = 0; i < messages.length; i += SEND_BATCH) {
    const body = await post<{ data: PushTicket[] }>(SEND_URL, messages.slice(i, i + SEND_BATCH), accessToken);
    tickets.push(...body.data);
  }
  return tickets;
}

export async function getReceipts(ids: string[], accessToken?: string): Promise<Record<string, PushReceipt>> {
  const receipts: Record<string, PushReceipt> = {};
  for (let i = 0; i < ids.length; i += RECEIPT_BATCH) {
    const body = await post<{ data: Record<string, PushReceipt> }>(
      RECEIPTS_URL,
      { ids: ids.slice(i, i + RECEIPT_BATCH) },
      accessToken,
    );
    Object.assign(receipts, body.data);
  }
  return receipts;
}

async function post<T>(url: string, payload: unknown, accessToken?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`Expo push returned ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

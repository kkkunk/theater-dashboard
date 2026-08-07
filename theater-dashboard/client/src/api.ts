const API_BASE = import.meta.env.VITE_API_BASE || '';

type Envelope<T> = { data: T };
type ErrorEnvelope = { error?: { message?: string } };

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal });
  const body = await response.json() as Envelope<T> & ErrorEnvelope;
  if (!response.ok) throw new Error(body.error?.message || '数据加载失败，请稍后重试。');
  return body.data;
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  const body = await response.json() as Envelope<T> & ErrorEnvelope;
  if (!response.ok) throw new Error(body.error?.message || '请求失败，请稍后重试。');
  return body.data;
}

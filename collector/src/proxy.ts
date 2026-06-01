import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

/**
 * fetch-like function that respects HTTPS_PROXY / HTTP_PROXY env vars.
 * Uses Node.js built-in http/https modules (CONNECT tunnel).
 * Works on Node 14+ with zero external dependencies.
 */
export async function proxyFetch(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string; timeout?: number } = {}
): Promise<{ status: number; text(): Promise<string>; ok: boolean }> {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy;

  if (!proxyUrl) {
    // No proxy — use native fetch
    const res = await fetch(url, options);
    const text = await res.text();
    return { status: res.status, text: async () => text, ok: res.ok };
  }

  // Use proxy via CONNECT tunnel
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const proxy = new URL(proxyUrl);

    const connectReq = http.request({
      host: proxy.hostname,
      port: Number(proxy.port) || 8080,
      method: 'CONNECT',
      path: `${target.hostname}:${target.port || 443}`,
    });

    connectReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }

      const tlsOptions = {
        host: target.hostname,
        socket: socket,
        path: target.pathname + target.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        rejectUnauthorized: true,
      };

      const req = https.request(tlsOptions, (response) => {
        let data = '';
        response.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        response.on('end', () => {
          resolve({
            status: response.statusCode || 0,
            text: async () => data,
            ok: (response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300,
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(options.timeout || 15000, () => {
        req.destroy(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });

    connectReq.on('error', reject);
    connectReq.setTimeout(10000, () => {
      connectReq.destroy(new Error('Proxy connect timeout'));
    });
    connectReq.end();
  });
}

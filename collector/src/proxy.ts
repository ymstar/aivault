import { ProxyAgent, setGlobalDispatcher } from 'undici';

/**
 * Enable proxy support for Node.js native fetch (undici).
 * Reads HTTPS_PROXY / HTTP_PROXY / ALL_PROXY from environment.
 * Call this once at startup, before any fetch() calls.
 */
export function setupProxy() {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy;

  if (!proxyUrl) return;

  try {
    const agent = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(agent);
    console.log(`  Proxy: ${proxyUrl}`);
  } catch (err: any) {
    console.error(`  Warning: Could not set up proxy: ${err.message}`);
  }
}

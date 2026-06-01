/**
 * Enable proxy support for Node.js native fetch (undici).
 * Reads HTTPS_PROXY / HTTP_PROXY / ALL_PROXY from environment.
 * Uses undici bundled with Node.js 18+ (no extra install needed).
 */
export async function setupProxy() {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy;

  if (!proxyUrl) return;

  try {
    // @ts-ignore - undici is bundled with Node 18+ but lacks type declarations
    const { ProxyAgent, setGlobalDispatcher } = await import('undici');
    const agent = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(agent);
    console.log(`  Proxy: ${proxyUrl}`);
  } catch {
    console.log(`  Proxy env detected: ${proxyUrl} (undici ProxyAgent unavailable on this Node version)`);
  }
}

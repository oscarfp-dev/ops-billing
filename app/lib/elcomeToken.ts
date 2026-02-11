type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number; // segundos
  scope?: string;
};

type CachedToken = {
  accessToken: string;
  tokenType: string;
  expiresAtMs: number; // epoch ms
  scope?: string;
};

declare global {
  var __ELCOME_TOKEN_CACHE__: CachedToken | undefined;
  var __ELCOME_TOKEN_INFLIGHT__: Promise<CachedToken> | undefined;
}

const SKEW_MS = 30_000; // 30s antes de expirar, renueva para evitar carreras

function isValid(cache?: CachedToken) {
  if (!cache) return false;
  return Date.now() + SKEW_MS < cache.expiresAtMs;
}

async function fetchNewToken(): Promise<CachedToken> {
  const tokenUrl = process.env.ELCOME_TOKEN_URL!;
  const clientId = process.env.ELCOME_CLIENT_ID!;
  const clientSecret = process.env.ELCOME_CLIENT_SECRET!;
  const scope = process.env.ELCOME_SCOPE;

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  if (scope) body.set("scope", scope);

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token request failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as TokenResponse;

  const now = Date.now();
  return {
    accessToken: data.access_token,
    tokenType: data.token_type ?? "Bearer",
    expiresAtMs: now + data.expires_in * 1000,
    scope: data.scope,
  };
}

export async function getElcomeToken(): Promise<CachedToken> {
  // 1) si cache válido, úsalo
  if (isValid(globalThis.__ELCOME_TOKEN_CACHE__)) {
    return globalThis.__ELCOME_TOKEN_CACHE__!;
  }

  // 2) si ya hay un refresh en curso, espera ese (evita 20 requests simultáneas)
  if (globalThis.__ELCOME_TOKEN_INFLIGHT__) {
    return globalThis.__ELCOME_TOKEN_INFLIGHT__;
  }

  // 3) inicia refresh y guarda promesa "inflight"
  globalThis.__ELCOME_TOKEN_INFLIGHT__ = (async () => {
    const fresh = await fetchNewToken();
    globalThis.__ELCOME_TOKEN_CACHE__ = fresh;
    return fresh;
  })();

  try {
    return await globalThis.__ELCOME_TOKEN_INFLIGHT__;
  } finally {
    globalThis.__ELCOME_TOKEN_INFLIGHT__ = undefined;
  }
}

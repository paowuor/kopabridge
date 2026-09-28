const assertEnv = (name: string, value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `❌ CONFIGURATION ERROR: ${name} environment variable is missing or empty.`,
    );
  }

  return trimmed;
};

const ensurePort = (
  name: string,
  rawValue: string | undefined,
  fallback: string,
) => {
  const value = rawValue?.trim() || fallback;
  const port = parseInt(value, 10);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `❌ CONFIGURATION ERROR: ${name} must be a valid port number between 1 and 65535. Received: ${value}`,
    );
  }

  return port;
};

const assertEnum = (name: string, value: string, allowed: string[]) => {
  if (!allowed.includes(value)) {
    throw new Error(
      `❌ CONFIGURATION ERROR: ${name} must be one of ${allowed.join(', ')}. Received: ${value}`,
    );
  }

  return value;
};

const parseCorsOrigins = (raw: string | undefined) => {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

/**
 * Number of reverse-proxy hops to trust when resolving the client IP.
 *
 * The throttler and `req.ip` (captured onto refresh tokens for the login
 * audit trail) both key off the resolved client address. Behind nginx without
 * this, every external request looks like it comes from the proxy itself and
 * all per-IP rate limits collapse into a single shared bucket.
 *
 * Accepts a hop count ("1"), "true" (trust all — only safe when nothing but
 * trusted infrastructure can reach the port), or a falsy value to disable.
 * Set to 0 when the API port is published directly to untrusted clients, since
 * a direct client can then spoof X-Forwarded-For.
 */
const parseTrustProxy = (raw: string | undefined): number | boolean => {
  const value = raw?.trim().toLowerCase();

  if (!value || value === '0' || value === 'false' || value === 'no') {
    return false;
  }

  if (value === 'true' || value === 'yes' || value === 'all') {
    return true;
  }

  const hops = parseInt(value, 10);
  if (Number.isNaN(hops) || hops < 0) {
    throw new Error(
      `❌ CONFIGURATION ERROR: TRUST_PROXY must be a non-negative integer, "true", or "false". Received: ${raw}`,
    );
  }

  return hops;
};

export default () => {
  const encryptionKey = assertEnv(
    'TOKEN_ENCRYPTION_KEY',
    process.env.TOKEN_ENCRYPTION_KEY,
  );

  const hexRegex = /^[0-9a-fA-F]{64}$/;
  if (!hexRegex.test(encryptionKey)) {
    throw new Error(
      `❌ CONFIGURATION ERROR: TOKEN_ENCRYPTION_KEY must be exactly a 64-character hexadecimal string. Received length: ${encryptionKey.length}`,
    );
  }

  const databaseUrl = assertEnv('DATABASE_URL', process.env.DATABASE_URL);
  const jwtSecret = assertEnv('JWT_SECRET', process.env.JWT_SECRET);
  const nodeEnv = assertEnum(
    'NODE_ENV',
    process.env.NODE_ENV?.trim() || 'development',
    ['development', 'production', 'test'],
  );

  return {
    port: ensurePort('PORT', process.env.PORT, '3000'),

    database: {
      url: databaseUrl,
    },

    jwt: {
      secret: jwtSecret,
    },

    app: {
      env: nodeEnv,
      corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
      // Defaults to trusting the single nginx hop that fronts the API in both
      // docker-compose files. Override to 0 if the API port is ever published
      // straight to untrusted clients, which would make X-Forwarded-For spoofable.
      trustProxy: parseTrustProxy(process.env.TRUST_PROXY ?? '1'),
    },

    redis: {
      // Prefer a full Redis URL when provided. Fall back
      // to separate host/port env vars for local/dev/docker setups.
      url: process.env.REDIS_URL?.trim() || null,
      host: process.env.REDIS_HOST?.trim() || 'localhost',
      port: ensurePort('REDIS_PORT', process.env.REDIS_PORT, '6379'),
    },

    vault: {
      encryptionKey,
    },

    metrics: {
      // Optional static bearer token protecting the Prometheus /metrics
      // endpoint. When unset the endpoint rejects all requests (fail closed).
      token: process.env.METRICS_TOKEN?.trim() || null,
    },
  };
};

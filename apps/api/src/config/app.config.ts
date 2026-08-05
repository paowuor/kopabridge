const assertEnv = (name: string, value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`❌ CONFIGURATION ERROR: ${name} environment variable is missing or empty.`);
  }

  return trimmed;
};

const ensurePort = (name: string, rawValue: string | undefined, fallback: string) => {
  const value = rawValue?.trim() || fallback;
  const port = parseInt(value, 10);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`❌ CONFIGURATION ERROR: ${name} must be a valid port number between 1 and 65535. Received: ${value}`);
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

export default () => {
  const encryptionKey = assertEnv('TOKEN_ENCRYPTION_KEY', process.env.TOKEN_ENCRYPTION_KEY);

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
    },

    redis: {
      host: process.env.REDIS_HOST?.trim() || 'localhost',
      port: ensurePort('REDIS_PORT', process.env.REDIS_PORT, '6379'),
    },

    vault: {
      encryptionKey,
    },
  };
};

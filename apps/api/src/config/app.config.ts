export default () => {
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;

  // 1. Enforce presence
  if (!encryptionKey) {
    throw new Error(
      '❌ CONFIGURATION ERROR: TOKEN_ENCRYPTION_KEY environment variable is missing!',
    );
  }

  // 2. Enforce structural properties (Must be a 64-character hex string)
  const hexRegex = /^[0-9a-fA-F]{64}$/;
  if (!hexRegex.test(encryptionKey)) {
    throw new Error(
      `❌ CONFIGURATION ERROR: TOKEN_ENCRYPTION_KEY must be exactly a 64-character hexadecimal string. Received length: ${encryptionKey.length}`,
    );
  }

  return {
    port: parseInt(process.env.PORT || '3000', 10),

    database: {
      url: process.env.DATABASE_URL,
    },

    jwt: {
      secret: process.env.JWT_SECRET,
    },

    app: {
      env: process.env.NODE_ENV,
    },
    
    // Explicitly expose it here if you want to pull it structured elsewhere
    vault: {
      encryptionKey,
    },
  };
};
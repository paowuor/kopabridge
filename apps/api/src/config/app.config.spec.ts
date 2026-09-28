import appConfig from './app.config';

describe('appConfig', () => {
  const validEnv = {
    TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/kopabridge',
    JWT_SECRET: 'a-long-random-secret',
  };

  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    Object.assign(process.env, validEnv);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('trustProxy', () => {
    it('defaults to trusting the single nginx hop', () => {
      delete process.env.TRUST_PROXY;

      expect(appConfig().app.trustProxy).toBe(1);
    });

    it('accepts an explicit hop count', () => {
      process.env.TRUST_PROXY = '2';

      expect(appConfig().app.trustProxy).toBe(2);
    });

    it('disables proxy trust for a directly exposed API port', () => {
      process.env.TRUST_PROXY = '0';

      expect(appConfig().app.trustProxy).toBe(false);
    });

    it.each(['false', 'no'])('treats %s as disabled', (value) => {
      process.env.TRUST_PROXY = value;

      expect(appConfig().app.trustProxy).toBe(false);
    });

    it.each(['true', 'yes', 'all'])('treats %s as trust-all', (value) => {
      process.env.TRUST_PROXY = value;

      expect(appConfig().app.trustProxy).toBe(true);
    });

    it('rejects a non-numeric hop count', () => {
      process.env.TRUST_PROXY = 'nginx';

      expect(() => appConfig()).toThrow(/TRUST_PROXY/);
    });

    it('rejects a negative hop count', () => {
      process.env.TRUST_PROXY = '-1';

      expect(() => appConfig()).toThrow(/TRUST_PROXY/);
    });
  });

  it('still fails fast on a weak encryption key', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'too-short';

    expect(() => appConfig()).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });
});

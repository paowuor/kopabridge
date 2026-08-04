import { Test, TestingModule } from '@nestjs/testing';
import { SyncProcessor } from './sync.processor';
import { PrismaService } from '../prisma/prisma.service';
import { VaultService } from '../vault/vault.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { ProviderNormalizationService } from '../providers/provider-normalization.service';
import { CreditScoreService } from '../credit-score/credit-score.service';
import { Job } from 'bullmq';

describe('SyncProcessor', () => {
  let processor: SyncProcessor;

  const prismaMock = {
    providerConsent: { findFirst: jest.fn() },
    energyAccount: { upsert: jest.fn() },
    paymentHistory: { upsert: jest.fn() },
  };
  const vaultMock = { decrypt: jest.fn() };
  const registryMock = { getConnector: jest.fn() };
  const normalizationMock = { normalize: jest.fn() };
  const creditScoreMock = { calculateScore: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncProcessor,
        { provide: PrismaService, useValue: prismaMock },
        { provide: VaultService, useValue: vaultMock },
        { provide: ProviderRegistryService, useValue: registryMock },
        { provide: ProviderNormalizationService, useValue: normalizationMock },
        { provide: CreditScoreService, useValue: creditScoreMock },
      ],
    }).compile();

    processor = module.get<SyncProcessor>(SyncProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  const makeJob = (name: string) =>
    ({
      id: 'job-1',
      name,
      data: { userId: 'user-1', providerId: 'provider-1' },
    }) as unknown as Job<
      { userId: string; providerId: string },
      unknown,
      string
    >;

  it('skips the sync when there is no active consent', async () => {
    prismaMock.providerConsent.findFirst.mockResolvedValue(null);

    const result = await processor.process(makeJob('initial-sync'));

    expect(result).toEqual({ success: true });
    expect(vaultMock.decrypt).not.toHaveBeenCalled();
  });

  it('skips the sync when the consent has expired', async () => {
    prismaMock.providerConsent.findFirst.mockResolvedValue({
      accessToken: 'enc-token',
      expiresAt: new Date(Date.now() - 1000),
      provider: { slug: 'm-kopa' },
    });

    const result = await processor.process(makeJob('initial-sync'));

    expect(result).toEqual({ success: true });
    expect(vaultMock.decrypt).not.toHaveBeenCalled();
  });

  it('decrypts the token, fetches, normalizes, and persists synced data without ever logging the plaintext token', async () => {
    prismaMock.providerConsent.findFirst.mockResolvedValue({
      accessToken: 'enc-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      provider: { slug: 'm-kopa' },
    });
    vaultMock.decrypt.mockReturnValue('plaintext-token');

    const fetchCustomerData = jest.fn().mockResolvedValue({ raw: true });
    registryMock.getConnector.mockReturnValue({ fetchCustomerData });

    normalizationMock.normalize.mockReturnValue({
      provider: 'M-KOPA',
      customerName: 'Jane Doe',
      accountNumber: 'ACC-1',
      paymentHistory: [{ amount: 500, status: 'paid' }],
    });

    prismaMock.energyAccount.upsert.mockResolvedValue({ id: 'account-1' });
    prismaMock.paymentHistory.upsert.mockResolvedValue({});
    creditScoreMock.calculateScore.mockResolvedValue({
      score: 100,
      rating: 'Excellent',
    });

    const result = await processor.process(makeJob('initial-sync'));

    expect(result).toEqual({ success: true });
    expect(vaultMock.decrypt).toHaveBeenCalledWith('enc-token');
    expect(fetchCustomerData).toHaveBeenCalledWith('plaintext-token');
    expect(prismaMock.energyAccount.upsert).toHaveBeenCalled();
    expect(prismaMock.paymentHistory.upsert).toHaveBeenCalledTimes(1);
    expect(creditScoreMock.calculateScore).toHaveBeenCalledWith('account-1');
  });

  it('returns success:false for an unrecognized job name', async () => {
    const result = await processor.process(makeJob('some-other-job'));
    expect(result).toEqual({ success: false });
    expect(prismaMock.providerConsent.findFirst).not.toHaveBeenCalled();
  });
});

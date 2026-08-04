import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { OAuthStateService } from './oauth-state.service';

describe('OAuthStateService', () => {
  let service: OAuthStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '10m' },
        }),
      ],
      providers: [OAuthStateService],
    }).compile();

    service = module.get<OAuthStateService>(OAuthStateService);
  });

  it('round-trips a signed state back to its original payload', () => {
    const state = service.sign({
      userId: 'user-1',
      providerId: 'provider-1',
      slug: 'm-kopa',
    });

    const decoded = service.verify(state, 'm-kopa');

    expect(decoded).toEqual({
      userId: 'user-1',
      providerId: 'provider-1',
      slug: 'm-kopa',
    });
  });

  it('rejects a state signed for a different provider slug', () => {
    const state = service.sign({
      userId: 'user-1',
      providerId: 'provider-1',
      slug: 'm-kopa',
    });

    expect(() => service.verify(state, 'some-other-provider')).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a garbage/tampered state string', () => {
    expect(() => service.verify('not-a-real-token', 'm-kopa')).toThrow(
      UnauthorizedException,
    );
  });
});

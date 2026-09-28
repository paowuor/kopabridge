import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { Role } from '../auth/roles/roles.enum';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  // Route-handler metadata is attached to the function object itself, so
  // read it via the property descriptor rather than calling the method.
  const handler = (name: keyof UsersController): unknown =>
    Object.getOwnPropertyDescriptor(UsersController.prototype, name)?.value;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            createUser: jest.fn(),
            getUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('no longer exposes anonymous user creation', () => {
    // POST /users used to be @Public(), giving attackers an unthrottled
    // duplicate of the rate-limited POST /auth/register.
    expect(Reflect.getMetadata(ROLES_KEY, handler('create'))).toEqual([
      Role.ADMIN,
    ]);
  });

  it.each(['getProfile', 'create', 'findAll', 'getAdminData'] as const)(
    '%s is not marked @Public()',
    (name) => {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler(name))).toBeUndefined();
    },
  );

  it('restricts the admin-only listing endpoints to ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, handler('findAll'))).toEqual([
      Role.ADMIN,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handler('getAdminData'))).toEqual([
      Role.ADMIN,
    ]);
  });
});

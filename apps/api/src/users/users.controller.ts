import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/roles.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Users') // Groups all these endpoints under 'Users' in Swagger UI
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Protected by the global JwtAuthGuard (default) — no @Public() here.
  @ApiBearerAuth() // Adds padlock icon in Swagger UI
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user profile.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid JWT token.',
  })
  getProfile(@CurrentUser() user: AuthenticatedUser | undefined) {
    return user;
  }

  // Admin-only internal user creation. This handler used to be @Public(),
  // which made it an unthrottled duplicate of POST /auth/register (which is
  // itself rate limited to 5/min) and let anyone farm accounts anonymously.
  // Public self-service signup belongs to /auth/register only.
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Validation failed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. User does not have ADMIN privileges.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict. Email already in use.',
  })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  // Admin-only: this previously returned every user (including password
  // hashes) to any logged-in user. Now requires the ADMIN role, and the
  // service layer strips the password field from the response.
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiResponse({
    status: 200,
    description:
      'Successfully retrieved users list along with request context.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. User does not have ADMIN privileges.',
  })
  async findAll(@CurrentUser() user: AuthenticatedUser | undefined) {
    return {
      requestedBy: user,
      data: await this.usersService.getUsers(),
    };
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin')
  @ApiOperation({ summary: 'Get administrative dashboard data (Admin Only)' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved administrative data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. User does not have ADMIN privileges.',
  })
  getAdminData() {
    return {
      message: 'Only admins can see this',
    };
  }
}

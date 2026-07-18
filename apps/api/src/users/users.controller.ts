import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

  @ApiBearerAuth() // Adds padlock icon in Swagger UI
  @UseGuards(JwtAuthGuard)
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

  @Post()
  @ApiOperation({ summary: 'Create a new user (Public endpoint)' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Validation failed.',
  })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({
    status: 200,
    description:
      'Successfully retrieved users list along with request context.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser | undefined) {
    return {
      requestedBy: user,
      data: this.usersService.getUsers(),
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
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

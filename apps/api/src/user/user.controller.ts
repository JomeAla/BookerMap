import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateSkillsDto } from './dto/update-skills.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'List all users', description: 'Returns all users for the current tenant' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll(@CurrentUser() user: any) {
    return this.userService.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.findById(user.tenantId, id);
  }

  @Post('invite')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Invite a user', description: 'Create a new user invitation (Admin/Owner only)' })
  @ApiResponse({ status: 201, description: 'User invited successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  invite(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.userService.create(user.tenantId, dto);
  }

  @Post('platform')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create platform user', description: 'Create a user in any tenant (Platform Admin only)' })
  @ApiResponse({ status: 201, description: 'User created' })
  createPlatformUser(@Body() dto: CreatePlatformUserDto) {
    return this.userService.createPlatformUser(dto as any);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update user', description: 'Update user information (Admin/Owner only)' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete user', description: 'Remove a user from the tenant (Admin/Owner only)' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.remove(user.tenantId, id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get user availability', description: 'Get availability schedule for a user' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Availability schedule' })
  getAvailability(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.getAvailability(user.tenantId, id);
  }

  @Put(':id/availability')
  @ApiOperation({ summary: 'Update user availability', description: 'Update availability schedule for a user' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Availability updated' })
  updateAvailability(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.userService.updateAvailability(user.tenantId, id, dto);
  }

  @Get(':id/skills')
  @ApiOperation({ summary: 'Get user skills', description: 'Get skills for a user/technician' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User skills' })
  getSkills(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.getSkills(user.tenantId, id);
  }

  @Put(':id/skills')
  @ApiOperation({ summary: 'Update user skills', description: 'Update skills for a user/technician' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Skills updated' })
  updateSkills(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateSkillsDto,
  ) {
    return this.userService.updateSkills(user.tenantId, id, dto);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.userService.findAll(user.tenantId);
  }

  @Get(':id')
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.findById(user.tenantId, id);
  }

  @Post('invite')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  invite(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.userService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.userService.remove(user.tenantId, id);
  }
}

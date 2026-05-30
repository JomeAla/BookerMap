import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateTagsDto } from './dto/update-tags.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
  ) {
    return this.customerService.findAll(user.tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      tag,
    });
  }

  @Get('tags')
  findAllTags(@CurrentUser() user: any) {
    return this.customerService.findAllTags(user.tenantId);
  }

  @Get('export')
  async exportCsv(@CurrentUser() user: any, @Res() res: Response) {
    const csv = await this.customerService.exportCsv(user.tenantId);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="customers.csv"',
    });
    res.end(csv);
  }

  @Get(':id')
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customerService.findById(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateCustomerDto) {
    return this.customerService.create(user.tenantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(user.tenantId, id, dto);
  }

  @Patch(':id/tags')
  updateTags(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTagsDto,
  ) {
    return this.customerService.updateTags(user.tenantId, id, dto.tags);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customerService.remove(user.tenantId, id);
  }

  @Post(':id/addresses')
  addAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.customerService.addAddress(user.tenantId, id, dto);
  }

  @Post('import')
  importCsv(@CurrentUser() user: any, @Body('csv') csv: string) {
    return this.customerService.importCsv(user.tenantId, csv);
  }
}

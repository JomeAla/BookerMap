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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateTagsDto } from './dto/update-tags.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: 'List all customers', description: 'Returns paginated list of customers' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'tag', required: false, type: String, description: 'Filter by tag' })
  @ApiResponse({ status: 200, description: 'List of customers' })
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
  @ApiOperation({ summary: 'Get all customer tags', description: 'Returns all unique customer tags' })
  @ApiResponse({ status: 200, description: 'List of tags' })
  findAllTags(@CurrentUser() user: any) {
    return this.customerService.findAllTags(user.tenantId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export customers as CSV', description: 'Download customers list as CSV file' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportCsv(@CurrentUser() user: any, @Res() res: Response) {
    const csv = await this.customerService.exportCsv(user.tenantId);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="customers.csv"',
    });
    res.end(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customerService.findById(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@CurrentUser() user: any, @Body() dto: CreateCustomerDto) {
    return this.customerService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'id', type: String, description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(user.tenantId, id, dto);
  }

  @Patch(':id/tags')
  @ApiOperation({ summary: 'Update customer tags', description: 'Update tags for a customer' })
  @ApiParam({ name: 'id', type: String, description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Tags updated' })
  updateTags(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTagsDto,
  ) {
    return this.customerService.updateTags(user.tenantId, id, dto.tags);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiParam({ name: 'id', type: String, description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer deleted' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customerService.remove(user.tenantId, id);
  }

  @Post(':id/addresses')
  @ApiOperation({ summary: 'Add address to customer', description: 'Add a new address for a customer' })
  @ApiParam({ name: 'id', type: String, description: 'Customer ID' })
  @ApiResponse({ status: 201, description: 'Address added' })
  addAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.customerService.addAddress(user.tenantId, id, dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import customers from CSV', description: 'Import customers from CSV data' })
  @ApiResponse({ status: 201, description: 'Customers imported' })
  importCsv(@CurrentUser() user: any, @Body('csv') csv: string) {
    return this.customerService.importCsv(user.tenantId, csv);
  }
}

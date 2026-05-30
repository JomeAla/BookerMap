import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file', description: 'Upload a file and associate it with a booking' })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  upload(@TenantId() tenantId: string, @Body() dto: UploadFileDto) {
    return this.filesService.upload(tenantId, dto);
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Get booking files', description: 'Returns all files associated with a booking' })
  @ApiParam({ name: 'bookingId', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'List of files' })
  getBookingFiles(@TenantId() tenantId: string, @Param('bookingId') bookingId: string) {
    return this.filesService.getBookingFiles(tenantId, bookingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiParam({ name: 'id', type: String, description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File found' })
  @ApiResponse({ status: 404, description: 'File not found' })
  getFile(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.filesService.getFile(id, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'id', type: String, description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  deleteFile(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.filesService.deleteFile(id, tenantId);
  }
}

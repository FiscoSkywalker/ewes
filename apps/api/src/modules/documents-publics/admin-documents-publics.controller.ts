import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { MAX_DOCUMENT_BYTES } from './document-signature.js';
import type { UploadedDocument } from './document-storage.service.js';
import { DocumentsPublicsService } from './documents-publics.service.js';
import { CreatePublicDocumentDto } from './dto/create-public-document.dto.js';
import { UpdatePublicDocumentDto } from './dto/update-public-document.dto.js';
import { ListAdminPublicDocumentsDto } from './dto/list-public-documents.dto.js';

const uploadInterceptor = () =>
  FileInterceptor('file', {
    limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
  });

function requireFile(file: UploadedDocument | undefined): UploadedDocument {
  if (!file) {
    throw new BadRequestException({
      code: 'DOCUMENT_FILE_REQUIRED',
      message: 'Aucun fichier reçu (champ « file », PDF).',
      details: ['file'],
    });
  }
  return file;
}

@ApiTags('admin/documents-publics')
@ApiBearerAuth()
@Controller('admin/documents-publics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR, Role.GESTIONNAIRE)
export class AdminDocumentsPublicsController {
  constructor(private readonly documentsService: DocumentsPublicsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les documents publics (tous statuts)' })
  list(@Query() query: ListAdminPublicDocumentsDto) {
    return this.documentsService.listAdmin(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un document (brouillon) avec son PDF, 20 Mo max' })
  @ApiConsumes('multipart/form-data')
  // blueprint/10_Security.md §3 : taille/type limités, fréquence limitée.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(uploadInterceptor())
  create(
    @Body() dto: CreatePublicDocumentDto,
    @UploadedFile() file: UploadedDocument | undefined,
  ) {
    return this.documentsService.create(dto, requireFile(file));
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePublicDocumentDto,
  ) {
    return this.documentsService.update(id, dto);
  }

  @Put(':id/file')
  @ApiOperation({ summary: 'Remplacer le PDF d’un document' })
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(uploadInterceptor())
  replaceFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedDocument | undefined,
  ) {
    return this.documentsService.replaceFile(id, requireFile(file));
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publier explicitement un document' })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.publish(id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dépublier (retour en brouillon)' })
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.unpublish(id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archiver (dépublié, conservé pour l’historique)' })
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.archive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer (suppression logique)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.documentsService.remove(id);
  }
}

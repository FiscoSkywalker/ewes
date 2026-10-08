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
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DocumentLifecycleStatus, Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { singleFileUploadOptions } from '../../common/http/upload-options.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import {
  ListPrivateDocumentsDto,
  UpdatePrivateDocumentDto,
  UploadPrivateDocumentDto,
} from './dto/private-document.dto.js';
import { PrivateDocumentsService } from './private-documents.service.js';
import { MAX_PRIVATE_FILE_BYTES } from './private-file-signature.js';
import type { UploadedPrivateFile } from './private-storage.service.js';

/**
 * Tout utilisateur authentifié peut appeler ces routes ; le droit réel
 * (périmètre nominatif, rôle, confidentialité) est vérifié côté serveur, à
 * chaque requête, dans le service (blueprint/10_Security.md §2).
 */
@ApiTags('documents-prives/files')
@ApiBearerAuth()
@Controller('documents-prives/files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrivateFilesController {
  constructor(private readonly documents: PrivateDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Documents auxquels vous avez droit' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPrivateDocumentsDto,
  ) {
    return this.documents.list(user, query);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.get(user, id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Téléverser un document (25 Mo max ; PDF, images, DOCX, XLSX, PPTX)',
  })
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', singleFileUploadOptions(MAX_PRIVATE_FILE_BYTES)),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadPrivateDocumentDto,
    @UploadedFile() file: UploadedPrivateFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'DOCUMENT_FILE_REQUIRED',
        message: 'Aucun fichier reçu (champ « file »).',
        details: ['file'],
      });
    }
    return this.documents.upload(user, dto, file);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrivateDocumentDto,
  ) {
    return this.documents.update(user, id, dto);
  }

  @Put(':id/file')
  @ApiOperation({
    summary:
      'Remplacer le fichier d’un document (même document, mêmes droits ; l’ancien fichier est conservé hors d’atteinte)',
  })
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', singleFileUploadOptions(MAX_PRIVATE_FILE_BYTES)),
  )
  replaceFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedPrivateFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'DOCUMENT_FILE_REQUIRED',
        message: 'Aucun fichier reçu (champ « file »).',
        details: ['file'],
      });
    }
    return this.documents.replaceFile(user, id, file);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archiver (reste consultable selon droit)' })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.setStatus(user, id, DocumentLifecycleStatus.ARCHIVED);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.setStatus(user, id, DocumentLifecycleStatus.ACTIVE);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATEUR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer (Administrateur, suppression logique tracée)',
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.documents.remove(user, id);
  }

  @Get(':id/download')
  @ApiOperation({
    summary:
      'Télécharger : droit vérifié à chaque requête, téléchargement audité',
  })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.documents.prepareDownload(user, id);
    // Contenu privé : jamais mis en cache ni interprété par le navigateur.
    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      disposition: file.disposition,
    });
  }
}

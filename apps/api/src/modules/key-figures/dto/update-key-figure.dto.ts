import { PartialType } from '@nestjs/swagger';
import { CreateKeyFigureDto } from './create-key-figure.dto.js';

export class UpdateKeyFigureDto extends PartialType(CreateKeyFigureDto) {}

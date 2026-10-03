import { PartialType } from '@nestjs/swagger';
import { CreateExpertDto } from './create-expert.dto.js';

export class UpdateExpertDto extends PartialType(CreateExpertDto) {}

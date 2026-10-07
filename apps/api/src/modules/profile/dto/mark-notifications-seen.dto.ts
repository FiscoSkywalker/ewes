import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

/**
 * « Tout lu jusqu'à » : l'horodatage du dernier élément que la personne a vu
 * dans la cloche. Absent, c'est l'instant présent du serveur. Un horodatage
 * futur est ramené à maintenant et le repère ne recule jamais (voir le service).
 */
export class MarkNotificationsSeenDto {
  @ApiPropertyOptional({ example: '2026-10-07T09:30:00.000Z' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Date et heure ISO 8601 attendues.' })
  seenAt?: string;
}

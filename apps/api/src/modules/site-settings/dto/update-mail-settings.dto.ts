import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, MaxLength } from 'class-validator';

/** Tous les champs sont facultatifs : un champ absent reste inchangé. */
export class UpdateMailSettingsDto {
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Destinataire des messages de contact ; vide, la variable d’environnement CONTACT_NOTIFICATION_EMAIL s’applique.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  )
  @IsEmail({}, { message: 'Saisissez une adresse e-mail valide.' })
  @MaxLength(254)
  contactRecipientEmail?: string | null;

  @ApiPropertyOptional({
    description:
      'Envoyer un accusé de réception à l’expéditeur du formulaire de contact.',
  })
  @IsOptional()
  @IsBoolean()
  contactAutoReply?: boolean;
}

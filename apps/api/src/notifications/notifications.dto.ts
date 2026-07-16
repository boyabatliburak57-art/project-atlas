import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationListQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  limit?: number;
  @ApiPropertyOptional() cursor?: string;
  @ApiPropertyOptional({
    enum: [
      'alertTriggered',
      'alertDeliveryFailed',
      'dataStaleWarning',
      'scanCompleted',
      'systemAnnouncement',
      'security',
    ],
  })
  type?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] }) unread?: string;
  @ApiPropertyOptional({ format: 'date-time' }) from?: string;
  @ApiPropertyOptional({ format: 'date-time' }) to?: string;
}

export class NotificationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: object;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) readAt!:
    | string
    | null;
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) expiresAt!:
    | string
    | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class NotificationResponseDto {
  @ApiProperty({ type: NotificationDto }) data!: NotificationDto;
  @ApiProperty({ type: 'object', additionalProperties: true }) meta!: object;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationDto] }) data!: NotificationDto[];
  @ApiProperty({ type: 'object', additionalProperties: true }) meta!: object;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3 }) unreadCount!: number;
}

export class NotificationPreferencesDto {
  @ApiProperty({ example: 'Europe/Istanbul' }) timezone!: string;
  @ApiProperty({ example: 'tr-TR' }) locale!: string;
  @ApiProperty() emailAlertsEnabled!: boolean;
  @ApiProperty() dailyDigestEnabled!: boolean;
  @ApiProperty() scanCompletionEnabled!: boolean;
  @ApiProperty() quietHoursEnabled!: boolean;
  @ApiPropertyOptional({ minimum: 0, maximum: 1439, nullable: true })
  quietHoursStartMinute!: number | null;
  @ApiPropertyOptional({ minimum: 0, maximum: 1439, nullable: true })
  quietHoursEndMinute!: number | null;
  @ApiProperty({ minimum: 0, maximum: 1440 }) throttleMinutes!: number;
}

export class UpdateNotificationPreferencesDto extends NotificationPreferencesDto {}

export class NotificationPreferencesResponseDto {
  @ApiProperty({ type: NotificationPreferencesDto })
  data!: NotificationPreferencesDto;
  @ApiProperty({ type: 'object', additionalProperties: true }) meta!: object;
}

import { IsString, Length, Matches } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @Length(3, 32, { message: 'room name must be between 3 and 32 characters' })
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'room name can contain only letters, numbers and hyphens',
  })
  name!: string;
}

import { IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(2, 24, { message: 'username must be between 2 and 24 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username can contain only letters, numbers and underscores',
  })
  username!: string;
}

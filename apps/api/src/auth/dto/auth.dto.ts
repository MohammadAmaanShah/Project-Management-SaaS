import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
  @IsString() @MinLength(1) @MaxLength(80) name: string;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

export class RefreshDto {
  @IsString() refreshToken: string;
}

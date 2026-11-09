import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { type AuthUser, CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public() @Post('register')
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Public() @HttpCode(200) @Post('login')
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }

  @Public() @HttpCode(200) @Post('refresh')
  refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }

  @Public() @HttpCode(200) @Post('logout')
  logout(@Body() dto: RefreshDto) { return this.auth.logout(dto.refreshToken); }

  @Get('me')
  me(@CurrentUser() user: AuthUser) { return this.auth.me(user.id); }
}

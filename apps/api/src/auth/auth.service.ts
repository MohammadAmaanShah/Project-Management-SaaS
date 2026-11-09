import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';


const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) { }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        passwordHash: await argon2.hash(dto.password),
      },
    });
    return this.issueTokens(user.id, user.email, this.publicUser(user));
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    const ok = user && (await argon2.verify(user.passwordHash, dto.password));
    if (!user || !ok) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user.id, user.email, this.publicUser(user));
  }

  async refresh(refreshToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!record || record.revoked || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revoked: true },
    });
    return this.issueTokens(
      record.user.id,
      record.user.email,
      this.publicUser(record.user),
    );
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken) },
      data: { revoked: true },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  private publicUser(u: { id: string; email: string; name: string }) {
    return { id: u.id, email: u.email, name: u.name };
  }

  private async issueTokens(userId: string, email: string, user: object) {
    const accessToken = await this.jwt.signAsync({ sub: userId, email });
    const refreshToken = randomBytes(48).toString('hex');
    const days = Number(this.config.get('REFRESH_TTL_DAYS') ?? 7);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + days * 86_400_000),
      },
    });
    return { user, accessToken, refreshToken };
  }
}

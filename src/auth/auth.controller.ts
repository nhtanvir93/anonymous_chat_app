import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const { sessionToken, user } = await this.authService.createUser(dto);

    return {
      success: true,
      data: {
        sessionToken,
        user,
      },
    };
  }
}

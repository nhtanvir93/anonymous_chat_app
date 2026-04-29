import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/decorators/public.decorator';

@Controller('')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
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

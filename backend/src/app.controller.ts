import { Controller, Get, UseGuards } from '@nestjs/common';
import { AiService } from './ai/ai.service';
import { CurrentUser, TideAuthGuard, type TideUser } from './auth/tide-auth.guard';

@Controller()
export class AppController {
  constructor(private readonly ai: AiService) {}

  @Get('health')
  health() {
    return { ok: true, model: this.ai.model };
  }

  @Get('me')
  @UseGuards(TideAuthGuard)
  me(@CurrentUser() user: TideUser) {
    return user;
  }
}

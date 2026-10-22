import { Module } from '@nestjs/common';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';
import { AppController } from './app.controller';
import { DbService } from './db/db.service';
import { DocsController } from './docs/docs.controller';
import { OperatorController } from './operator/operator.controller';

@Module({
  controllers: [AppController, DocsController, AiController, OperatorController],
  providers: [DbService, AiService],
})
export class AppModule {}

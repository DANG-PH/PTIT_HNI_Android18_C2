import { Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { RequireRoles, TideAuthGuard } from '../auth/tide-auth.guard';
import { AiService } from '../ai/ai.service';
import { DbService } from '../db/db.service';

/**
 * The platform operator's view. It deliberately exposes the whole store: the point is that
 * full database access still yields only ciphertext, and the operator's own Tide session
 * cannot decrypt another person's documents.
 */
@Controller('operator')
@UseGuards(TideAuthGuard)
@RequireRoles('ntk-operator')
export class OperatorController {
  constructor(
    private readonly db: DbService,
    private readonly ai: AiService,
  ) {}

  @Get('store')
  store() {
    const rows = this.db.allDocs();
    return {
      totals: { documents: rows.length, owners: new Set(rows.map((r) => r.owner)).size },
      rows: rows.map((r) => ({
        id: r.id,
        owner: r.owner,
        category: r.category,
        titleCt: r.title_ct,
        bodyCt: r.body_ct,
        bodyBytes: r.body_bytes,
        createdAt: r.created_at,
      })),
    };
  }

  @Get('store/:id')
  one(@Param('id') id: string) {
    const r = this.db.getDoc(id);
    if (!r) throw new NotFoundException();
    return { id: r.id, owner: r.owner, category: r.category, titleCt: r.title_ct, bodyCt: r.body_ct };
  }

  /** A server-side AI agent with full DB access, asked to extract personal data. */
  @Post('rogue-agent')
  async rogue() {
    const rows = this.db.allDocs(6);
    const output = rows.length ? await this.ai.rogueAgent(rows) : 'The store is empty.';
    return { recordsGiven: rows.length, model: this.ai.model, output };
  }
}

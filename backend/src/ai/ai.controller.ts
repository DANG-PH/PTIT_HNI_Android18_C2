import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CurrentUser, RequireRoles, TideAuthGuard, type TideUser } from '../auth/tide-auth.guard';
import { DbService, type ReceiptKind } from '../db/db.service';
import { AiService, type DisclosedDoc, type IndexEntry } from './ai.service';

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s)\]]+/gi;

interface PlanBody {
  question?: string;
  index?: IndexEntry[];
  hijacked?: boolean;
}

interface AnswerBody extends PlanBody {
  questionCt?: string;
  approved?: DisclosedDoc[];
}

interface DenialBody {
  docIds?: string[];
  note?: string;
}

function requireQuestion(q: unknown): string {
  if (typeof q !== 'string' || !q.trim() || q.length > 2000) {
    throw new BadRequestException('question is required (max 2000 chars)');
  }
  return q.trim();
}

/**
 * The AI never reads the store. It only sees what the owner's browser decrypted and chose to
 * send for this request, and every disclosure is written to the owner's receipt ledger.
 */
@Controller()
@UseGuards(TideAuthGuard)
@RequireRoles('_tide_vault.selfdecrypt')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly db: DbService,
  ) {}

  private ownedIndex(user: TideUser, index: unknown): IndexEntry[] {
    if (!Array.isArray(index)) throw new BadRequestException('index must be an array');
    const owned = this.db.ownedIds(
      user.sub,
      index.map((e: IndexEntry) => e?.id),
    );
    return (index as IndexEntry[])
      .filter((e) => owned.has(e.id))
      .map((e) => ({ id: e.id, title: String(e.title).slice(0, 200), category: String(e.category) }));
  }

  private receipt(
    user: TideUser,
    kind: ReceiptKind,
    docIds: string[],
    extra: Partial<{ questionCt: string; note: string; model: string }> = {},
  ) {
    this.db.insertReceipt({
      id: randomUUID(),
      owner: user.sub,
      kind,
      doc_ids: JSON.stringify(docIds),
      question_ct: extra.questionCt ?? null,
      model: kind === 'denied' ? null : (extra.model ?? this.ai.model),
      note: extra.note ?? null,
      created_at: new Date().toISOString(),
    });
  }

  @Post('ai/plan')
  async plan(@CurrentUser() user: TideUser, @Body() body: PlanBody) {
    const question = requireQuestion(body.question);
    const index = this.ownedIndex(user, body.index);
    const result = await this.ai.plan(question, index, !!body.hijacked);
    const known = new Set(index.map((e) => e.id));
    this.receipt(user, 'index', index.map((e) => e.id), { note: 'titles only', model: result.model });
    return { ...result, needed: (result.needed ?? []).filter((r) => known.has(r.id)) };
  }

  @Post('ai/answer')
  async answer(@CurrentUser() user: TideUser, @Body() body: AnswerBody) {
    const question = requireQuestion(body.question);
    const index = this.ownedIndex(user, body.index);
    if (!Array.isArray(body.approved) || !body.approved.length) {
      throw new BadRequestException('approved must list the documents the owner released');
    }
    const owned = this.db.ownedIds(
      user.sub,
      body.approved.map((d) => d?.id),
    );
    const approved = body.approved
      .filter((d) => owned.has(d.id))
      .map((d) => ({
        id: d.id,
        title: String(d.title).slice(0, 200),
        category: String(d.category),
        content: String(d.content).slice(0, 60_000),
      }));
    if (approved.length !== body.approved.length) {
      throw new BadRequestException('approved contains documents you do not own');
    }

    const result = await this.ai.answer(question, approved, index, !!body.hijacked);
    this.receipt(
      user,
      'disclosure',
      approved.map((d) => d.id),
      {
        questionCt: typeof body.questionCt === 'string' ? body.questionCt : undefined,
        model: result.model,
      },
    );

    // Links and images are an exfiltration channel: strip them before anything is rendered.
    const blockedLinks = result.answer?.match(URL_RE) ?? [];
    const seen = new Set(approved.map((d) => d.id));
    const known = new Set(index.map((e) => e.id));
    return {
      ...result,
      answer: (result.answer ?? '').replace(URL_RE, '[link removed]'),
      followUps: (result.followUps ?? []).filter((r) => known.has(r.id) && !seen.has(r.id)),
      blockedLinks,
    };
  }

  @Post('receipts/denial')
  denial(@CurrentUser() user: TideUser, @Body() body: DenialBody) {
    const ids = Array.isArray(body.docIds) ? body.docIds.map(String).slice(0, 50) : [];
    this.receipt(user, 'denied', ids, { note: body.note ? String(body.note).slice(0, 300) : undefined });
    return { ok: true };
  }

  @Get('receipts')
  receipts(@CurrentUser() user: TideUser) {
    return this.db.listReceipts(user.sub).map((r) => ({
      id: r.id,
      kind: r.kind,
      docIds: JSON.parse(r.doc_ids) as string[],
      questionCt: r.question_ct,
      model: r.model,
      note: r.note,
      createdAt: r.created_at,
    }));
  }
}

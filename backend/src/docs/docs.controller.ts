import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CurrentUser, RequireRoles, TideAuthGuard, type TideUser } from '../auth/tide-auth.guard';
import { CATEGORIES, DbService, type Category } from '../db/db.service';

const MAX_CIPHERTEXT = 2_000_000;

interface CreateDocBody {
  category?: string;
  titleCt?: string;
  bodyCt?: string;
  bodyBytes?: number;
}

/** Holds Tide ciphertext only. Encryption and decryption happen in the owner's browser session. */
@Controller('docs')
@UseGuards(TideAuthGuard)
@RequireRoles('_tide_vault.selfencrypt')
export class DocsController {
  constructor(private readonly db: DbService) {}

  @Get()
  list(@CurrentUser() user: TideUser) {
    return this.db.listDocs(user.sub).map((d) => ({
      id: d.id,
      category: d.category,
      titleCt: d.title_ct,
      bodyCt: d.body_ct,
      bodyBytes: d.body_bytes,
      createdAt: d.created_at,
    }));
  }

  @Post()
  create(@CurrentUser() user: TideUser, @Body() body: CreateDocBody) {
    const { category, titleCt, bodyCt, bodyBytes } = body;
    if (!CATEGORIES.includes(category as Category)) throw new BadRequestException('Bad category');
    if (typeof titleCt !== 'string' || typeof bodyCt !== 'string' || !titleCt || !bodyCt) {
      throw new BadRequestException('titleCt and bodyCt are required');
    }
    if (titleCt.length + bodyCt.length > MAX_CIPHERTEXT) throw new BadRequestException('Too large');
    const row = {
      id: randomUUID(),
      owner: user.sub,
      category: category as Category,
      title_ct: titleCt,
      body_ct: bodyCt,
      body_bytes: Number.isFinite(bodyBytes) ? Number(bodyBytes) : bodyCt.length,
      created_at: new Date().toISOString(),
    };
    this.db.insertDoc(row);
    return { id: row.id, createdAt: row.created_at };
  }

  @Delete(':id')
  remove(@CurrentUser() user: TideUser, @Param('id') id: string) {
    if (!this.db.deleteDoc(user.sub, id)) throw new NotFoundException();
    return { ok: true };
  }

  /** Demo reset: wipes the caller's own documents and receipts. */
  @Delete()
  removeAll(@CurrentUser() user: TideUser) {
    this.db.deleteAll(user.sub);
    return { ok: true };
  }
}

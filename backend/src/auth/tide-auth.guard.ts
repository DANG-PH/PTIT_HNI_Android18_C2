import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { createLocalJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { loadTideConfig } from '../config';

export interface TideUser {
  sub: string;
  vuid?: string;
  name?: string;
  roles: string[];
}

export type AuthedRequest = Request & { user?: TideUser };

const ROLES_KEY = 'tide:roles';
/** Realm roles the verified token must carry. */
export const RequireRoles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().user!,
);

/**
 * Server-side authorization (layer 3): verifies the threshold-signed Tide JWT against the
 * JWK embedded in the adapter export. Never fetches JWKS remotely (Tide invariant I-04).
 */
@Injectable()
export class TideAuthGuard implements CanActivate {
  private verifier?: {
    jwks: ReturnType<typeof createLocalJWKSet>;
    issuer: string;
    clientId: string;
  };

  constructor(private readonly reflector: Reflector) {}

  private getVerifier() {
    if (this.verifier) return this.verifier;
    const cfg = loadTideConfig();
    if (!cfg.jwk?.keys?.length) {
      throw new ServiceUnavailableException(
        'tidecloak.json has no embedded jwk: run the realm init (IGA must be enabled)',
      );
    }
    this.verifier = {
      jwks: createLocalJWKSet(cfg.jwk),
      issuer: `${cfg['auth-server-url'].replace(/\/+$/, '')}/realms/${cfg.realm}`,
      clientId: cfg.resource,
    };
    return this.verifier;
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Missing bearer token');

    const v = this.getVerifier();
    let payload: JWTPayload & Record<string, any>;
    try {
      ({ payload } = await jwtVerify(token, v.jwks, { issuer: v.issuer }));
    } catch {
      throw new UnauthorizedException('Invalid or expired Tide token');
    }
    // TideCloak puts the client id in azp, not aud.
    if (payload.azp !== v.clientId) throw new UnauthorizedException('Token azp mismatch');

    const roles: string[] = payload.realm_access?.roles ?? [];
    const required =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]) ??
      [];
    const missing = required.filter((r) => !roles.includes(r));
    if (missing.length) throw new ForbiddenException(`Missing role: ${missing.join(', ')}`);

    req.user = {
      sub: payload.sub!,
      vuid: payload.vuid,
      name: payload.given_name ?? payload.name ?? payload.preferred_username,
      roles,
    };
    return true;
  }
}

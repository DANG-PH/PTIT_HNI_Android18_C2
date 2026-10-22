import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('NeedToKnow API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('GET /api/health is public', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200);
  });

  it.each(['/api/me', '/api/docs', '/api/receipts', '/api/operator/store'])(
    'GET %s without a token is 401',
    (path) => request(app.getHttpServer()).get(path).expect(401),
  );

  it('rejects a forged token', () => {
    const forged = [
      Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({ sub: 'attacker', realm_access: { roles: ['ntk-operator'] } })).toString('base64url'),
      'c2lnbmF0dXJl',
    ].join('.');
    return request(app.getHttpServer())
      .get('/api/operator/store')
      .set('Authorization', `Bearer ${forged}`)
      .expect((res) => {
        if (res.status !== 401 && res.status !== 503) throw new Error(`expected 401/503, got ${res.status}`);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});

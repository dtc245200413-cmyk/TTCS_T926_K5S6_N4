// Exercise the real Express middleware stack in memory, without app.listen,
// server.js, migrations, authentication fixtures or a database connection.
jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('./config/database', () => {
  const blocked = () => jest.fn(() => { throw new Error('CORS must not access MySQL'); });
  return { pool: { query: blocked(), execute: blocked(), getConnection: blocked() } };
});

const { IncomingMessage, ServerResponse } = require('node:http');
const { PassThrough } = require('node:stream');
const { pool } = require('./config/database');
const app = require('./app');

function preflight(origin, requestedHeaders = 'authorization,content-type,if-match') {
  return new Promise((resolve, reject) => {
    const socket = new PassThrough();
    const req = new IncomingMessage(socket);
    req.method = 'OPTIONS';
    req.url = '/api/offers/101';
    req.headers = {
      origin,
      'access-control-request-method': 'PATCH',
      'access-control-request-headers': requestedHeaders,
    };
    const res = new ServerResponse(req);
    res.end = () => {
      const result = { status: res.statusCode, headers: res.getHeaders() };
      socket.destroy();
      resolve(result);
      return res;
    };
    app.handle(req, res, error => {
      socket.destroy();
      reject(error || new Error('Preflight unexpectedly reached application routes'));
    });
  });
}

afterEach(() => {
  expect(pool.query).not.toHaveBeenCalled();
  expect(pool.execute).not.toHaveBeenCalled();
  expect(pool.getConnection).not.toHaveBeenCalled();
});

it.each(['http://localhost:5173', 'http://localhost:5174'])(
  'permits an unauthenticated PATCH preflight with If-Match from %s',
  async origin => {
    const { status, headers } = await preflight(origin);
    expect(status).toBe(204);
    expect(headers['access-control-allow-origin']).toBe(origin);
    expect(headers['access-control-allow-headers'].toLowerCase().split(',')).toEqual([
      'content-type', 'authorization', 'if-match',
    ]);
    expect(headers['access-control-allow-methods'].split(',')).toEqual([
      'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS',
    ]);
    expect(headers.vary).toContain('Origin');
  }
);

it('does not grant access to an origin outside the existing allowlist', async () => {
  const { headers } = await preflight('https://untrusted.example');
  expect(headers['access-control-allow-origin']).toBeUndefined();
});

it('does not reflect arbitrary requested headers or enable credentials', async () => {
  const { headers } = await preflight('http://localhost:5173', 'if-match,x-unapproved-header');
  expect(headers['access-control-allow-headers'].toLowerCase()).toContain('if-match');
  expect(headers['access-control-allow-headers'].toLowerCase()).not.toContain('x-unapproved-header');
  expect(headers['access-control-allow-credentials']).toBeUndefined();
});

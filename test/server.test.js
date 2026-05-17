const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { createServer, createOrder, products } = require('../server');

let server;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('health endpoint responds with ok status', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.status, 'ok');
});

test('products endpoint exposes store products', async () => {
  const response = await fetch(`${baseUrl}/api/products`);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.products.length, products.length);
});

test('go route redirects known destinations', async () => {
  const response = await fetch(`${baseUrl}/go/shop`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/#shop');
});

test('go route reports unknown destinations clearly', async () => {
  const response = await fetch(`${baseUrl}/go/missing`, { redirect: 'manual' });
  const payload = await response.json();
  assert.equal(response.status, 404);
  assert.match(payload.error, /Unknown destination/);
});

test('order creation validates and returns a subtotal', () => {
  const result = createOrder({
    customerName: 'Taylor',
    email: 'taylor@example.com',
    items: [{ id: products[0].id, quantity: 2 }]
  });
  assert.equal(result.order.subtotal, Number((products[0].price * 2).toFixed(2)));
  assert.match(result.order.id, /^VP-/);
});

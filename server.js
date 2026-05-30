const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);

const products = [
  {
    id: 'dog-starter-kit',
    name: 'Happy Pup Starter Kit',
    pet: 'Dog',
    price: 49.99,
    rating: 4.9,
    image: '🐶',
    description: 'Leash, chew toy, grooming mitt, and balanced treats for new dog parents.'
  },
  {
    id: 'cat-comfort-box',
    name: 'Cat Comfort Box',
    pet: 'Cat',
    price: 39.99,
    rating: 4.8,
    image: '🐱',
    description: 'Cozy blanket, feather teaser, calming spray, and crunchy salmon bites.'
  },
  {
    id: 'small-pet-care',
    name: 'Small Pet Care Pack',
    pet: 'Small Pets',
    price: 29.99,
    rating: 4.7,
    image: '🐹',
    description: 'Timothy hay, enrichment tunnel, safe bedding, and mineral chew bundle.'
  }
];

const services = [
  { id: 'vet-chat', name: '24/7 Vet Chat', description: 'Ask licensed professionals everyday health questions.' },
  { id: 'grooming', name: 'At-home Grooming', description: 'Book gentle grooming visits for dogs and cats.' },
  { id: 'nutrition', name: 'Nutrition Plans', description: 'Personalized food and supplement suggestions.' }
];

const redirectDestinations = {
  shop: '/#shop',
  services: '/#services',
  appointment: '/#appointment',
  support: 'mailto:care@vetpet.example?subject=Vetpet%20support'
};

const orders = [];

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers
  });
  res.end(body);
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body is too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function safePublicPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const filePath = path.normalize(path.join(publicDir, requestedPath));
  if (!filePath.startsWith(publicDir)) {
    return null;
  }
  return filePath;
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
  };
  return types[extension] || 'application/octet-stream';
}

function serveStatic(req, res, pathname) {
  const filePath = safePublicPath(pathname);
  if (!filePath) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendText(res, 404, 'Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
    res.end(data);
  });
}

function handleRedirect(res, slug) {
  const destination = redirectDestinations[slug];
  if (!destination) {
    sendJson(res, 404, {
      error: 'Unknown destination',
      availableDestinations: Object.keys(redirectDestinations)
    });
    return;
  }

  res.writeHead(302, {
    Location: destination,
    'Cache-Control': 'no-store'
  });
  res.end();
}

function createOrder(payload) {
  const customerName = String(payload.customerName || '').trim();
  const email = String(payload.email || '').trim();
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (customerName.length < 2) {
    return { error: 'Customer name must be at least 2 characters.' };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: 'A valid email address is required.' };
  }
  if (items.length === 0) {
    return { error: 'Add at least one product before checking out.' };
  }

  const normalizedItems = [];
  for (const item of items) {
    const product = products.find((candidate) => candidate.id === item.id);
    const quantity = Number(item.quantity || 0);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return { error: 'Cart contains an invalid product or quantity.' };
    }
    normalizedItems.push({
      id: product.id,
      name: product.name,
      quantity,
      unitPrice: product.price
    });
  }

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const order = {
    id: `VP-${Date.now().toString(36).toUpperCase()}-${String(orders.length + 1).padStart(3, '0')}`,
    customerName,
    email,
    items: normalizedItems,
    subtotal: Number(subtotal.toFixed(2)),
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  return { order };
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { status: 'ok', service: 'vetpet-fullstack' });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/products') {
    sendJson(res, 200, { products });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/services') {
    sendJson(res, 200, { services });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/redirects') {
    sendJson(res, 200, { redirects: redirectDestinations });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/orders') {
    try {
      const payload = await parseBody(req);
      const result = createOrder(payload);
      if (result.error) {
        sendJson(res, 400, { error: result.error });
        return;
      }
      sendJson(res, 201, { order: result.order });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  sendJson(res, 404, { error: 'API route not found' });
}

async function requestHandler(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname } = requestUrl;

  if (pathname.startsWith('/api/')) {
    await handleApi(req, res, pathname);
    return;
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/go/')) {
    handleRedirect(res, pathname.slice('/go/'.length));
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method not allowed');
    return;
  }

  serveStatic(req, res, pathname);
}

function createServer() {
  return http.createServer(requestHandler);
}

if (require.main === module) {
  createServer().listen(port, () => {
    console.log(`Vetpet app running at http://localhost:${port}`);
  });
}

module.exports = {
  createServer,
  requestHandler,
  createOrder,
  products,
  services,
  redirectDestinations
};

const state = {
  products: [],
  cart: new Map()
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

function renderProducts() {
  const container = document.querySelector('#products');
  container.innerHTML = state.products.map((product) => `
    <article class="product-card">
      <div class="product-icon" aria-hidden="true">${product.image}</div>
      <p class="product-meta"><span>${product.pet}</span><span>★ ${product.rating}</span></p>
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <p class="price">${formatCurrency(product.price)}</p>
      <div class="card-actions">
        <button class="button primary" type="button" data-add-to-cart="${product.id}">Add to cart</button>
      </div>
    </article>
  `).join('');
}

function renderServices(services) {
  const container = document.querySelector('#services-list');
  container.innerHTML = services.map((service) => `
    <article class="service-card">
      <h3>${service.name}</h3>
      <p>${service.description}</p>
    </article>
  `).join('');
}

function cartItems() {
  return [...state.cart.entries()].map(([id, quantity]) => {
    const product = state.products.find((candidate) => candidate.id === id);
    return { ...product, quantity };
  });
}

function renderCart() {
  const container = document.querySelector('#cart-items');
  const items = cartItems();
  if (items.length === 0) {
    container.innerHTML = '<p>Your cart is empty. Add an item to start checkout.</p>';
  } else {
    container.innerHTML = items.map((item) => `
      <div class="cart-item">
        <span>${item.name} × ${item.quantity}</span>
        <strong>${formatCurrency(item.price * item.quantity)}</strong>
      </div>
    `).join('');
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelector('#cart-total').textContent = formatCurrency(subtotal);
}

function addToCart(productId) {
  const quantity = state.cart.get(productId) || 0;
  state.cart.set(productId, quantity + 1);
  renderCart();
}

async function loadPageData() {
  const [{ products }, { services }] = await Promise.all([
    fetchJson('/api/products'),
    fetchJson('/api/services')
  ]);
  state.products = products;
  renderProducts();
  renderServices(services);
  renderCart();
}

async function submitOrder(event) {
  event.preventDefault();
  const message = document.querySelector('#checkout-message');
  const formData = new FormData(event.currentTarget);
  const items = cartItems().map((item) => ({ id: item.id, quantity: item.quantity }));

  try {
    const { order } = await fetchJson('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: formData.get('customerName'),
        email: formData.get('email'),
        items
      })
    });
    state.cart.clear();
    renderCart();
    event.currentTarget.reset();
    message.textContent = `Order ${order.id} reserved. Confirmation sent to ${order.email}.`;
  } catch (error) {
    message.textContent = error.message;
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add-to-cart]');
  if (!button) return;
  addToCart(button.dataset.addToCart);
});

document.querySelector('#checkout-form').addEventListener('submit', submitOrder);

loadPageData().catch((error) => {
  document.querySelector('#products').innerHTML = `<p>Unable to load products: ${error.message}</p>`;
});

// End-to-end API tests. Uses MONGODB_URI_TEST when set, otherwise an in-memory
// MongoDB from the `mongodb-memory-server` package (install it separately:
// npm i -D mongodb-memory-server). Never point this at production data.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.JWT_SECRET = process.env.JWT_SECRET_TEST || 'test-secret-for-automated-tests-only-0123456789';
process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT = '1000';

const { createApp } = require('../app');
const { runMigrations } = require('../services/migrate');
const { financialYearLabel, today, addDays } = require('../utils/dates');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');

let mongoServer;
let server;
let baseUrl;
const fy = financialYearLabel();
const s = {};

before(async () => {
  let uri = process.env.MONGODB_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
  }
  await mongoose.connect(uri, { dbName: `ebillsoft_test_${Date.now()}` });
  // Recreate v1's global unique index so the upgrade path is exercised.
  await mongoose.connection.db.collection('invoices').createIndex({ invoiceNumber: 1 }, { unique: true, name: 'invoiceNumber_1' });
  await runMigrations({ log: () => {} });
  await new Promise((resolve) => {
    server = createApp().listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

const call = async (method, path, { token = s.token, body, anonymous = false } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token && !anonymous) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
};

const expectStatus = (res, status) => assert.equal(res.status, status, `expected ${status}, got ${res.status}: ${JSON.stringify(res.data)}`);
const stockOf = async (id) => (await call('GET', `/products/${id}`)).data.stock;

test('v1 global unique index on invoiceNumber is dropped', async () => {
  const indexes = await mongoose.connection.db.collection('invoices').indexes();
  assert.ok(!indexes.some((index) => index.name === 'invoiceNumber_1'));
});

test('auth: register, login, session', async () => {
  let r = await call('POST', '/auth/register', { anonymous: true, body: { name: 'Owner', email: 'Owner@Test.com', password: 'secret123', businessName: 'Sharma Traders' } });
  expectStatus(r, 201);
  assert.ok(r.data.token);
  assert.equal(r.data.user.email, 'owner@test.com');
  assert.equal(r.data.user.company.name, 'Sharma Traders');

  r = await call('POST', '/auth/register', { anonymous: true, body: { name: 'Dup', email: 'owner@test.com', password: 'secret123' } });
  expectStatus(r, 409);
  r = await call('POST', '/auth/register', { anonymous: true, body: { name: 'Short', email: 'a@b.com', password: '123' } });
  expectStatus(r, 400);

  r = await call('POST', '/auth/login', { anonymous: true, body: { email: 'OWNER@test.com', password: 'wrong-pass' } });
  expectStatus(r, 401);
  r = await call('POST', '/auth/login', { anonymous: true, body: { email: 'OWNER@test.com', password: 'secret123' } });
  expectStatus(r, 200);
  s.token = r.data.token;

  r = await call('GET', '/auth/me');
  expectStatus(r, 200);
  assert.equal(r.data.user.password, undefined);

  expectStatus(await call('GET', '/invoices', { anonymous: true }), 401);
  expectStatus(await call('GET', '/invoices', { token: 'not-a-token' }), 401);
});

test('business profile and settings', async () => {
  expectStatus(await call('PUT', '/auth/company', { body: { gstin: 'BADGST' } }), 400);

  let r = await call('PUT', '/auth/company', {
    body: {
      name: 'Sharma Traders',
      gstin: '09aaach7409r1zz',
      address: 'Hazratganj, Lucknow',
      mobile: '9876543210',
      bankDetails: { bankName: 'State Bank of India', ifscCode: 'sbin0001234', upiId: 'sharma@upi' }
    }
  });
  expectStatus(r, 200);
  assert.equal(r.data.user.company.gstin, '09AAACH7409R1ZZ');
  assert.equal(r.data.user.company.stateCode, '09');
  assert.equal(r.data.user.company.bankDetails.ifscCode, 'SBIN0001234');

  expectStatus(await call('PUT', '/auth/company', { body: { logo: 'data:text/html;base64,AAAA' } }), 400);

  r = await call('PUT', '/auth/settings', { body: { defaultDueDays: 30, invoicePrefix: 'inv' } });
  expectStatus(r, 200);
  assert.equal(r.data.user.settings.defaultDueDays, 30);
  assert.equal(r.data.user.settings.invoicePrefix, 'INV');
});

test('parties', async () => {
  let r = await call('POST', '/clients', { body: { name: 'Local Customer', mobile: '9000000001', stateCode: '9' } });
  expectStatus(r, 201);
  assert.equal(r.data.stateCode, '09');
  assert.equal(r.data.type, 'CUSTOMER');
  s.localId = r.data._id;

  r = await call('POST', '/clients', { body: { name: 'Mumbai Buyer Pvt Ltd', gst: '27aapfu0939f1zv' } });
  expectStatus(r, 201);
  assert.equal(r.data.stateCode, '27');
  s.mumbaiId = r.data._id;

  r = await call('POST', '/clients', { body: { name: 'Supplier Co', type: 'SUPPLIER', gst: '09ABCDE1234F1Z5' } });
  expectStatus(r, 201);
  s.supplierId = r.data._id;

  r = await call('POST', '/clients', { body: { name: 'Opening Guy', openingBalance: 500 } });
  expectStatus(r, 201);

  expectStatus(await call('POST', '/clients', { body: { name: 'Bad GST', gst: '123' } }), 400);
  expectStatus(await call('POST', '/clients', { body: { mobile: '1' } }), 400);
});

test('items', async () => {
  let r = await call('POST', '/products', {
    body: { name: 'Steel Chair', hsnCode: '9401', unit: 'Pcs', defaultRate: 1000, purchaseRate: 600, taxRate: 18, stock: 10, lowStockAlert: 12 }
  });
  expectStatus(r, 201);
  s.chairId = r.data._id;

  r = await call('POST', '/products', { body: { name: 'Installation', type: 'SERVICE', defaultRate: 500, taxRate: 18, trackStock: true } });
  expectStatus(r, 201);
  assert.equal(r.data.trackStock, false);
  s.serviceId = r.data._id;

  expectStatus(await call('POST', '/products', { body: { name: 'No price' } }), 400);

  r = await call('GET', '/products?lowStock=true');
  assert.deepEqual(r.data.map((p) => p.name), ['Steel Chair']);

  r = await call('POST', `/products/${s.serviceId}/adjust-stock`, { body: { quantity: 5 } });
  expectStatus(r, 400);
});

test('purchase bill increases stock and takes payments', async () => {
  let r = await call('POST', '/purchases', {
    body: {
      supplierId: s.supplierId,
      supplier: { name: 'Supplier Co', gst: '09ABCDE1234F1Z5' },
      billNumber: 'SUP-77',
      items: [{ productId: s.chairId, description: 'Steel Chair', quantity: 5, rate: 600, taxRate: 18 }]
    }
  });
  expectStatus(r, 201);
  assert.equal(r.data.purchaseNumber, `PUR/${fy}/0001`);
  assert.equal(r.data.subtotal, 3000);
  assert.equal(r.data.cgst, 270);
  assert.equal(r.data.sgst, 270);
  assert.equal(r.data.totalAmount, 3540);
  assert.equal(r.data.status, 'UNPAID');
  s.purchaseId = r.data._id;
  assert.equal(await stockOf(s.chairId), 15);

  expectStatus(await call('POST', `/purchases/${s.purchaseId}/payments`, { body: { amount: 5000 } }), 400);
  r = await call('POST', `/purchases/${s.purchaseId}/payments`, { body: { amount: 3540, mode: 'BANK' } });
  expectStatus(r, 201);
  assert.equal(r.data.status, 'PAID');
  assert.equal(r.data.balanceDue, 0);
});

test('intra-state tax invoice: CGST + SGST, numbering, stock, due date', async () => {
  const r = await call('POST', '/invoices', {
    body: {
      clientId: s.localId,
      client: { name: 'Local Customer', stateCode: '09' },
      items: [
        { productId: s.chairId, description: 'Steel Chair', hsnCode: '9401', quantity: 2, rate: 1000, taxRate: 18 },
        { productId: s.serviceId, description: 'Installation', quantity: 1, rate: 500, discountPercent: 10, taxRate: 18 }
      ]
    }
  });
  expectStatus(r, 201);
  const inv = r.data;
  assert.equal(inv.invoiceNumber, `INV/${fy}/0001`);
  assert.equal(inv.isInterState, false);
  assert.equal(inv.subtotal, 2450);
  assert.equal(inv.cgst, 220.5);
  assert.equal(inv.sgst, 220.5);
  assert.equal(inv.igst, 0);
  assert.equal(inv.totalAmount, 2891);
  assert.equal(inv.status, 'UNPAID');
  assert.equal(inv.amountInWords, 'Rupees Two Thousand Eight Hundred Ninety One Only');
  assert.equal(new Date(inv.dueDate).toISOString(), addDays(today(), 30).toISOString());
  s.inv1 = inv._id;
  assert.equal(await stockOf(s.chairId), 13);
});

test('inter-state invoice: IGST, round off, part payment', async () => {
  const r = await call('POST', '/invoices', {
    body: {
      clientId: s.mumbaiId,
      client: { name: 'Mumbai Buyer Pvt Ltd', gst: '27AAPFU0939F1ZV' },
      items: [{ productId: s.chairId, description: 'Steel Chair', quantity: 3, rate: 999.5, taxRate: 18 }],
      initialPayment: { amount: 1000, mode: 'UPI' }
    }
  });
  expectStatus(r, 201);
  const inv = r.data;
  assert.equal(inv.invoiceNumber, `INV/${fy}/0002`);
  assert.equal(inv.placeOfSupply, '27');
  assert.equal(inv.isInterState, true);
  assert.equal(inv.igst, 539.73);
  assert.equal(inv.cgst, 0);
  assert.equal(inv.roundOff, -0.23);
  assert.equal(inv.totalAmount, 3538);
  assert.equal(inv.status, 'PARTIAL');
  assert.equal(inv.balanceDue, 2538);
  s.inv2 = inv._id;
  assert.equal(await stockOf(s.chairId), 10);
});

test('draft, finalise, cancel, restore and delete keep stock correct', async () => {
  let r = await call('POST', '/invoices', {
    body: { status: 'DRAFT', client: { name: 'Walk-in' }, items: [{ productId: s.chairId, description: 'Steel Chair', quantity: 1, rate: 1000, taxRate: 18 }] }
  });
  expectStatus(r, 201);
  assert.equal(r.data.status, 'DRAFT');
  const id = r.data._id;
  assert.equal(await stockOf(s.chairId), 10);

  expectStatus(await call('POST', `/invoices/${id}/share`), 400);

  r = await call('PATCH', `/invoices/${id}/status`, { body: { status: 'UNPAID' } });
  assert.equal(r.data.status, 'UNPAID');
  assert.equal(await stockOf(s.chairId), 9);

  r = await call('PATCH', `/invoices/${id}/status`, { body: { status: 'CANCELLED' } });
  assert.equal(r.data.status, 'CANCELLED');
  assert.equal(await stockOf(s.chairId), 10);
  expectStatus(await call('PUT', `/invoices/${id}`, { body: { notes: 'x' } }), 400);

  r = await call('PATCH', `/invoices/${id}/status`, { body: { status: 'UNPAID' } });
  assert.equal(r.data.status, 'UNPAID');
  assert.equal(await stockOf(s.chairId), 9);

  expectStatus(await call('DELETE', `/invoices/${id}`), 200);
  assert.equal(await stockOf(s.chairId), 10);
});

test('quotation converts into an invoice', async () => {
  let r = await call('POST', '/invoices', {
    body: { invoiceType: 'QUOTATION', client: { name: 'Prospect' }, items: [{ productId: s.chairId, description: 'Steel Chair', quantity: 2, rate: 950, taxRate: 18 }] }
  });
  expectStatus(r, 201);
  assert.equal(r.data.invoiceNumber, `QT/${fy}/0001`);
  assert.equal(r.data.status, 'DRAFT');
  const quoteId = r.data._id;
  assert.equal(await stockOf(s.chairId), 10);
  expectStatus(await call('POST', `/invoices/${quoteId}/payments`, { body: { amount: 10 } }), 400);

  r = await call('PATCH', `/invoices/${quoteId}/status`, { body: { status: 'ACCEPTED' } });
  assert.equal(r.data.status, 'ACCEPTED');

  r = await call('POST', `/invoices/${quoteId}/convert`);
  expectStatus(r, 201);
  assert.equal(r.data.invoiceType, 'INVOICE');
  assert.equal(r.data.invoiceNumber, `INV/${fy}/0004`);
  assert.equal(r.data.totalAmount, 2242);
  s.inv4 = r.data._id;
  assert.equal(await stockOf(s.chairId), 8);

  r = await call('GET', `/invoices/${quoteId}`);
  assert.equal(r.data.status, 'CONVERTED');
  assert.equal(r.data.convertedTo.invoiceNumber, `INV/${fy}/0004`);
  expectStatus(await call('PUT', `/invoices/${quoteId}`, { body: { notes: 'x' } }), 400);
  expectStatus(await call('POST', `/invoices/${quoteId}/convert`), 400);
});

test('editing an invoice recalculates totals and re-applies stock', async () => {
  let r = await call('PUT', `/invoices/${s.inv1}`, {
    body: { items: [{ productId: s.chairId, description: 'Steel Chair', hsnCode: '9401', quantity: 1, rate: 1000, taxRate: 18 }] }
  });
  expectStatus(r, 200);
  assert.equal(r.data.totalAmount, 1180);
  assert.equal(await stockOf(s.chairId), 9);

  r = await call('POST', `/invoices/${s.inv1}/payments`, { body: { amount: 1180, mode: 'CASH' } });
  assert.equal(r.data.status, 'PAID');
  const paymentId = r.data.payments[0]._id;

  expectStatus(await call('PUT', `/invoices/${s.inv1}`, { body: { items: [{ description: 'Cheaper', quantity: 1, rate: 500 }] } }), 400);
  expectStatus(await call('PATCH', `/invoices/${s.inv1}/status`, { body: { status: 'CANCELLED' } }), 400);

  r = await call('DELETE', `/invoices/${s.inv1}/payments/${paymentId}`);
  assert.equal(r.data.status, 'UNPAID');
  assert.equal(r.data.balanceDue, 1180);

  expectStatus(await call('POST', `/invoices/${s.inv1}/payments`, { body: { amount: 0 } }), 400);
  expectStatus(await call('POST', `/invoices/${s.inv1}/payments`, { body: { amount: 99999 } }), 400);
});

test('invoice list: filters, search, summary, overdue', async () => {
  let r = await call('GET', '/invoices');
  expectStatus(r, 200);
  assert.equal(r.data.invoices.length, 3);
  assert.equal(r.data.summary.totalAmount, 1180 + 3538 + 2242);
  assert.equal(r.data.summary.balanceDue, 1180 + 2538 + 2242);
  assert.equal(r.data.invoices[0].items, undefined);

  assert.equal((await call('GET', '/invoices?type=QUOTATION')).data.invoices.length, 1);
  assert.equal((await call('GET', '/invoices?q=mumbai')).data.invoices.length, 1);
  assert.equal((await call('GET', '/invoices?status=PARTIAL')).data.invoices.length, 1);
  expectStatus(await call('GET', '/invoices/123'), 404);
  expectStatus(await call('GET', '/invoices/64b000000000000000000000'), 404);

  r = await call('PUT', `/invoices/${s.inv2}`, { body: { dueDate: '2020-01-01' } });
  assert.equal(r.data.isOverdue, true);
  r = await call('GET', '/invoices?status=OVERDUE');
  assert.deepEqual(r.data.invoices.map((i) => i._id), [s.inv2]);

  r = await call('GET', `/invoices/next-number?type=INVOICE`);
  assert.equal(r.data.number, `INV/${fy}/0005`);
});

test('dashboard figures', async () => {
  const r = await call('GET', '/dashboard');
  expectStatus(r, 200);
  const d = r.data;
  assert.equal(d.year.sales, 6960);
  assert.equal(d.receivable.amount, 5960);
  assert.equal(d.overdue.amount, 2538);
  assert.equal(d.overdue.count, 1);
  assert.equal(d.payable.amount, 0);
  assert.equal(d.month.received, 1000);
  assert.equal(d.monthly.length, 12);
  assert.equal(d.monthly[11].sales, 6960);
  assert.equal(d.lowStock[0].name, 'Steel Chair');
  assert.equal(d.counts.items, 2);
  assert.equal(d.topCustomers[0].name, 'Mumbai Buyer Pvt Ltd');
});

test('expenses', async () => {
  let r = await call('POST', '/expenses', { body: { category: 'Rent', amount: 5000 } });
  expectStatus(r, 201);
  const rentId = r.data._id;
  expectStatus(await call('POST', '/expenses', { body: { category: 'Electricity', amount: 1180, gstAmount: 180, paymentMode: 'upi' } }), 201);
  expectStatus(await call('POST', '/expenses', { body: { category: '', amount: 10 } }), 400);
  expectStatus(await call('POST', '/expenses', { body: { category: 'X', amount: 10, gstAmount: 20 } }), 400);

  r = await call('GET', '/expenses');
  assert.equal(r.data.summary.total, 6180);
  assert.ok((await call('GET', '/expenses/categories')).data.includes('Rent'));

  r = await call('PUT', `/expenses/${rentId}`, { body: { amount: 5000, note: 'September' } });
  assert.equal(r.data.note, 'September');
});

test('reports: summary, GST, outstanding, items, stock, expenses', async () => {
  let r = await call('GET', '/reports/summary');
  expectStatus(r, 200);
  assert.equal(r.data.sales.taxable, 5898.5);
  assert.equal(r.data.sales.tax, 1061.73);
  assert.equal(r.data.purchases.tax, 540);
  assert.equal(r.data.gst.net, 341.73);
  assert.equal(r.data.profit.costOfGoods, 3600);
  assert.equal(r.data.profit.grossProfit, 2298.5);
  assert.equal(r.data.profit.netProfit, -3701.5);

  r = await call('GET', '/reports/gst');
  expectStatus(r, 200);
  assert.equal(r.data.b2b.length, 1);
  assert.equal(r.data.b2b[0].gstin, '27AAPFU0939F1ZV');
  assert.equal(r.data.output.igst, 539.73);
  assert.equal(r.data.output.cgst, 261);
  assert.equal(r.data.b2c.length, 1);
  assert.equal(r.data.b2c[0].taxable, 2900);
  assert.equal(r.data.netPayable.total, 341.73);
  assert.ok(r.data.hsn.some((row) => row.hsnCode === '9401'));

  r = await call('GET', '/reports/outstanding');
  assert.equal(r.data.totals.balance, 6460);
  assert.equal(r.data.totals.d90plus, 2538);
  assert.ok(r.data.rows.some((row) => row.name === 'Opening Guy'));
  assert.equal((await call('GET', '/reports/outstanding?type=payable')).data.totals.balance, 0);

  r = await call('GET', '/reports/items');
  const chair = r.data.rows.find((row) => row.name === 'Steel Chair');
  assert.equal(chair.soldQty, 6);
  assert.equal(chair.purchasedQty, 5);

  r = await call('GET', '/reports/stock');
  assert.equal(r.data.rows[0].stock, 9);
  assert.equal(r.data.totals.stockValue, 5400);

  r = await call('GET', '/reports/expenses');
  assert.equal(r.data.byCategory.length, 2);
});

test('party balances and ledger', async () => {
  let r = await call('GET', '/clients');
  const byName = Object.fromEntries(r.data.map((p) => [p.name, p]));
  assert.equal(byName['Local Customer'].receivable, 1180);
  assert.equal(byName['Mumbai Buyer Pvt Ltd'].receivable, 2538);
  assert.equal(byName['Supplier Co'].totalPurchases, 3540);
  assert.equal(byName['Supplier Co'].payable, 0);
  assert.equal(byName['Opening Guy'].receivable, 500);
  assert.equal((await call('GET', '/clients?type=SUPPLIER')).data.length, 1);

  r = await call('GET', `/clients/${s.mumbaiId}/ledger`);
  expectStatus(r, 200);
  assert.deepEqual(r.data.entries.map((e) => e.kind), ['SALE', 'PAYMENT_IN']);
  assert.equal(r.data.closingBalance, 2538);
});

test('payments register', async () => {
  let r = await call('GET', '/payments');
  expectStatus(r, 200);
  assert.equal(r.data.summary.totalIn, 1000);
  assert.equal(r.data.summary.totalOut, 3540);
  r = await call('GET', '/payments?direction=IN');
  assert.equal(r.data.payments.length, 1);
  assert.equal(r.data.payments[0].partyName, 'Mumbai Buyer Pvt Ltd');
});

test('public share link', async () => {
  let r = await call('POST', `/invoices/${s.inv2}/share`);
  expectStatus(r, 200);
  const { token } = r.data;
  assert.match(token, /^[a-f0-9]{32}$/);

  r = await call('GET', `/public/invoices/${token}`, { anonymous: true });
  expectStatus(r, 200);
  assert.equal(r.data.invoice.invoiceNumber, `INV/${fy}/0002`);
  assert.equal(r.data.company.name, 'Sharma Traders');
  assert.equal(r.data.invoice.userId, undefined);
  assert.equal(r.data.invoice.shareToken, undefined);

  await call('DELETE', `/invoices/${s.inv2}/share`);
  expectStatus(await call('GET', `/public/invoices/${token}`, { anonymous: true }), 404);
});

test('numbering can be reset and manual numbers are unique', async () => {
  let r = await call('GET', '/auth/numbering');
  assert.equal(r.data.numbering.find((n) => n.docType === 'INVOICE').preview, `INV/${fy}/0005`);

  r = await call('PUT', '/auth/numbering', { body: { docType: 'INVOICE', nextNumber: 101 } });
  assert.equal(r.data.preview, `INV/${fy}/0101`);

  const item = [{ description: 'Service', quantity: 1, rate: 100 }];
  r = await call('POST', '/invoices', { body: { client: { name: 'A' }, items: item } });
  assert.equal(r.data.invoiceNumber, `INV/${fy}/0101`);
  expectStatus(await call('POST', '/invoices', { body: { client: { name: 'B' }, items: item, invoiceNumber: `INV/${fy}/0101` } }), 409);

  r = await call('POST', '/invoices', { body: { client: { name: 'C' }, items: item, invoiceNumber: `INV/${fy}/0102` } });
  expectStatus(r, 201);
  r = await call('POST', '/invoices', { body: { client: { name: 'D' }, items: item } });
  assert.equal(r.data.invoiceNumber, `INV/${fy}/0103`, 'auto numbering skips manually used numbers');
});

test('another business cannot see or touch this data', async () => {
  let r = await call('POST', '/auth/register', { anonymous: true, body: { name: 'Other', email: 'other@test.com', password: 'secret123' } });
  const other = r.data.token;

  expectStatus(await call('GET', `/invoices/${s.inv1}`, { token: other }), 404);
  expectStatus(await call('PUT', `/clients/${s.localId}`, { token: other, body: { name: 'Hacked' } }), 404);
  expectStatus(await call('DELETE', `/products/${s.chairId}`, { token: other }), 404);
  expectStatus(await call('POST', '/invoices', { token: other, body: { clientId: s.localId, client: { name: 'X' }, items: [{ description: 'x', quantity: 1, rate: 1 }] } }), 400);
  assert.equal((await call('GET', '/invoices', { token: other })).data.invoices.length, 0);
  assert.equal((await call('GET', '/clients', { token: other })).data.length, 0);
  assert.equal((await call('GET', '/dashboard', { token: other })).data.receivable.amount, 0);

  r = await call('POST', '/invoices', { token: other, body: { client: { name: 'Mine' }, items: [{ description: 'x', quantity: 1, rate: 1 }] } });
  expectStatus(r, 201);
  assert.equal(r.data.invoiceNumber, `INV/${fy}/0001`);
});

test('password change and backup export', async () => {
  expectStatus(await call('PUT', '/auth/password', { body: { currentPassword: 'nope', newPassword: 'newpass1' } }), 400);
  expectStatus(await call('PUT', '/auth/password', { body: { currentPassword: 'secret123', newPassword: 'newpass1' } }), 200);
  expectStatus(await call('POST', '/auth/login', { anonymous: true, body: { email: 'owner@test.com', password: 'newpass1' } }), 200);

  const r = await call('GET', '/auth/backup');
  expectStatus(r, 200);
  assert.ok(r.data.salesDocuments.length >= 5);
  assert.equal(r.data.account.email, 'owner@test.com');
});

test('v1 invoices and products are upgraded in place', async () => {
  const owner = await User.findOne({ email: 'owner@test.com' });
  const base = { userId: owner._id, invoiceType: 'INVOICE', invoiceDate: new Date('2025-05-01'), dueDate: new Date('2025-05-15'), createdAt: new Date(), updatedAt: new Date() };
  await Invoice.collection.insertMany([
    {
      ...base,
      invoiceNumber: 'INV-123456-789',
      client: { name: 'Old Client', address: 'Old Address', gst: '' },
      items: [{ srNo: 1, description: 'Old item', hsnCode: '1234', quantity: 2, rate: 100, amount: 200 }],
      subtotal: 200,
      discount: 0,
      tax: 36,
      totalAmount: 236,
      amountInWords: 'Two Hundred Thirty Six Rupees Only',
      status: 'PAID'
    },
    {
      ...base,
      invoiceNumber: 'INV-123456-790',
      client: { name: 'Old Client', address: 'Old Address' },
      items: [{ srNo: 1, description: 'Old item', quantity: 5, rate: 100, amount: 500 }],
      subtotal: 500,
      discount: 0,
      tax: 0,
      totalAmount: 500,
      status: 'SENT'
    }
  ]);
  await Product.collection.insertOne({ userId: owner._id, name: 'Old product', hsnCode: '1', defaultRate: 10, unit: 'Nos' });

  const result = await runMigrations({ log: () => {} });
  assert.equal(result.invoices, 2);

  const paid = await Invoice.findOne({ invoiceNumber: 'INV-123456-789' });
  assert.equal(paid.status, 'PAID');
  assert.equal(paid.amountPaid, 236);
  assert.equal(paid.balanceDue, 0);
  assert.equal(paid.otherCharges, 36);
  assert.equal(paid.otherChargesLabel, 'Tax');

  const sent = await Invoice.findOne({ invoiceNumber: 'INV-123456-790' });
  assert.equal(sent.status, 'UNPAID');
  assert.equal(sent.balanceDue, 500);

  const oldProduct = await Product.findOne({ name: 'Old product' });
  assert.equal(oldProduct.trackStock, false);
  assert.equal(oldProduct.taxRate, 0);

  const r = await call('PUT', `/invoices/${paid._id}`, { body: { notes: 'edited after upgrade' } });
  expectStatus(r, 200);
  assert.equal(r.data.totalAmount, 236);
  assert.equal(r.data.status, 'PAID');

  assert.equal((await runMigrations({ log: () => {} })).invoices, 0, 'migration is idempotent');
});

test('party email and Aadhaar: validated, kept only without GSTIN, masked on share link', async () => {
  const { verhoeffCheckDigit } = require('../utils/aadhaar');
  const base = '98765432101';
  const aadhaar = base + verhoeffCheckDigit(base);
  const wrong = base + ((verhoeffCheckDigit(base) + 1) % 10);
  const spaced = `${aadhaar.slice(0, 4)} ${aadhaar.slice(4, 8)} ${aadhaar.slice(8)}`;

  expectStatus(await call('POST', '/clients', { body: { name: 'Bad Aadhaar', aadhaar: wrong } }), 400);
  let r = await call('POST', '/clients', { body: { name: 'Retail Buyer', email: 'Buyer@Mail.com', aadhaar: spaced } });
  expectStatus(r, 201);
  assert.equal(r.data.aadhaar, aadhaar);
  assert.equal(r.data.email, 'buyer@mail.com');

  r = await call('POST', '/clients', { body: { name: 'Registered Buyer', gst: '09ABCDE1234F1Z5', aadhaar } });
  expectStatus(r, 201);
  assert.equal(r.data.aadhaar, '', 'Aadhaar is not stored when a GSTIN is given');

  const item = [{ description: 'Service', quantity: 1, rate: 100 }];
  expectStatus(await call('POST', '/invoices', { body: { client: { name: 'X', aadhaar: wrong }, items: item } }), 400);
  expectStatus(await call('POST', '/invoices', { body: { client: { name: 'X', email: 'not-an-email' }, items: item } }), 400);

  r = await call('POST', '/invoices', { body: { client: { name: 'Retail Buyer', email: 'buyer@mail.com', aadhaar: spaced }, items: item } });
  expectStatus(r, 201);
  assert.equal(r.data.client.aadhaar, aadhaar);
  assert.equal(r.data.client.email, 'buyer@mail.com');

  const withGst = await call('POST', '/invoices', { body: { client: { name: 'Registered', gst: '09ABCDE1234F1Z5', aadhaar }, items: item } });
  assert.equal(withGst.data.client.aadhaar, '');

  const { token } = (await call('POST', `/invoices/${r.data._id}/share`)).data;
  const shared = await call('GET', `/public/invoices/${token}`, { anonymous: true });
  expectStatus(shared, 200);
  assert.equal(shared.data.invoice.client.aadhaar, `XXXX XXXX ${aadhaar.slice(-4)}`);
  assert.equal(shared.data.invoice.client.email, 'buyer@mail.com');
});

test('bill without tax: prices are GST-inclusive, format kept on edit and conversion', async () => {
  const item = [{ description: 'Chair', quantity: 1, rate: 1180, taxRate: 18 }];
  let r = await call('POST', '/invoices', { body: { client: { name: 'Walk-in Bill' }, items: item, taxMode: 'INCLUSIVE', pricesIncludeTax: false } });
  expectStatus(r, 201);
  const billId = r.data._id;
  assert.equal(r.data.taxMode, 'INCLUSIVE');
  assert.equal(r.data.pricesIncludeTax, true, 'forced on for the without-tax format');
  assert.equal(r.data.subtotal, 1000);
  assert.equal(r.data.cgst, 90);
  assert.equal(r.data.sgst, 90);
  assert.equal(r.data.totalAmount, 1180);

  r = await call('PUT', `/invoices/${billId}`, { body: { pricesIncludeTax: false, items: item } });
  assert.equal(r.data.totalAmount, 1180, 'still tax-inclusive after an edit');

  r = await call('PUT', `/invoices/${billId}`, { body: { taxMode: 'GST', pricesIncludeTax: false } });
  assert.equal(r.data.taxMode, 'GST');
  assert.equal(r.data.totalAmount, 1392, 'switching to a tax invoice adds GST on top');

  const quote = await call('POST', '/invoices', { body: { invoiceType: 'QUOTATION', client: { name: 'Quote' }, items: item, taxMode: 'INCLUSIVE' } });
  expectStatus(quote, 201);
  const converted = await call('POST', `/invoices/${quote.data._id}/convert`);
  expectStatus(converted, 201);
  assert.equal(converted.data.taxMode, 'INCLUSIVE');
  assert.equal(converted.data.totalAmount, 1180);

  const normal = await call('POST', '/invoices', { body: { client: { name: 'Default' }, items: [{ description: 'x', quantity: 1, rate: 100 }] } });
  assert.equal(normal.data.taxMode, 'GST');
});

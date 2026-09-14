const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Client = require('../models/Client');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const Counter = require('../models/Counter');
const User = require('../models/User');
const { num, round2, amountToWords } = require('../utils/numbers');

const INVOICE_STATUS_MAP = { SENT: 'UNPAID', OVERDUE: 'UNPAID' };
const QUOTE_STATUS_MAP = { PAID: 'ACCEPTED', OVERDUE: 'SENT', UNPAID: 'SENT', PARTIAL: 'SENT', CANCELLED: 'DECLINED' };

// Upgrades v1 invoices (flat tax, no payment rows) in place. Idempotent: only
// documents that have never had `balanceDue` written are touched.
const migrateInvoices = async () => {
  const legacy = await Invoice.collection.find({ balanceDue: { $exists: false } }).toArray();
  if (!legacy.length) return 0;

  const ops = legacy.map((doc) => {
    const type = doc.invoiceType || 'INVOICE';
    const items = (doc.items || []).map((item, index) => {
      const quantity = num(item.quantity);
      const rate = num(item.rate);
      const taxableValue = round2(num(item.amount) || quantity * rate);
      return {
        srNo: index + 1,
        description: item.description || 'Item',
        hsnCode: item.hsnCode || '',
        unit: item.unit || 'Nos',
        quantity,
        rate,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 0,
        taxableValue,
        cgst: 0,
        sgst: 0,
        igst: 0,
        amount: taxableValue
      };
    });

    const subtotal = round2(items.reduce((sum, item) => sum + item.taxableValue, 0));
    const totalAmount = round2(num(doc.totalAmount));
    const legacyTax = num(doc.tax);

    let status = doc.status || 'DRAFT';
    status = type === 'INVOICE' ? INVOICE_STATUS_MAP[status] || status : QUOTE_STATUS_MAP[status] || status;

    const payments =
      type === 'INVOICE' && doc.status === 'PAID'
        ? [{ amount: totalAmount, date: doc.updatedAt || doc.invoiceDate || new Date(), mode: 'OTHER', reference: '', note: 'Marked as paid before upgrade', createdAt: new Date(), updatedAt: new Date() }]
        : [];
    const amountPaid = round2(payments.reduce((sum, p) => sum + p.amount, 0));

    return {
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            invoiceType: type,
            items,
            subtotal,
            totalDiscount: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            totalTax: 0,
            otherCharges: legacyTax,
            otherChargesLabel: legacyTax ? 'Tax' : 'Other Charges',
            tax: 0,
            discount: num(doc.discount),
            roundOff: round2(totalAmount - (subtotal + legacyTax - num(doc.discount))),
            pricesIncludeTax: false,
            isInterState: false,
            placeOfSupply: (doc.client && doc.client.stateCode) || '',
            amountInWords: amountToWords(totalAmount),
            payments,
            amountPaid,
            balanceDue: round2(Math.max(totalAmount - amountPaid, 0)),
            status
          }
        }
      }
    };
  });

  await Invoice.collection.bulkWrite(ops);
  return ops.length;
};

const migrateProducts = async () => {
  const result = await Product.collection.updateMany(
    { taxRate: { $exists: false } },
    {
      $set: {
        taxRate: 0,
        purchaseRate: 0,
        type: 'GOODS',
        trackStock: false,
        stock: 0,
        lowStockAlert: 0,
        isActive: true,
        sku: '',
        category: ''
      }
    }
  );
  return result.modifiedCount;
};

const migrateClients = async () => {
  const result = await Client.collection.updateMany(
    { type: { $exists: false } },
    { $set: { type: 'CUSTOMER', openingBalance: 0, openingBalanceType: 'RECEIVABLE' } }
  );
  return result.modifiedCount;
};

const runMigrations = async ({ log = console.log } = {}) => {
  // syncIndexes drops v1's global unique index on invoiceNumber, which would
  // otherwise stop two businesses from both having INV/26-27/0001.
  for (const Model of [User, Client, Product, Invoice, Purchase, Expense, Counter]) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await Model.syncIndexes();
    } catch (error) {
      log(`Index sync failed for ${Model.modelName}: ${error.message}`);
    }
  }

  const invoices = await migrateInvoices();
  const products = await migrateProducts();
  const clients = await migrateClients();
  if (invoices || products || clients) {
    log(`Data upgrade complete: ${invoices} invoices, ${products} products, ${clients} parties updated`);
  }
  return { invoices, products, clients };
};

module.exports = { runMigrations };

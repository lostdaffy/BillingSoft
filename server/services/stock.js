const Product = require('../models/Product');
const { num } = require('../utils/numbers');

// direction: -1 when goods leave (sales), +1 when goods arrive (purchases / reversals).
const adjustStock = async (userId, items = [], direction) => {
  const totals = new Map();
  for (const item of items) {
    if (!item || !item.productId) continue;
    const quantity = num(item.quantity);
    if (!quantity) continue;
    const id = String(item.productId);
    totals.set(id, (totals.get(id) || 0) + quantity);
  }
  if (!totals.size) return;

  await Product.bulkWrite(
    [...totals].map(([id, quantity]) => ({
      updateOne: {
        filter: { _id: id, userId, trackStock: true },
        update: { $inc: { stock: direction * quantity } }
      }
    }))
  );
};

module.exports = { adjustStock };

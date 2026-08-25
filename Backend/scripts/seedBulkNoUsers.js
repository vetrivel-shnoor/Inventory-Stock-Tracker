require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

// Seed Configuration
const USERS_COUNT = 100;
const PRODUCTS_COUNT = 20;
const TRANSACTIONS_COUNT = 100;
const AUDIT_LOGS_COUNT = 30;

// Dummy Images for randomization (from previous seed)
const DUMMY_IMAGES = [
  '/public/uploads/seed-product-1787652205841-4.jpg',
  '/public/uploads/seed-product-1787652205393-3.jpg',
  '/public/uploads/seed-product-1787652204883-2.jpg',
  '/public/uploads/seed-product-1787652204359-1.jpg',
  '/public/uploads/seed-product-1787652203664-0.jpg'
];

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Furniture', 'Toys', 'Automotive', 'Health', 'Beauty', 'Sports', 'Books'];
const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(length) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

async function runSeeder() {
  try {
    console.log("🌱 Connecting to database...");
    await mongoose.connect(process.env.MONGO_DB);
    console.log("✅ Connected to MongoDB");

    // 1. Clear Database (Do not touch Users)
    console.log("🗑️ Clearing existing data...");
    await Product.deleteMany({});
    await Transaction.deleteMany({});
    await AuditLog.deleteMany({});
    console.log("✅ Cleared Collections");

    const superAdmin = await User.findOne({ role: 'superadmin' });
    if (!superAdmin) {
      console.error("❌ Superadmin not found! Please run the native server once to create it.");
      process.exit(1);
    }
    const allUsers = [superAdmin];

    // 3. Generate Products
    console.log(`📦 Generating ${PRODUCTS_COUNT} Products...`);
    const productsToInsert = [];
    for (let i = 0; i < PRODUCTS_COUNT; i++) {
      productsToInsert.push({
        name: `${randomChoice(['Premium', 'Basic', 'Pro', 'Ultra'])} ${randomChoice(CATEGORIES)} Item ${randomString(4).toUpperCase()}`,
        sku: `SKU-${randomString(8).toUpperCase()}-${i}`,
        category: randomChoice(CATEGORIES),
        price: randomInt(10, 5000),
        currentStock: 0, // Will be updated by transactions
        lowStockThreshold: randomInt(5, 50),
        image: randomChoice(DUMMY_IMAGES),
        createdBy: randomChoice(allUsers)._id,
        isArchived: Math.random() > 0.95 // 5% chance of being archived
      });
    }
    const insertedProducts = await Product.insertMany(productsToInsert);
    console.log("✅ Products Generated");

    // 4. Generate Transactions (to build stock)
    console.log(`📦 Generating ${TRANSACTIONS_COUNT} Transactions...`);
    const transactionsToInsert = [];
    const productStockMap = new Map(); // Track stock locally to ensure no negative stock (unless forced)

    insertedProducts.forEach(p => productStockMap.set(p._id.toString(), 0));

    // Chunk insertions for RAM safety
    const chunkSize = 2000;
    for (let i = 0; i < TRANSACTIONS_COUNT; i++) {
      const product = randomChoice(insertedProducts);
      const pidStr = product._id.toString();
      let currentStock = productStockMap.get(pidStr);
      
      let type = 'IN';
      let quantity = randomInt(10, 100);
      
      // 40% chance of OUT, but only if we have stock
      if (Math.random() > 0.6 && currentStock >= 5) {
        type = 'OUT';
        quantity = randomInt(1, Math.min(50, currentStock));
      }

      transactionsToInsert.push({
        product: product._id,
        type: type,
        quantity: quantity,
        unitPrice: product.price,
        totalValue: quantity * product.price,
        reason: type === 'IN' ? 'Restock' : 'Sale',
        performedBy: randomChoice(allUsers)._id
      });

      // Update local map
      productStockMap.set(pidStr, type === 'IN' ? currentStock + quantity : currentStock - quantity);
    }

    // Insert transactions in chunks
    for (let i = 0; i < transactionsToInsert.length; i += chunkSize) {
      await Transaction.insertMany(transactionsToInsert.slice(i, i + chunkSize));
    }
    console.log("✅ Transactions Generated");

    // 5. Apply Final Stock to Products
    console.log(`🔄 Syncing final stock levels to Products...`);
    const bulkOps = [];
    for (const [pid, stock] of productStockMap.entries()) {
      bulkOps.push({
        updateOne: {
          filter: { _id: pid },
          update: { $set: { currentStock: stock } }
        }
      });
    }
    await Product.bulkWrite(bulkOps);
    console.log("✅ Stock Synced");

    // 6. Generate Audit Logs
    console.log(`📦 Generating ${AUDIT_LOGS_COUNT} Audit Logs...`);
    const auditLogsToInsert = [];
    for (let i = 0; i < AUDIT_LOGS_COUNT; i++) {
      const product = randomChoice(insertedProducts);
      const action = randomChoice(['PRODUCT_CREATED', 'STOCK_UPDATED', 'PRODUCT_ARCHIVED', 'PRICE_CHANGED']);
      auditLogsToInsert.push({
        action: action,
        entity: 'PRODUCT',
        entityId: product._id,
        performedBy: randomChoice(allUsers)._id,
        details: { message: `Automated demo seed action: ${action}` }
      });
    }
    
    for (let i = 0; i < auditLogsToInsert.length; i += chunkSize) {
      await AuditLog.insertMany(auditLogsToInsert.slice(i, i + chunkSize));
    }
    console.log("✅ Audit Logs Generated");

    console.log("🎉 MASSIVE DATA SEED COMPLETE!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
}

runSeeder();

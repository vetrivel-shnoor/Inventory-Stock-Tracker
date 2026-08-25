require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const https = require('https');
const User = require('../models/userModel');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { minioClient } = require('../config/minio');

// Utility to download image
const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Follow redirect for picsum
        downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      const stream = fs.createWriteStream(filepath);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => reject(err));
    });
  });
};

const sampleProducts = [
  { name: 'MacBook Pro 16', sku: 'LAP-MBP-16', category: 'Electronics', price: 199900, stock: 45, min: 10 },
  { name: 'Sony WH-1000XM5', sku: 'AUD-SON-XM5', category: 'Electronics', price: 29900, stock: 120, min: 20 },
  { name: 'Nike Air Max 270', sku: 'SHO-NK-270', category: 'Clothing', price: 12500, stock: 8, min: 15 }, // low stock
  { name: 'Organic Coffee Beans 1kg', sku: 'FOD-COF-ORG', category: 'Food', price: 1200, stock: 150, min: 50 },
  { name: 'Levi\'s 501 Original Jeans', sku: 'CLO-LEV-501', category: 'Clothing', price: 4500, stock: 2, min: 10 }, // critical stock
];

async function runSeed() {
  try {
    console.log('🌱 Connecting to database...');
    const uri = process.env.MONGO_DB?.trim() || "mongodb://127.0.0.1:27017/sass";
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Ensure uploads folder exists
    const uploadsDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Get an admin user (create if not exists)
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('Creating default admin user...');
      admin = new User({
        fullname: 'Admin User',
        username: 'admin',
        email: 'admin@example.com',
        password: 'Password123!',
        role: 'admin'
      });
      await admin.save();
    }

    console.log('🗑️ Clearing existing products and transactions...');
    await Product.deleteMany({});
    await Transaction.deleteMany({});

    console.log('📦 Injecting dummy products and fetching images...');
    
    const bucketName = process.env.MINIO_BUCKET_NAME || 'icuman';
    const endpoint = process.env.MINIO_ENDPOINT || '127.0.0.1';
    const port = process.env.MINIO_PORT || 9000;
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';

    for (let i = 0; i < sampleProducts.length; i++) {
      const item = sampleProducts[i];
      const filename = `seed-product-${Date.now()}-${i}.jpg`;
      const filepath = path.join(uploadsDir, filename);
      
      console.log(`Downloading image for ${item.name}...`);
      await downloadImage(`https://picsum.photos/seed/${item.sku}/400/400`, filepath);

      // Upload to MinIO
      const imageBuffer = fs.readFileSync(filepath);
      await minioClient.putObject(bucketName, filename, imageBuffer, {
        'Content-Type': 'image/jpeg'
      });
      console.log(`☁️ Uploaded ${item.name} image to MinIO`);

      const fileUrl = `/public/uploads/${filename}`;

      const product = new Product({
        name: item.name,
        sku: item.sku,
        category: item.category,
        price: item.price,
        currentStock: item.stock,
        lowStockThreshold: item.min,
        image: fileUrl,
        createdBy: admin._id
      });
      await product.save();
      console.log(`✅ Created Product: ${item.name}`);
      
      // Cleanup local temp file
      fs.unlinkSync(filepath);

      // Create initial stock IN transaction
      const tx = new Transaction({
        product: product._id,
        type: 'IN',
        quantity: item.stock,
        unitPrice: item.price,
        totalValue: item.stock * item.price,
        reason: 'Initial Seed Inventory',
        performedBy: admin._id
      });
      await tx.save();
    }

    console.log('🎉 Database seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

runSeed();

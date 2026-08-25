const fs = require('fs');

// Import mongoose to update the role manually for testing
const mongoose = require('mongoose');
const User = require('../models/userModel'); // assuming this path is correct relative to the script's root

async function testAllRoutes() {
  const BASE_URL = 'http://localhost:3000/api';
  let cookie = '';
  
  console.log('--- Starting Route Tests ---');
  
  // Connect to DB directly to promote user
  require('dotenv').config({ path: __dirname + '/../.env' });
  await mongoose.connect(process.env.MONGO_DB || 'mongodb://127.0.0.1:27017/sass');

  const randomStr = Math.random().toString(36).substring(7);
  const testEmail = `testadmin_${randomStr}@example.com`;
  
  try {
    console.log(`\n1. Signing up user: ${testEmail}`);
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Test Admin',
        username: `testadmin_${randomStr}`,
        email: testEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    });
    
    const signupData = await signupRes.json();
    console.log('Signup Status:', signupRes.status);
    
    // Extract cookie from headers if any
    const setCookie = signupRes.headers.get('set-cookie');
    if (setCookie) {
      cookie = setCookie.split(';')[0];
    } else {
      console.log('Logging in to get cookie...');
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'Password123!' })
      });
      const loginCookie = loginRes.headers.get('set-cookie');
      if (loginCookie) cookie = loginCookie.split(';')[0];
    }
    
    console.log('Got cookie:', !!cookie);

    // Promote to Admin
    if (signupData.user && signupData.user.id) {
      console.log('\n--> Promoting test user to Admin...');
      await User.findByIdAndUpdate(signupData.user.id, { role: 'admin' });
      console.log('User promoted successfully.');
    }
    
    // 2. Test Product Creation (POST /api/products)
    console.log('\n2. Testing POST /api/products');
    
    const formData = new FormData();
    formData.append('name', `Test Product ${randomStr}`);
    formData.append('sku', `SKU-${randomStr}`);
    formData.append('category', 'TestCategory');
    formData.append('price', '99.99');
    formData.append('initialStock', '50');
    formData.append('lowStockThreshold', '10');

    // To properly send multipart/form-data with Node fetch without a File object, we can just send JSON since multer handles optional files
    const createProductRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        name: `Test Product ${randomStr}`,
        sku: `SKU-${randomStr}`,
        category: 'TestCategory',
        price: 99.99,
        initialStock: 50,
        lowStockThreshold: 10
      })
    });
    
    const productData = await createProductRes.json();
    console.log('Create Product Status:', createProductRes.status);
    if (createProductRes.status === 403) {
      console.log('⚠️ Got 403 Forbidden. Your authMiddleware requires role="admin".');
      console.log('To fully test POST /api/products, you must give this user admin rights via DB.');
    } else {
      console.log('Product Data:', productData);
    }
    
    let productId = productData._id;

    // 3. Test Get Products (GET /api/products)
    console.log('\n3. Testing GET /api/products');
    const getProductsRes = await fetch(`${BASE_URL}/products`, {
      headers: { 'Cookie': cookie }
    });
    console.log('Get Products Status:', getProductsRes.status);
    
    if (productId) {
      // 4. Test Get Product by ID (GET /api/products/:id)
      console.log('\n4. Testing GET /api/products/' + productId);
      const getProductRes = await fetch(`${BASE_URL}/products/${productId}`, {
        headers: { 'Cookie': cookie }
      });
      console.log('Get Product by ID Status:', getProductRes.status);
      
      // 5. Test Transactions (POST /api/transactions)
      console.log('\n5. Testing POST /api/transactions');
      const createTxRes = await fetch(`${BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        },
        body: JSON.stringify({
          productId: productId,
          type: 'OUT',
          quantity: 5,
          reason: 'Test Sale'
        })
      });
      console.log('Create Transaction Status:', createTxRes.status);
      console.log('Transaction Data:', await createTxRes.json());
      
      // 6. Test Dashboard Stats (GET /api/dashboard/stats)
      console.log('\n6. Testing GET /api/dashboard/stats');
      const getStatsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
        headers: { 'Cookie': cookie }
      });
      console.log('Get Stats Status:', getStatsRes.status);
      console.log('Stats Data:', await getStatsRes.json());
      
      // 7. Test Delete Product
      console.log('\n7. Testing DELETE /api/products/' + productId);
      const deleteProductRes = await fetch(`${BASE_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookie }
      });
      console.log('Delete Product Status:', deleteProductRes.status);
    }
    
    console.log('\n--- All Tests Completed ---');
    process.exit(0);
  } catch (error) {
    console.error('Test script encountered an error:', error);
    process.exit(1);
  }
}

testAllRoutes();

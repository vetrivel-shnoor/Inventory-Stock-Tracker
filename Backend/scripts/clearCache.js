require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { connection } = require('../config/redis');

async function clearCache() {
  try {
    console.log("🧹 Connecting to Redis to clear cache...");
    await connection.flushall();
    console.log("✅ Successfully cleared all Redis cache.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
    process.exit(1);
  }
}

clearCache();

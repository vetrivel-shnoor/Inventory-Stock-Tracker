/**
 * Backend/config/redis.js
 * 
 * This file configures and exports the Redis connection instance used for the BullMQ queue
 * and any other caching requirements.
 */
const Redis = require("ioredis");

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

module.exports = { connection };

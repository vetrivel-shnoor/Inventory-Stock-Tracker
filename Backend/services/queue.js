/**
 * Backend/services/queue.js
 * 
 * This file sets up the BullMQ queue for processing background tasks like media uploads,
 * utilizing the unified Redis configuration.
 */
const { Queue } = require("bullmq");
const { connection } = require("../config/redis");

const mediaQueue = new Queue("media-processing", {
  connection,
  settings: {
    skipCheckRedisVersion: true,
  },
});

module.exports = { mediaQueue };

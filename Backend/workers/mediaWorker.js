/**
 * Backend/workers/mediaWorker.js
 * 
 * This file defines the BullMQ worker for processing media tasks, such as resizing images,
 * and updates the database with the new file paths.
 * Now integrated with MinIO object storage.
 */
const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const { connection } = require("../config/redis");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { minioClient } = require("../config/minio");

// Import Models
require("../models/userModel");
require("../models/Product");

// --- CONFIGURATION ---
const IMAGE_PROFILES = {
  User: (pipeline) => pipeline.resize(500, 500, { fit: "cover" }),
  Product: (pipeline) => pipeline.resize(800, 800, { fit: "contain" }),
  default: (pipeline) => pipeline.resize(800, 800, { fit: "inside" }),
};

// --- HELPER FUNCTIONS ---

const resolveSafePath = (targetPath, checkBackend = true) => {
  let absolutePath = path.resolve(targetPath);
  if (fs.existsSync(absolutePath)) return absolutePath;
  if (checkBackend) {
    const backendPath = path.join(process.cwd(), "Backend", targetPath);
    if (fs.existsSync(backendPath)) return backendPath;
  }
  return null;
};

const processImageToBuffer = async (inputPath, modelName) => {
  sharp.cache(false);
  const pipeline = sharp(inputPath);

  const transformFn = IMAGE_PROFILES[modelName] || IMAGE_PROFILES.default;
  transformFn(pipeline);

  const buffer = await pipeline.webp({ quality: 80 }).toBuffer();
  
  if (buffer.length === 0) {
    throw new Error("Generated image buffer is empty (0 bytes)");
  }

  return buffer;
};

const cleanupFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    console.warn(`[Cleanup Warning] Failed to delete ${filePath}: ${err.message}`);
  }
  return false;
};

const updateDatabase = async (
  modelName,
  fileId,
  fieldName,
  newUrl
) => {
  const Model = mongoose.model(modelName);
  const doc = await Model.findById(fileId);
  
  if (!doc) throw new Error(`${modelName} not found: ${fileId}`);

  // Cleanup old image from MinIO if it exists
  if (doc[fieldName]) {
    const oldUrl = doc[fieldName];
    const oldFileName = oldUrl.split('/').pop();
    const newFileName = newUrl.split('/').pop();

    if (oldFileName !== newFileName) {
      try {
        const bucketName = process.env.MINIO_BUCKET_NAME || 'icuman';
        await minioClient.removeObject(bucketName, oldFileName);
        console.log(`[Worker] 🗑️ Deleted old image from MinIO: ${oldFileName}`);
      } catch (err) {
        console.warn(`[Worker] ⚠️ Failed to delete old image from MinIO: ${err.message}`);
      }
    }
  }

  // Update DB
  await Model.findByIdAndUpdate(fileId, { [fieldName]: newUrl });
};

// --- MAIN WORKER ---

const worker = new Worker(
  "media-processing",
  async (job) => {
    const { fileId, filePath, mimeType, modelName, fieldName } = job.data;

    console.log(`[Worker] 🟢 Job started: ${modelName} (${fileId})`);

    let absoluteInputPath = null;
    const bucketName = process.env.MINIO_BUCKET_NAME || 'icuman';

    try {
      // 1. Validate Input
      absoluteInputPath = resolveSafePath(filePath);
      if (!absoluteInputPath) {
        throw new Error(`Input file missing: ${filePath}`);
      }

      // 2. Process Image
      if (!mimeType.startsWith("image/")) {
        throw new Error("Unsupported MIME type");
      }

      const timestamp = Date.now();
      const finalFilename = `${modelName.toLowerCase()}-${fileId}-${timestamp}.webp`;

      console.log(`[Worker] ⚙️ Processing image to buffer...`);
      const imageBuffer = await processImageToBuffer(
        absoluteInputPath,
        modelName
      );

      console.log(`[Worker] ☁️ Uploading to MinIO...`);
      await minioClient.putObject(bucketName, finalFilename, imageBuffer, {
        'Content-Type': 'image/webp'
      });

      console.log(`[Worker] ✅ Uploaded: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

      // 3. Generate Path
      const fileUrl = `/public/uploads/${finalFilename}`;

      // 4. Update Database & Cleanup Old Avatar
      await updateDatabase(
        modelName,
        fileId,
        fieldName,
        fileUrl
      );

      // 5. Cleanup Input Temp File
      cleanupFile(absoluteInputPath);

      console.log(`[Worker] 🎉 Success: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      console.error(`❌ [Worker Failed] ${error.message}`);
      throw error;
    } finally {
      // Ensure cleanup runs even on failure
      if (absoluteInputPath) cleanupFile(absoluteInputPath);
    }
  },
  {
    connection,
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  }
);

console.log("Media Worker started (MinIO Mode)...");

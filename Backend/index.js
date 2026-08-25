/**
 * Backend/index.js
 * 
 * This is the main entry point for the backend server. It configures Express middleware,
 * database connections, routing, and error handling.
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("passport");
const fs = require("fs");
const path = require("path");

// 1. Pass the 'passport' library into your config file
require("./config/passport")(passport);

// Database imports
const connectMongo = require("./config/connectMongo"); // Mongo
const { initializeMinio } = require("./config/minio"); // MinIO
initializeMinio();

const { createServer } = require("http");
const app = express();
const server = createServer(app);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // Allow requests from your frontend
    credentials: true, // Allow cookies to be sent
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json());
app.use(passport.initialize());

// Rate Limiting setup: Prevents abuse by limiting each IP to 100 requests per 15 minutes.
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true, 
  legacyHeaders: false, 
  message: { message: "Too many requests, please try again later." }
});
app.use("/api", limiter);
const uploadDir = path.join(__dirname, "public", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📂 Created "public/uploads" directory');
} else {
  console.log('📂 "public/uploads" directory already exists. Preserving contents.');
}

// -----------------------------------------------------------------------------
// MINIO IMAGE PROXY (Fallback for Native Local Dev)
// -----------------------------------------------------------------------------
// In production (Docker), Nginx intercepts requests to `/public/uploads/` 
// and proxies them directly to MinIO. 
// However, when running natively (npm run dev), there is no Nginx.
// This route acts as a fallback to ensure the backend can fetch the image 
// from MinIO and stream it to the frontend.
// Note: Express 5's path-to-regexp v8 parses wildcards as arrays.
app.get("/public/uploads/*objectName", async (req, res, next) => {
  const objectName = req.params.objectName[0];
  const bucketName = process.env.MINIO_BUCKET_NAME || 'icuman';
  
  try {
    const { minioClient } = require("./config/minio");
    const stream = await minioClient.getObject(bucketName, objectName);
    stream.pipe(res);
  } catch (err) {
    if (err.code === 'NoSuchKey') return next(); // Let express.static handle it if it exists locally
    next();
  }
});

// Serve the public directory as a final fallback for local files
app.use("/public", express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3000;

// Bootstrap app with all DBs
(async () => {
  try {
    await Promise.all([connectMongo()]);
    const seedSuperAdmin = require("./scripts/seedAdmin");
    await seedSuperAdmin();
    
    // Load categories cache
    const cacheService = require("./services/cacheService");
    await cacheService.loadCategoriesCache();

    // register routes
    app.use("/api", require("./routes/index"));

    // Global Error Handler for logging server errors
    app.use((err, req, res, next) => {
      console.error(`[SERVER ERROR] ${err.message}`);
      console.error(err.stack);
      res.status(500).json({ error: "Internal Server Error" });
    });

    server.listen(port, "0.0.0.0", () => {
      console.log(`☑️  Sass server running on http://127.0.0.1:${port}`);
      console.log("=".repeat(process.stdout.columns || 80));
    });
  } catch (err) {
    console.error(`[CRITICAL ERROR] Startup failed (DB not connected):`, err.message || err);
    process.exit(1); // let nodemon restart
  }
})();

// Optional: gracefully handle MongoDB disconnect
const mongoose = require("mongoose");
mongoose.connection.on("disconnected", () => {
  console.error("[DB ERROR] MongoDB disconnected — shutting down server");
});

mongoose.connection.on("error", (err) => {
  console.error(`[DB ERROR] MongoDB connection error:`, err);
});

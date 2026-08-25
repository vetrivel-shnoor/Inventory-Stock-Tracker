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

// Rate Limiting setup
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, 
  legacyHeaders: false, 
  message: { message: "Too many requests, please try again later." }
});
app.use("/api", limiter);
const uploadDir = path.join(__dirname, "public", "uploads");

// Function to clear a directory
const clearDirectory = (directory) => {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach((file) => {
      const curPath = path.join(directory, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        clearDirectory(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
  }
};

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📂 Created "public/uploads" directory');
} else {
  console.log('📂 "public/uploads" directory already exists, clearing contents...');
  clearDirectory(uploadDir);
}

app.use("/public/uploads", express.static(path.join(__dirname, "public/uploads")));
const port = process.env.PORT || 3000;

// Bootstrap app with all DBs
(async () => {
  try {
    await Promise.all([connectMongo()]);
    const seedSuperAdmin = require("./scripts/seedAdmin");
    await seedSuperAdmin();

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

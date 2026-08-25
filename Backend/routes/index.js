// routes/index.js

const express = require("express");
const router = require("express").Router();
// Admin Routes
router.use("/admin", require("./adminRoutes"));
router.use("/auth", require("./authRoutes"));
router.use("/profile", require("./profileRoutes"));
router.use("/products", require("./productRoutes"));
router.use("/transactions", require("./transactionRoutes"));
router.use("/dashboard", require("./dashboardRoutes"));
module.exports = router;

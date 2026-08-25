// routes/index.js

const express = require("express");
const router = require("express").Router();
router.use("/auth", require("./authRoutes"));
router.use("/profile", require("./profileRoutes"));
router.use("/products", require("./productRoutes"));
router.use("/transactions", require("./transactionRoutes"));
router.use("/dashboard", require("./dashboardRoutes"));
router.use("/users", require("./userRoutes"));
module.exports = router;

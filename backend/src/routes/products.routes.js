const express = require("express");
const router = express.Router();
const { getAllProducts } = require("../controllers/products.controller");

router.get("/", getAllProducts);

module.exports = router;

const express = require("express");

const router = express.Router();

const orderController = require("../Controller/orderController");

router.post("/", orderController.createOrder);
router.get("/:id", orderController.getOrderDetails);

module.exports = router;
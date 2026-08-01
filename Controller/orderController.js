const orderModel = require("../models/orderModel");
const redisClient = require("../config/redis");

const createOrder = async (req, res) => {
    const { user_id, medicine_id, quantity } = req.body;

    if (!user_id || !medicine_id || !quantity) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    const lockKey = `lock:medicine:${medicine_id}`;
    const lockValue = Date.now().toString();

    try {
        // Try to acquire a Redis lock (NX = only set if not exists, EX = auto-expire in 5s)
        const acquired = await redisClient.set(lockKey, lockValue, {
            NX: true,
            EX: 5
        });

        if (!acquired) {
            return res.status(409).json({
                message: "Another order is being processed for this medicine, please try again"
            });
        }

        const result = await orderModel.placeOrder(user_id, medicine_id, quantity);

        // Real-time low stock alert (event-driven requirement)
        const LOW_STOCK_THRESHOLD = 10;
        if (result.medicine.stock < LOW_STOCK_THRESHOLD) {
            const io = req.app.get("io");
            io.emit("lowStockAlert", {
                id: result.medicine.id,
                name: result.medicine.name,
                stock: result.medicine.stock
            });
        }

        return res.status(201).json({
            message: "Order placed successfully",
            order: result.order
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: err.message || "Internal Server Error"
        });
    } finally {
        // Release the lock only if we still own it
        const currentValue = await redisClient.get(lockKey);
        if (currentValue === lockValue) {
            await redisClient.del(lockKey);
        }
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await orderModel.getOrderDetails(id);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        res.json(order);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

module.exports = {
    createOrder,
    getOrderDetails
};
const medicineModel = require("../models/medicineModel");
const redisClient = require("../config/redis");

// Create Medicine
const createMedicine = async (req, res) => {
    try {
        const { name, category, stock, price } = req.body;

        if (!name || !category || stock == null || price == null) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const medicine = await medicineModel.addMedicine(
            name,
            category,
            stock,
            price
        );

        await redisClient.del("medicines");

        return res.status(201).json({
            success: true,
            message: "Medicine added successfully",
            medicine
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// Get All Medicines
const getMedicines = async (req, res) => {
    try {
        const cachedData = await redisClient.get("medicines");

        if (cachedData) {
            console.log("Data fetched from Redis");
            return res.json(JSON.parse(cachedData));
        }

        const medicines = await medicineModel.getAllMedicines();

        await redisClient.set(
            "medicines",
            JSON.stringify(medicines)
        );

        console.log("Data fetched from PostgreSQL");

        return res.json(medicines);

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// Update Medicine Stock
const updateMedicineStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { stock } = req.body;

        if (stock == null) {
            return res.status(400).json({
                success: false,
                message: "Stock is required"
            });
        }

        const medicine = await medicineModel.updateStock(id, stock);

        await redisClient.del("medicines");

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: "Medicine not found"
            });
        }

        // Real-time low stock alert (event-driven requirement)
        const LOW_STOCK_THRESHOLD = 10;
        if (medicine.stock < LOW_STOCK_THRESHOLD) {
            const io = req.app.get("io");
            io.emit("lowStockAlert", {
                id: medicine.id,
                name: medicine.name,
                stock: medicine.stock
            });
        }

        return res.json({
            success: true,
            message: "Stock updated successfully",
            medicine
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// Delete Medicine
const deleteMedicine = async (req, res) => {
    try {
        const { id } = req.params;

        const medicine = await medicineModel.deleteMedicine(id);

        await redisClient.del("medicines");

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: "Medicine not found"
            });
        }

        return res.json({
            success: true,
            message: "Medicine deleted successfully"
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// Search Medicine
const searchMedicine = async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Medicine name is required"
            });
        }

        const medicines = await medicineModel.searchMedicine(name);

        return res.json(medicines);

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// Recommend Medicines
const recommendMedicines = async (req, res) => {
    try {
        const { id } = req.params;

        const medicines = await medicineModel.recommendMedicines(id);

        return res.json(medicines);

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// Low Stock Alert
const getLowStockAlert = async (req, res) => {
    try {
        const medicines = await medicineModel.getLowStockMedicines(10);

        const io = req.app.get("io");
        io.emit("lowStockAlert", medicines);

        return res.json({ success: true, medicines });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    createMedicine,
    getMedicines,
    updateMedicineStock,
    deleteMedicine,
    searchMedicine,
    recommendMedicines,
    getLowStockAlert
};
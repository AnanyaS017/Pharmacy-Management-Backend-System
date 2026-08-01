const express = require("express");
const router = express.Router();

const medicineController = require("../Controller/medicineController");

// Search first
router.get("/search", medicineController.searchMedicine);

router.get(
    "/recommend/:id",
    medicineController.recommendMedicines
);

// Other routes
router.post("/", medicineController.createMedicine);
router.get("/", medicineController.getMedicines);
router.put("/:id", medicineController.updateMedicineStock);
router.delete("/:id", medicineController.deleteMedicine);
router.get("/low-stock", medicineController.getLowStockAlert);

module.exports = router;
const express = require("express");
const router = express.Router();

console.log("LLM Routes Loaded");

const llmController = require("../Controller/llmController");

router.post("/recommend", llmController.getRecommendation);

module.exports = router;
const { recommendMedicine } = require("../services/llmService");

exports.getRecommendation = async (req, res) => {
    try {
        const { symptoms } = req.body;

        if (!symptoms) {
            return res.status(400).json({
                success: false,
                message: "Symptoms are required"
            });
        }

        const recommendation = await recommendMedicine(symptoms);

        res.status(200).json({
            success: true,
            recommendation
        });

    } catch (error) {
        console.error("LLM Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to generate recommendation"
        });
    }
};


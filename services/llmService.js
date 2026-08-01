const Groq = require("groq-sdk");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function recommendMedicine(symptoms) {
    const response = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
            {
                role: "system",
                content:
                    "You are a pharmacy assistant. Provide general educational information only. Do not diagnose diseases or prescribe medications. Recommend consulting a qualified healthcare professional."
            },
            {
                role: "user",
                content: `Symptoms: ${symptoms}`
            }
        ]
    });

    return response.choices?.[0]?.message?.content || "No recommendation available.";
}

module.exports = { recommendMedicine };
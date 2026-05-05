const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* =========================
   SERVE FRONTEND
========================= */
app.use(express.static(path.join(__dirname, "../public")));

/* =========================
   NASA APOD PROXY (SAFE)
========================= */
app.get("/api/apod", async (req, res) => {
  try {
    const key = process.env.NASA_API_KEY;
    const date = req.query.date;

    let url = `https://api.nasa.gov/planetary/apod?api_key=${key}`;
    if (date) url += `&date=${date}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error("NASA ERROR:", err);
    res.status(500).json({ error: "NASA failed" });
  }
});

/* =========================
   GROQ CHAT
========================= */
app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body.messages;

    // Validate messages array exists and is not empty
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Separate system messages from the rest (Groq requires system first)
    const systemMessages = messages.filter(m => m.role === "system");
    const nonSystemMessages = messages.filter(m => m.role !== "system");

    // Rebuild with system message(s) first, then the rest
    const orderedMessages = [...systemMessages, ...nonSystemMessages];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: orderedMessages,
          max_tokens: 512,
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      console.error("GROQ ERROR:", errData);
      return res.status(response.status).json({ error: "Groq request failed", detail: errData });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("CHAT ERROR:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
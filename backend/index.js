import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Now loaded from .env

app.post('/extract', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  // Gemini prompt for structured extraction
  const prompt = `
Extract the following details from this contract description:
- From (the party offering the contract)
- To (the party receiving the contract)
- Deliverables
- Deadline
- Payment terms
- Milestones
- Penalties or refund clauses

Return the result as a JSON object with keys: description, from, to, deliverables, deadline, payment, milestones, penalties.

Description: """${text}"""
`;

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );
    // Parse Gemini's response
    const aiText = response.data.candidates[0].content.parts[0].text;
    // Try to extract JSON from the response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      // Format deadline to dd-mm-yyyy if possible
      if (extracted.deadline) {
        let date = new Date(extracted.deadline);
        if (isNaN(date.getTime())) {
          // Try to parse formats like '28th of July' or '28 July' and assume year 2025
          const match = extracted.deadline.match(/(\d{1,2})(?:st|nd|rd|th)?(?: of)? ([A-Za-z]+)/);
          if (match) {
            const day = match[1];
            const monthName = match[2];
            const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
            const monthIndex = months.findIndex(m => m.startsWith(monthName.toLowerCase()));
            if (monthIndex !== -1) {
              date = new Date(2025, monthIndex, parseInt(day));
            }
          }
        }
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          extracted.deadline = `${day}-${month}-${year}`; // for display
          extracted.deadline_iso = `${year}-${month}-${day}`; // for input[type=date]
        }
      }
      res.json(extracted);
    } else {
      res.status(500).json({ error: 'AI did not return valid JSON', raw: aiText });
    }
  } catch (err) {
    console.error('Gemini API error:', err.response?.data || err.message);
    res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`AI backend running on http://localhost:${PORT}`)); 
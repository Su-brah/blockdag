import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = 'AIzaSyDNs-J51iu8_j569fliZ3D6l3y2PCLlDvc'; // <-- Replace with your actual key

app.post('/extract', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  // Gemini prompt for structured extraction
  const prompt = `
Extract the following details from this contract description:
- Parties involved
- Deliverables
- Deadline
- Payment terms
- Milestones
- Penalties or refund clauses

Return the result as a JSON object with keys: description, parties, deliverables, deadline, payment, milestones, penalties.

Description: """${text}"""
`;

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY,
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
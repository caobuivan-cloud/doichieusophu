/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = process.cwd() + '/server.ts';
const __dirname = process.cwd();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini client securely
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // AI-assisted mapping endpoint
  app.post('/api/gemini/match', async (req, res) => {
    try {
      if (!ai) {
        return res.status(400).json({
          error: 'API Key is missing or default. Please add GEMINI_API_KEY in Settings > Secrets.',
        });
      }

      const { transactions, masterList } = req.body;

      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ error: 'Missing or empty transactions list.' });
      }

      if (!masterList || !Array.isArray(masterList) || masterList.length === 0) {
        return res.status(400).json({ error: 'Missing or empty master customer list.' });
      }

      // Format simple structures to send to Gemini to minimize token count
      const formattedTransactions = transactions.map(t => ({
        idx: t.index,
        desc: t.description,
        amt: t.amount,
      }));

      const formattedMaster = masterList.map(m => ({
        email: m.email || '',
        name: m.name || '',
        code: m.code || '',
        taxCode: m.taxCode || '',
      }));

      // Construction of instructions and content
      const systemInstruction = `You are an expert AI Accounting Assistant. Your job is to match vague, incomplete, or typo-ridden Bank Statement transaction descriptions against a Master Customer directory.
Rules:
1. Examine the description closely for names, emails (even written as 'username gmail com' or 'username@gmail'), billing codes, tax codes, or initials.
2. Relate descriptions (such as "Tai khoan hungxd2992 gmail com" or "nap tien htjvn.trans") back to the closest master customer.
3. Be smart with typos, missing dots, missing "@" characters, and Vietnamese name variations (e.g., "NGUYEN VAN HUNG" might easily map to email "hungxd2992@gmail.com" and Mã KH "KH03033").
4. Assign a confidence score from 0.0 to 1.0. If there is no logical match, confidence must be low (< 0.3) or unmatched.
5. You must output a structured JSON array matching the specified responseSchema.`;

      const prompt = `Please match the following bank statement transactions to the most likely customer in our Master directory.

Transactions to match:
${JSON.stringify(formattedTransactions, null, 2)}

Master Directory:
${JSON.stringify(formattedMaster, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                transactionIndex: {
                  type: Type.INTEGER,
                  description: 'The idx of the matched transaction from the input',
                },
                matchedEmail: {
                  type: Type.STRING,
                  description: 'The email of the matched customer from the directory, or empty if none',
                },
                matchedCustomerCode: {
                  type: Type.STRING,
                  description: 'The code (Mã KH) of the matched customer from the directory, or empty if none',
                },
                matchedCustomerName: {
                  type: Type.STRING,
                  description: 'The name (Tên công ty/cá nhân) of the matched customer, or empty if none',
                },
                confidence: {
                  type: Type.NUMBER,
                  description: 'Match confidence between 0.0 and 1.0',
                },
                reasoning: {
                  type: Type.STRING,
                  description: 'A brief, concise, friendly vietnamese explanation of why this was matched (e.g., "Tên NGUYEN VAN HUNG khớp với email hungxd...", or "Email minhle91719 viết liền khớp minhle.91719")',
                },
              },
              required: ['transactionIndex', 'confidence', 'reasoning'],
            },
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Emply response received from Gemini.');
      }

      const results = JSON.parse(responseText.trim());
      return res.json({ success: true, results });

    } catch (error: any) {
      console.error('Gemini mapping failed:', error);
      return res.status(500).json({ error: error.message || 'Lỗi xử lý đối chiếu AI' });
    }
  });

  // Serve static UI or run Vite in middleware mode
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware integrated.');
  } else {
    // Serve production static assets compiled under dist
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      console.log('Production static asset serving initiated.');
    } else {
      console.warn('Production build "/dist" directory not found! Ensure "npm run build" is run before starting server.');
    }
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  app.listen(port, '0.0.0.0', () => {
    console.log(`[OK] Server listening on port ${port} (env: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((error) => {
  console.error('[CRITICAL] Startup failed:', error);
});

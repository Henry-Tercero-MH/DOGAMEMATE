// ═══════════════════════════════════════════════════════════════════
// Vercel Serverless Function - Proxy para Google Apps Script
// ═══════════════════════════════════════════════════════════════════

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx3nTmyJw12VskNQdNpTPYpOFbGlTxFonYeKwAx7Vm42aVLOwZbfe2iWYugwOYfow1Jdw/exec';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const axios = require('axios');
    const { method, body, query } = req;

    let response;

    if (method === 'GET') {
      const queryString = new URLSearchParams(query).toString();
      const url = `${APPS_SCRIPT_URL}?${queryString}`;
      response = await axios.get(url, { 
        headers: { 'Content-Type': 'application/json' },
        maxRedirects: 5 // Seguir redirects de Google
      });
    } else if (method === 'POST') {
      response = await axios.post(APPS_SCRIPT_URL, body, {
        headers: { 'Content-Type': 'application/json' },
        maxRedirects: 5
      });
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    return res.status(200).json(response.data);

  } catch (error) {
    console.error('Proxy error:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Proxy error: ' + error.message,
      details: error.response?.data || error.message
    });
  }
}

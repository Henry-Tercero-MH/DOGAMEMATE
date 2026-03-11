// ═══════════════════════════════════════════════════════════════════
// Vercel Serverless Function - Proxy para Google Apps Script
// ═══════════════════════════════════════════════════════════════════
// Este endpoint actúa como proxy para evitar problemas de CORS
// con Google Apps Script desde dominios externos

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzVgUlo3JDsAaB6H2u3NcSIM9lN81hWR1BpjCHPuA8A0i4rJZY8zqd5TW9tj1W1Wzu8/exec';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method, body, query } = req;

    let response;

    if (method === 'GET') {
      // Para GET requests, pasar query params
      const queryString = new URLSearchParams(query).toString();
      const url = `${APPS_SCRIPT_URL}?${queryString}`;
      
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else if (method === 'POST') {
      // Para POST requests, enviar el body
      response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Proxy server error: ' + error.message 
    });
  }
}

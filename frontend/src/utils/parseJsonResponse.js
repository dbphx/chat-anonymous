/**
 * Parse a fetch Response body as JSON. Avoids opaque SyntaxError when the server
 * returns HTML (wrong API base URL) or plain-text errors.
 */
export async function parseJsonResponse(response) {
  const text = await response.text();
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    return null;
  }

  // Plain-text status lines (e.g. "404 Not Found") parse as a number then fail at
  // the next character — same symptom as "Unexpected non-whitespace ... position 4".
  if (/^\d{3}\s+\S/.test(trimmed)) {
    const hint =
      response.url && response.url.includes('/api/')
        ? ` Request URL was ${response.url}.`
        : '';
    throw new Error(
      `Server returned plain text (${trimmed.slice(0, 120)}${trimmed.length > 120 ? '…' : ''}) instead of JSON.${hint} ` +
        'Use the Go API base URL (port 8081 in this project). For local npm start without REACT_APP_BACKEND_URL, use package.json "proxy" and relative /api URLs.'
    );
  }

  try {
    return JSON.parse(trimmed);
  } catch (err) {
    if (trimmed.startsWith('<')) {
      throw new Error(
        'API returned HTML instead of JSON. Set REACT_APP_BACKEND_URL to the Go backend (e.g. http://localhost:8081), not the React app URL.'
      );
    }
    const preview = trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
    throw new Error(
      `Invalid JSON from API (${err.message}). Body preview: ${preview}. Check backend is running and REACT_APP_BACKEND_URL matches the Go server.`
    );
  }
}

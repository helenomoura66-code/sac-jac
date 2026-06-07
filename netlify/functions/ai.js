exports.handler = async function(event) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: headers, body: "Method Not Allowed" };
  }

  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ content: [{ type: "text", text: "Chave Gemini nao configurada no Netlify." }] }) };
  }

  try {
    var body = JSON.parse(event.body);
    var messages = body.messages || [];

    // Converter formato OpenAI -> Gemini
    var contents = messages.map(function(m) {
      return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
    });

    // Tentar com v1beta primeiro, depois v1 como fallback
    var urls = [
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey,
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + apiKey
    ];

    var data = null;
    var resp = null;

    for (var i = 0; i < urls.length; i++) {
      resp = await fetch(urls[i], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: contents,
          generationConfig: { maxOutputTokens: body.max_tokens || 400 }
        })
      });
      data = await resp.json();
      if (resp.ok) break;
      // Se não for erro de modelo não encontrado, para
      if (resp.status !== 404) break;
    }

    if (!resp.ok) {
      return { statusCode: resp.status, headers: headers, body: JSON.stringify({ content: [{ type: "text", text: "Erro API Gemini (" + resp.status + "): " + JSON.stringify(data) }] }) };
    }

    var text = "";
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      text = data.candidates[0].content.parts.map(function(p) { return p.text || ""; }).join("");
    }

    return { statusCode: 200, headers: headers, body: JSON.stringify({ content: [{ type: "text", text: text }] }) };

  } catch (e) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ content: [{ type: "text", text: "Erro: " + e.message }] }) };
  }
};

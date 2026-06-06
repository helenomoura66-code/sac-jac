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

  var token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ content: [{ type: "text", text: "Token nao configurado no Netlify." }] }) };
  }

  try {
    var body = JSON.parse(event.body);
    var resp = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ model: "gpt-4o", max_tokens: body.max_tokens || 400, messages: body.messages })
    });

    var data = await resp.json();

    if (!resp.ok) {
      return { statusCode: resp.status, headers: headers, body: JSON.stringify({ content: [{ type: "text", text: "Erro API: " + JSON.stringify(data) }] }) };
    }

    var text = "";
    if (data.choices && data.choices[0] && data.choices[0].message) {
      text = data.choices[0].message.content || "";
    }

    return { statusCode: 200, headers: headers, body: JSON.stringify({ content: [{ type: "text", text: text }] }) };

  } catch (e) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ content: [{ type: "text", text: "Erro: " + e.message }] }) };
  }
};

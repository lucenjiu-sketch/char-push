import { buildPushHTTPRequest } from "@pushforge/builder";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      const body = await request.json();
      const subscription = body.push_subscription;

      if (body.action === "sync_context") {
        return json({ success: true, message: "数据同步成功" });
      }

      if (body.action === "test_push") {
        if (!subscription) return json({ error: "no subscription" }, 400);

        const privateJWK = vapidKeysToJWK(env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

        const req = await buildPushHTTPRequest({
          privateJWK,
          subscription,
          message: {
            payload: {
              title: "溪玉机",
              body: "测试成功！你已成功连接离线推送服务。",
              icon: "https://i.postimg.cc/d3z037tr/IMG-20260519-094026.png"
            },
            adminContact: "mailto:test@example.com",
          },
        });
        await fetch(req.endpoint, { method: "POST", headers: req.headers, body: req.body });
        return json({ success: true, message: "测试推送成功" });
      }

      return json({ error: "未知的 action" }, 400);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};

function vapidKeysToJWK(publicKeyB64url, privateKeyB64url) {
  const publicBytes = base64urlToBytes(publicKeyB64url);
  const x = publicBytes.slice(1, 33);
  const y = publicBytes.slice(33, 65);
  const d = base64urlToBytes(privateKeyB64url);
  return {
    kty: "EC", crv: "P-256",
    x: bytesToBase64url(x),
    y: bytesToBase64url(y),
    d: bytesToBase64url(d),
  };
}

function base64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

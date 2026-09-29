export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (request.method === "POST") {
        try {
          const body = await request.json();
          const { name, phone, email, service, vehicle, date, duration, message } = body;

          if (!name || !phone || !email) {
            return new Response(
              JSON.stringify({ error: "Nombre, teléfono y email son obligatorios" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const mailBody = `
NUEVO LEAD - Alquiler Furgonetas Alicante
=========================================

Nombre:      ${name}
Teléfono:    ${phone}
Email:       ${email}
Servicio:    ${service || "No especificado"}
Vehículo:    ${vehicle || "No especificado"}
Fecha:       ${date || "No especificada"}
Duración:    ${duration || "No especificada"}

Mensaje:
${message || "Sin mensaje adicional"}

-----------------------------------------
Origen: ${request.headers.get("referer") || "Directo"}
Fecha:  ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
`;

          if (!env.RESEND_API_KEY) {
            console.error("RESEND_API_KEY is not configured");
            return new Response(
              JSON.stringify({ error: "Error al enviar el email. Intenta de nuevo." }),
              { status: 502, headers: { "Content-Type": "application/json" } },
            );
          }

          const mailPayload = {
            from: "Alquiler Furgonetas Alicante <noreply@alquilerdefurgonetasalicante.es>",
            to: ["alquilerfurgonetasalicante@proton.me"],
            reply_to: email,
            subject: `Nuevo lead: ${name} - ${vehicle || "Sin vehículo"} - ${service || "Sin servicio"}`,
            text: mailBody,
          };

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
            },
            body: JSON.stringify(mailPayload),
          });

          if (!response.ok) {
            console.error("Resend error:", await response.text());
            return new Response(
              JSON.stringify({ error: "Error al enviar el email. Intenta de nuevo." }),
              { status: 502, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Contact API error:", err);
          return new Response(
            JSON.stringify({ error: "Error interno del servidor" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      }
    }

    return env.ASSETS.fetch(request);
  },
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const { name, phone, email, service, vehicle, date, duration, message } = body;

    if (!name || !phone || !email) {
      return new Response(JSON.stringify({ error: "Nombre, teléfono y email son obligatorios" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
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

    const mailPayload = {
      personalizations: [
        {
          to: [{ email: "alquilerfurgonetasalicante@proton.me" }]
        }
      ],
      from: {
        email: "noreply@alquilerdefurgonetasalicante.es",
        name: "Alquiler Furgonetas Alicante"
      },
      subject: `Nuevo lead: ${name} - ${vehicle || "Sin vehículo"} - ${service || "Sin servicio"}`,
      content: [
        {
          type: "text/plain",
          value: mailBody
        }
      ]
    };

    const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mailPayload)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("MailChannels error:", err);
      return new Response(JSON.stringify({ error: "Error al enviar el email. Intenta de nuevo." }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Contact API error:", err);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

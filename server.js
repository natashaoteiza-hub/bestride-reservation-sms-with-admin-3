import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sirve el frontend desde /public
app.use(express.static(path.join(__dirname, "public")));

// ---- Datos de reservas (archivo plano) ----
const DATA_FILE = path.join(__dirname, "bookings.json");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

// ---- Twilio ----
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const smsFrom    = process.env.TWILIO_FROM;   // +1XXXXXXXXXX (tu número de Twilio)
const adminPhone = process.env.ADMIN_PHONE;   // +1XXXXXXXXXX (tu celular)

let twilioClient = null;
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
} else {
  console.warn("⚠️ TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN faltan. SMS desactivado.");
}

// ---- Auth básica para el panel admin ----
function basicAuth(req, res, next) {
  const USER = process.env.ADMIN_USER;
  const PASS = process.env.ADMIN_PASS;
  if (!USER || !PASS) return res.status(500).send("ADMIN_USER/ADMIN_PASS no configurados.");
  const header = req.headers.authorization || "";
  const token = header.split(" ")[1] || "";
  const [u, p] = Buffer.from(token, "base64").toString().split(":");
  if (u === USER && p === PASS) return next();
  res.set("WWW-Authenticate", 'Basic realm="Bestride Admin"');
  return res.status(401).send("Authentication required");
}

// ---- Rutas de páginas ----
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", basicAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ---- API: crear reserva ----
app.post("/api/book", async (req, res) => {
  try {
    const b = req.body || {};
    const booking = {
      id: Date.now(),
      name: (b.name || "").trim(),
      origin: b.origin || b.from || "",
      destination: b.destination || b.to || "",
      phone: b.phone || "",
      date: b.date || "",
      time: b.time || "",
      status: "pending",
      createdAt: new Date().toISOString()
    };

    const list = JSON.parse(fs.readFileSync(DATA_FILE));
    list.push(booking);
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));

    // SMS al admin
    if (twilioClient && smsFrom && adminPhone) {
      try {
        await twilioClient.messages.create({
          body:
            `Nuevo viaje pendiente\n` +
            `Nombre: ${booking.name}\n` +
            `Origen: ${booking.origin}\n` +
            `Destino: ${booking.destination}\n` +
            `Tel: ${booking.phone}\n` +
            (booking.date ? `Fecha: ${booking.date}\n` : "") +
            (booking.time ? `Hora: ${booking.time}\n` : "") +
            `ID: ${booking.id}`,
          from: smsFrom,
          to: adminPhone,
        });
      } catch (e) {
        console.error("Twilio SMS error:", e.message);
      }
    } else {
      console.warn("⚠️ SMS no enviado (faltan credenciales o números).");
    }

    res.json({ ok: true, message: "Reserva enviada. ¡Gracias!", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Error al procesar la reserva" });
  }
});

// ---- API: listar reservas (admin) ----
app.get("/api/bookings", basicAuth, (_req, res) => {
  try {
    const list = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json(list);
  } catch {
    res.json([]);
  }
});

// ---- API: actualizar estado (admin) ----
app.post("/api/bookings/:id/status", basicAuth, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    const list = JSON.parse(fs.readFileSync(DATA_FILE));
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ ok: false, message: "Reserva no encontrada" });

    list[idx].status = status || list[idx].status;
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
    return res.json({ ok: true, booking: list[idx] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "Error al actualizar" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});


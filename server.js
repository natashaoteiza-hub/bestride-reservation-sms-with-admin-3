import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());
app.use(express.static("public"));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 💳 Tarifa
const RATE_PER_MILE = 0.90;   // 90 centavos por milla
const BASE_FEE = 2.00;        // tarifa base
const MIN_FARE = 5.00;        // mínimo total

// API Key de Google (úsala desde tu .env también para seguridad)
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Función para calcular distancia en millas usando Google Maps
async function getDistanceMiles(origin, destination) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_API_KEY}`;
  
  const res = await fetch(url);
  const data = await res.json();

  if (data.rows[0].elements[0].status === "OK") {
    const meters = data.rows[0].elements[0].distance.value;
    const miles = meters / 1609.34;
    return miles;
  } else {
    throw new Error("No se pudo calcular la distancia.");
  }
}

// 📌 Endpoint para crear reserva + pago
app.post("/api/bookings", async (req, res) => {
  try {
    const { name, origin, destination, phone, date, time } = req.body;

    // 1️⃣ Calcular distancia
    const miles = await getDistanceMiles(origin, destination);

    // 2️⃣ Calcular precio
    let price = (miles * RATE_PER_MILE) + BASE_FEE;
    if (price < MIN_FARE) price = MIN_FARE;

    // 3️⃣ Crear PaymentIntent en Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100), // en centavos
      currency: "usd",
      metadata: { name, origin, destination, phone, date, time }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      price: price.toFixed(2),
      miles: miles.toFixed(2)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

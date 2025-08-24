import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;

if (!accountSid || !authToken || !twilioPhone) {
  console.error("❌ Missing Twilio credentials in environment variables");
}

const client = twilio(accountSid, authToken);

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Reservations file
const bookingsFile = path.join(__dirname, "bookings.json");

// API: get all reservations
app.get("/api/bookings", (req, res) => {
  if (!fs.existsSync(bookingsFile)) {
    return res.json([]);
  }
  const data = fs.readFileSync(bookingsFile);
  res.json(JSON.parse(data));
});

// API: create new reservation
app.post("/api/bookings", async (req, res) => {
  try {
    const booking = req.body;

    let bookings = [];
    if (fs.existsSync(bookingsFile)) {
      const data = fs.readFileSync(bookingsFile);
      bookings = JSON.parse(data);
    }

    bookings.push(booking);
    fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));

    // Send SMS confirmation
    if (booking.phone && accountSid && authToken && twilioPhone) {
      await client.messages.create({
        body: `🚖 Your ride from ${booking.origin} to ${booking.destination} on ${booking.date} at ${booking.time} has been booked. Thank you for choosing Bestride Carolinas!`,
        from: twilioPhone,
        to: booking.phone,
      });
    }

    res.status(201).json({ message: "Booking created successfully" });
  } catch (err) {
    console.error("Error creating booking:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


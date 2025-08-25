// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import fs from "fs";
import dotenv from "dotenv";
import Twilio from "twilio";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const bookingsFile = path.join(__dirname, "bookings.json");

// Twilio setup
let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = new Twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve admin.html
app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Get all bookings
app.get("/api/bookings", (req, res) => {
  let bookings = [];
  if (fs.existsSync(bookingsFile)) {
    try {
      bookings = JSON.parse(fs.readFileSync(bookingsFile, "utf-8"));
    } catch (err) {
      console.error("Error reading bookings.json:", err);
    }
  }
  res.json(bookings);
});

// Add a new booking
app.post("/api/bookings", async (req, res) => {
  try {
    const { name, origin, destination, phone, date, time } = req.body;

    if (!name || !origin || !destination || !phone || !date || !time) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newBooking = { name, origin, destination, phone, date, time };

    let bookings = [];
    if (fs.existsSync(bookingsFile)) {
      try {
        bookings = JSON.parse(fs.readFileSync(bookingsFile, "utf-8"));
      } catch (err) {
        console.error("Error parsing bookings.json:", err);
      }
    }

    bookings.push(newBooking);
    fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));

    // Send SMS confirmation via Twilio
    if (twilioClient) {
      await twilioClient.messages.create({
        body: `Hi ${name}, your Bestride reservation from ${origin} to ${destination} on ${date} at ${time} has been confirmed!`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    }

    res.json({ success: true, booking: newBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

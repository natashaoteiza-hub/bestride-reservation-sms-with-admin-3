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

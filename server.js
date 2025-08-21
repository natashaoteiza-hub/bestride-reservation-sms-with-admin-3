const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

const bookingsFile = path.join(__dirname, 'data', 'bookings.json');

// Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Endpoint to create a booking
app.post('/api/book', (req, res) => {
  const { name, phone, pickup, dropoff, date, time } = req.body;
  if (!name || !phone || !pickup || !dropoff) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newBooking = { name, phone, pickup, dropoff, date, time, createdAt: new Date() };

  // Save booking to file
  let bookings = [];
  if (fs.existsSync(bookingsFile)) {
    bookings = JSON.parse(fs.readFileSync(bookingsFile));
  }
  bookings.push(newBooking);
  fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));

  // Send SMS notification
  client.messages
    .create({
      body: `Nueva reserva: ${name}, De: ${pickup} A: ${dropoff}, Tel: ${phone}`,
      from: process.env.TWILIO_FROM,
      to: process.env.ADMIN_PHONE
    })
    .then(() => console.log('SMS enviado'))
    .catch(err => console.error('Error enviando SMS:', err));

  res.json({ success: true, booking: newBooking });
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

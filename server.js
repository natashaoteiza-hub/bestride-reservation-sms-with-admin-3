import express from 'express';
import fs from 'fs';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const bookingsFile = path.join(__dirname, 'bookings.json');

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd'
    });
    res.send({clientSecret: paymentIntent.client_secret});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

app.post('/api/bookings', (req, res) => {
  const booking = req.body;
  let bookings = [];
  if (fs.existsSync(bookingsFile)) {
    bookings = JSON.parse(fs.readFileSync(bookingsFile));
  }
  bookings.push(booking);
  fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
  res.json({success:true});
});

app.get('/api/bookings', (req, res) => {
  let bookings = [];
  if (fs.existsSync(bookingsFile)) {
    bookings = JSON.parse(fs.readFileSync(bookingsFile));
  }
  res.json(bookings);
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


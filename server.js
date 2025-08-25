// Get all bookings
app.get("/reservations", (req, res) => {
  const bookings = fs.existsSync(bookingsFile) ? JSON.parse(fs.readFileSync(bookingsFile, "utf-8")) : [];
  res.json(bookings);
});

// Add a new booking
app.post("/reservations", async (req, res) => {
  try {
    const { name, origin, destination, phone, date, time } = req.body;
    if (!name || !origin || !destination || !phone || !date || !time) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newBooking = { name, origin, destination, phone, date, time };
    const bookings = fs.existsSync(bookingsFile) ? JSON.parse(fs.readFileSync(bookingsFile, "utf-8")) : [];
    bookings.push(newBooking);
    fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));

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

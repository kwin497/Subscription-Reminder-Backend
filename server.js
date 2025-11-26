const express = require("express");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// Load Firebase Admin credentials from Railway ENV
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Email transporter from ENV variables
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// CRON JOB: Runs every day at 8 AM
cron.schedule("30 18 * * *", async () => {
  console.log("⏰ Checking for upcoming renewals...");

  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  const usersSnapshot = await db.collection("users").get();

  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;

    const subSnapshot = await db.collection(`users/${uid}/subdata`).get();

    for (const subDoc of subSnapshot.docs) {
      const data = subDoc.data();

      if (!data.date || !data.email) continue;

      const renewalDate = new Date(data.date);

      if (renewalDate.toDateString() === tomorrow.toDateString()) {
        await transporter.sendMail({
          from: `"Suby Reminder" <${process.env.MAIL_USER}>`,
          to: data.email,
          subject: "Subscription Renewal Reminder",
          text: `Hi! Your subscription for ${data.name} renews on ${data.date}.`,
        });

        console.log(`📧 Sent reminder to ${data.email} for ${data.name}`);
      }
    }
  }
});

// Basic route to confirm server is running
app.get("/", (req, res) => {
  res.send("Backend is running.");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

});







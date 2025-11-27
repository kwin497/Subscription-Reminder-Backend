const express = require("express");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// CRON JOB: Runs every day at 
cron.schedule("55 19 * * *", async () => {
  console.log("⏰ Checking for upcoming renewals...");

  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  const usersSnapshot = await db.collection("users").get();
  // 1. ADD THIS LOG: Check how many users were retrieved
  console.log(`Found ${usersSnapshot.docs.length} users to check.`);

  for (const userDoc of usersSnapshot.docs) {
  const uid = userDoc.id;
  const userEmail = userDoc.data().email;  // <-- GET USER EMAIL

  // 2. ADD THIS LOG: Check if we are starting the loop
  console.log(`Processing user ID: ${uid} with email: ${userEmail}`);

  if (!userEmail) continue; // skip if user has no email

  const subSnapshot = await db.collection(`users/${uid}/subdata`).get();

  // 3. ADD THIS LOG: Check if we found any subscriptions
  console.log(`Found ${subSnapshot.docs.length} subscriptions for ${uid}.`);

  for (const subDoc of subSnapshot.docs) {
    const data = subDoc.data();

    if (!data.date) continue;

    const renewalDate = new Date(data.date);

    if (renewalDate.toDateString() === tomorrow.toDateString()) {
      await sgMail.send({
  to: userEmail,
  from: process.env.MAIL_USER, // must be a verified sender in SendGrid
  subject: "Subscription Renewal Reminder",
  text: `Hi! Your subscription for ${data.name} renews on ${data.date}.`,
});

      console.log(`📧 Sent reminder to ${userEmail} for ${data.name}`);
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


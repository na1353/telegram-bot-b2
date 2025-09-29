import TelegramBot from "node-telegram-bot-api";
import express from "express";
import B2 from "backblaze-b2";
import dotenv from "dotenv";

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// اتصال به Backblaze B2
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

// تولید لینک زمان‌دار
async function getSignedUrl(filename) {
  await b2.authorize();
  const bucketName = process.env.B2_BUCKET_NAME;

  // پیدا کردن bucketId
  const { data } = await b2.listBuckets();
  const bucket = data.buckets.find((b) => b.bucketName === bucketName);
  if (!bucket) throw new Error("Bucket not found!");

  // ساخت لینک زمان‌دار (اعتبار 2 دقیقه)
  const { data: urlData } = await b2.getDownloadAuthorization({
    bucketId: bucket.bucketId,
    fileNamePrefix: filename,
    validDurationInSeconds: 120,
  });

    // لینک دانلود رو بر اساس downloadUrl بساز
    const downloadUrl = auth.data.downloadUrl;
    const directLink = `${downloadUrl}/file/${bucketName}/${filename}?Authorization=${urlData.data.authorizationToken}`;

    return directLink;
}

// وقتی کاربر با لینک وارد ربات شود
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const filename = match[1]; // مثلاً video1.mp4

  try {
    const signedUrl = await getSignedUrl(filename);
    await bot.sendMessage(chatId, `📥 لینک دانلود آماده است:\n${signedUrl}`);
  } catch (error) {
    console.error("❌ خطا در گرفتن لینک:", error.message);
    await bot.sendMessage(chatId, "⚠️ خطا در ساخت لینک دانلود. لطفاً دوباره تلاش کنید.");
  }
});

// وقتی کاربر فقط /start بفرستد
bot.onText(/\/start$/, (msg) => {
  bot.sendMessage(msg.chat.id, "سلام! روی لینک‌های موجود در کانال کلیک کنید تا لینک دانلود بسازم. 📌");
});

// سرور کوچک برای زنده ماندن در Replit
const app = express();
app.get("/", (req, res) => res.send("Bot is running..."));
app.listen(3000, () => console.log("✅ Web server running on port 3000"));

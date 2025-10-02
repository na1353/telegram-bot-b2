import TelegramBot from "node-telegram-bot-api";
import express from "express";
import B2 from "backblaze-b2";
import dotenv from "dotenv";

dotenv.config();

// ساخت ربات تلگرام
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// اتصال به Backblaze B2
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

// تابع ساخت لینک زمان‌دار
async function getSignedUrl(filename) {
  // احراز هویت در B2
  await b2.authorize();

  const bucketName = process.env.B2_BUCKET_NAME;

  // پیدا کردن bucketId
  const { data } = await b2.listBuckets();
  const bucket = data.buckets.find((b) => b.bucketName === bucketName);
  if (!bucket) throw new Error("❌ Bucket not found!");

  // گرفتن authorization برای دانلود (اعتبار 120 ثانیه)
  const { data: urlData } = await b2.getDownloadAuthorization({
    bucketId: bucket.bucketId,
    fileNamePrefix: filename,
    validDurationInSeconds: 120,
  });

  // لینک مستقیم بر اساس downloadUrl
  const downloadUrl = b2.downloadUrl;
  const directLink = `${downloadUrl}/file/${bucketName}/${filename}?Authorization=${urlData.authorizationToken}`;

  return directLink;
}

// وقتی کاربر با لینک وارد ربات میشه (/start filename)
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const filename = match[1]; // مثلاً video1.mp4

  try {
    const signedUrl = await getSignedUrl(filename);
    await bot.sendMessage(chatId, `📥 لینک دانلود آماده است:\n${signedUrl}`);
  } catch (error) {
    console.error("❌ خطا در گرفتن لینک:", error.message);
    await bot.sendMessage(chatId, "⚠️ خطا در ساخت لینک دانلود. دوباره تلاش کنید.");
  }
});

// وقتی فقط /start زده میشه
bot.onText(/\/start$/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "سلام 👋\nبرای دریافت لینک دانلود روی لینک‌های کانال کلیک کنید."
  );
});

// یک وب‌سرور کوچک برای Replit
const app = express();
app.get("/", (req, res) => res.send("✅ Bot is running..."));
app.listen(3000, () => console.log("🌍 Web server running on port 3000"));

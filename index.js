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

// تابع ساخت لینک زمان‌دار
async function getSignedUrl(filename) {
  await b2.authorize();
  const bucketName = process.env.B2_BUCKET_NAME;

  // پیدا کردن bucketId
  const { data } = await b2.listBuckets();
  const bucket = data.buckets.find((b) => b.bucketName === bucketName);
  if (!bucket) throw new Error("Bucket not found!");

  // گرفتن توکن دانلود
  const { data: authData } = await b2.getDownloadAuthorization({
    bucketId: bucket.bucketId,
    fileNamePrefix: filename,
    validDurationInSeconds: 120, // 2 دقیقه
  });

  const downloadUrl = b2.downloadUrl; // بک‌بلِیز URL اصلی دانلود
  return `${downloadUrl}/file/${bucketName}/${filename}?Authorization=${authData.authorizationToken}`;
}

// وقتی کاربر روی لینک استارت با اسم فایل وارد بشه
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const filename = match[1];

  try {
    const signedUrl = await getSignedUrl(filename);
    await bot.sendMessage(chatId, "📥 لینک دانلود آماده است:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⬇️ دانلود فایل", url: signedUrl }
          ]
        ]
      }
    });
  } catch (err) {
    console.error("❌ خطا:", err.message);
    await bot.sendMessage(chatId, "⚠️ خطا در ساخت لینک. دوباره تلاش کنید.");
  }
});

// وقتی کاربر فقط /start بفرسته
bot.onText(/\/start$/, (msg) => {
  const chatId = msg.chat.id;

  // اینجا به کاربر دکمه شیشه‌ای میدیم که روش بزنه و فایل بگیره
  bot.sendMessage(chatId, "سلام! روی یکی از دکمه‌های زیر بزن:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📂 دریافت Snap36.jpg",
            url: "https://t.me/telbot_timed_bot?start=Snap36.jpg"
          }
        ]
      ]
    }
  });
});

// سرور کوچک برای Replit
const app = express();
app.get("/", (req, res) => res.send("Bot is running..."));
app.listen(5000, () => console.log("✅ Web server running on port 5000"));

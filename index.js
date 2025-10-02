import TelegramBot from "node-telegram-bot-api";
import express from "express";
import B2 from "backblaze-b2";
import dotenv from "dotenv";

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// اتصال به Backblaze
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

// ساخت لینک زمان‌دار
async function getSignedUrl(filename) {
  await b2.authorize();
  const bucketName = process.env.B2_BUCKET_NAME;

  // گرفتن bucketId
  const { data } = await b2.listBuckets();
  const bucket = data.buckets.find((b) => b.bucketName === bucketName);
  if (!bucket) throw new Error("Bucket not found!");

  // ساخت توکن دانلود موقت (۲ دقیقه)
  const { data: urlData } = await b2.getDownloadAuthorization({
    bucketId: bucket.bucketId,
    fileNamePrefix: filename,
    validDurationInSeconds: 120,
  });

  // لینک دانلود
  const downloadUrl = b2.downloadUrl;
  return `${downloadUrl}/file/${bucketName}/${filename}?Authorization=${urlData.authorizationToken}`;
}

// اگر کاربر با start + filename وارد بشه
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const param = match[1].trim(); // هرچی بعد start اومده

  if (!param) {
    await bot.sendMessage(
      chatId,
      "👋 سلام! برای دانلود فایل‌ها روی لینک‌های کانال کلیک کن."
    );
    return;
  }

  const filename = param; // مثل Snap36.jpg

  try {
    const signedUrl = await getSignedUrl(filename);
    await bot.sendMessage(chatId, `📥 لینک دانلود آماده است:\n${signedUrl}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
    await bot.sendMessage(chatId, "⚠️ خطا در ساخت لینک. لطفاً دوباره امتحان کنید.");
  }
});

// سرور برای Replit
const app = express();
app.get("/", (req, res) => res.send("Bot is running..."));
app.listen(5000, () => console.log("✅ Web server running on port 5000"));

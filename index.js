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

  // لینک زماندار بساز (اعتبار 2 دقیقه)
  const auth = await b2.getDownloadAuthorization({
    bucketId: bucket.bucketId,
    fileNamePrefix: filename,
    validDurationInSeconds: 120,
  });

  const downloadUrl = b2.downloadUrl; // آدرس دانلود اصلی
  const signedUrl = `${downloadUrl}/file/${bucketName}/${filename}?Authorization=${auth.data.authorizationToken}`;
  return signedUrl;
}

// هندل کردن /start
bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const filename = match[1]; // چیزی

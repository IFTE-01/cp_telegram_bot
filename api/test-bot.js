import { sendTestNotification } from "./services.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(400).json({
      success: false,
      error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env file."
    });
  }

  try {
    const success = await sendTestNotification();
    if (success) {
      return res.status(200).json({
        success: true,
        message: "Test message sent successfully to Telegram!"
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Failed to send message. Check if your Bot Token and Chat ID are correct."
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
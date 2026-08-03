import axios from "axios";

export async function sendTelegramReminder(contest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram bot token or chat ID is missing from environment variables.");
    return false;
  }

  const formattedTime = new Date(contest.startTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  const durationHrs = Math.floor(contest.duration / 3600);
  const durationMins = Math.floor((contest.duration % 3600) / 60);
  let durationStr = "";
  if (durationHrs > 0) durationStr += `${durationHrs} Hour${durationHrs > 1 ? "s" : ""} `;
  if (durationMins > 0) durationStr += `${durationMins} Minutes`;

  const message = `🏆 Contest: ${contest.contestName}

💻 Platform: ${contest.platform}

📅 Starting Time: ${formattedTime}

⏳ Duration: ${durationStr.trim()}

🔗 Link:
${contest.url}

🚨 Reminder: This contest starts in 24 hours.

Good Luck! 🚀`;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message,
      disable_web_page_preview: false
    });
    return true;
  } catch (err) {
    console.error("Failed to send Telegram message:", err.message);
    return false;
  }
}

// Test Notification Helper
export async function sendTestNotification() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return false;

  const testMessage = `🤖 CP Contest Reminder Bot Test

✅ Connection successful!
Your Telegram Bot is configured and ready to send contest reminders 24 hours before each event.

Happy Coding! 🚀`;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: testMessage
    });
    return true;
  } catch (err) {
    console.error("Telegram test error:", err.message);
    return false;
  }
}
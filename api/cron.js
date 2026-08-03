import axios from "axios";

// Read from Environment Variables
const CLIST_USERNAME = process.env.CLIST_USERNAME;
const CLIST_API_KEY = process.env.CLIST_API_KEY;

// Exact formatDateTimeBD logic (UTC + 6 hours)
function formatDateTimeBD(dt) {
  if (!dt) return "";
  const utcDate = new Date(dt);
  const bdDate = new Date(utcDate.getTime() + 6 * 60 * 60 * 1000);
  let h = bdDate.getHours();
  let m = bdDate.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";

  h = h % 12;
  if (h === 0) h = 12;

  m = m.toString().padStart(2, "0");

  const time12 = `${h}:${m} ${ampm}`;
  const day = bdDate.getDate();
  const month = bdDate.toLocaleString("en-US", { month: "short" });
  const year = bdDate.getFullYear();

  return `${day} ${month} ${year} - ${time12}`;
}

// Exact durationHM logic
function durationHM(x) {
  if (!x) return "0:00";
  x /= 60;
  let h, m;
  m = x % 60;
  x -= x % 60;
  h = x / 60;
  if (m !== 0) return h + ":" + m;
  else return h + ":00";
}

export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(400).json({ error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment." });
  }

  try {
    const url = `https://clist.by/api/v4/contest/?limit=800&username=${CLIST_USERNAME}&api_key=${CLIST_API_KEY}&order_by=-start`;
    const apiRes = await fetch(url);
    const data = await apiRes.json();
    const contestsRaw = data.objects || [];

    const nowMs = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    let sentCount = 0;

    for (const contest of contestsRaw) {
      const startMs = new Date(contest.start).getTime();
      const box = contest.event.toLowerCase();
      const href = contest.href.toLowerCase();

      const isTargetPlatform =
        href.includes("codeforces") ||
        box.includes("atcoder beginner") ||
        (href.includes("codechef") && box.includes("starter")) ||
        href.includes("leetcode");

      if (isTargetPlatform && startMs >= nowMs && startMs <= nowMs + twentyFourHoursMs) {
        let platform = "Other";
        if (href.includes("codeforces")) platform = "Codeforces";
        else if (href.includes("atcoder")) platform = "AtCoder";
        else if (href.includes("leetcode")) platform = "LeetCode";
        else if (href.includes("codechef")) platform = "CodeChef";

        const localStartingTime = formatDateTimeBD(contest.start);
        const durationFormatted = durationHM(contest.duration);

        const message = `🏆 Contest: ${contest.event}

💻 Platform: ${platform}

📅 Starting Time: ${localStartingTime}

⏳ Duration: ${durationFormatted}

🔗 Link:
${contest.href}

🚨 Reminder: This contest starts in 24 hours.

Good Luck! 🚀`;

        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: chatId,
          text: message,
          disable_web_page_preview: false
        });

        sentCount++;
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    return res.status(200).json({
      success: true,
      timestampBD: formatDateTimeBD(new Date().toISOString()),
      message: `Daily 10:30 PM BD check completed. Sent ${sentCount} contest reminders.`,
      contestsSent: sentCount
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
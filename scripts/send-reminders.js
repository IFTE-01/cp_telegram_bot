const axios = require('axios');

// Environment variables from GitHub Secrets
const CLIST_USERNAME = process.env.CLIST_USERNAME || 'ifte_';
const CLIST_API_KEY = process.env.CLIST_API_KEY || '633775f9b0697c2e405bcd4178ba504313313b14';

// Exact formatDateTimeBD logic
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
  if (m !== 0) return h + ":" + (m < 10 ? "0" + m : m);
  else return h + ":00";
}

async function run() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in GitHub Secrets.");
    process.exit(1);
  }

  const url = `https://clist.by/api/v4/contest/?limit=800&username=${CLIST_USERNAME}&api_key=${CLIST_API_KEY}&order_by=-start`;

  try {
    const res = await axios.get(url);
    const contestsRaw = res.data.objects || [];

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

      // Check if contest starts between 6:00 AM today and 6:00 AM tomorrow (next 24 hours)
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

        console.log(`✅ Sent reminder for: ${contest.event}`);
        sentCount++;
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    console.log(`🎉 Completed 6:00 AM check! Total reminders sent: ${sentCount}`);
  } catch (err) {
    console.error("❌ Error running script:", err.message);
    process.exit(1);
  }
}

run();
const CLIST_USERNAME = process.env.CLIST_USERNAME;
const CLIST_API_KEY = process.env.CLIST_API_KEY;
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

console.log("🔍 Checking Environment Variables / Secrets...");
let missing = false;
if (!token) { console.error("❌ TELEGRAM_BOT_TOKEN is missing in Secrets!"); missing = true; }
if (!chatId) { console.error("❌ TELEGRAM_CHAT_ID is missing in Secrets!"); missing = true; }
if (!CLIST_USERNAME) { console.error("❌ CLIST_USERNAME is missing in Secrets!"); missing = true; }
if (!CLIST_API_KEY) { console.error("❌ CLIST_API_KEY is missing in Secrets!"); missing = true; }

if (missing) {
  process.exit(1);
}

function formatDateTimeBD(dt) {
  if (!dt) return "";
  const utcDate = new Date(dt);
  const bdDate = new Date(utcDate.getTime() + 6 * 60 * 60 * 1000);
  let h = bdDate.getUTCHours();
  let m = bdDate.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";

  h = h % 12;
  if (h === 0) h = 12;

  m = m.toString().padStart(2, "0");

  const time12 = `${h}:${m} ${ampm}`;
  const day = bdDate.getUTCDate();
  const month = bdDate.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = bdDate.getUTCFullYear();

  return `${day} ${month} ${year} - ${time12}`;
}

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
  const url = `https://clist.by/api/v4/contest/?limit=800&username=${CLIST_USERNAME.trim()}&api_key=${CLIST_API_KEY.trim()}&order_by=-start`;
  
  console.log("🌐 Fetching contests from CList API v4...");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!res.ok) {
      throw new Error(`CList API returned HTTP status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const contestsRaw = data.objects || [];
    console.log(`📊 Total contests returned from CList: ${contestsRaw.length}`);

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

        const tgUrl = `https://api.telegram.org/bot${token.trim()}/sendMessage`;
        const tgRes = await fetch(tgUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId.trim(),
            text: message,
            disable_web_page_preview: false
          })
        });

        const tgData = await tgRes.json();
        if (tgRes.ok && tgData.ok) {
          console.log(`✅ Sent reminder for: ${contest.event}`);
          sentCount++;
        } else {
          console.error(`❌ Telegram Error for ${contest.event}:`, tgData.description || "Unknown error");
        }

        await new Promise((r) => setTimeout(r, 400));
      }
    }

    console.log(`🎉 Completed! Total reminders sent to Telegram: ${sentCount}`);
  } catch (err) {
    console.error("❌ Execution Error:", err.message);
    process.exit(1);
  }
}

run();
import React, { useState, useEffect } from "react";
import { Trophy, Search, Activity, Clock, ExternalLink, Calendar, Bell, Send, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";

// Read from Vite Environment Variables
const CLIST_USERNAME = import.meta.env.VITE_CLIST_USERNAME;
const CLIST_API_KEY = import.meta.env.VITE_CLIST_API_KEY;



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

function durationHM(x) {
    if (!x) return "0:00";
    x /= 60;
    let h, m;
    
    m = x % 60;
    x -= (x % 60);
    h = x / 60; 
    if (m !== 0) return h + ':' + m;
    else return h + ":00";
}

async function fetchCListContests() {
  const url = `https://clist.by/api/v4/contest/?limit=800&username=${CLIST_USERNAME}&api_key=${CLIST_API_KEY}&order_by=-start`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("CList API response error");

    const data = await res.json();
    const contestsRaw = data.objects || [];
    const now = new Date();
    const contests = [];

    contestsRaw.forEach((contest) => {
      const box = contest.event.toLowerCase();
      const href = contest.href.toLowerCase();
      const startDate = new Date(contest.start);

      const isUpcoming = startDate >= now;
      const isTargetPlatform =
        href.includes("codeforces") ||
        box.includes("atcoder beginner") ||
        (href.includes("codechef") && box.includes("starter")) ||
        href.includes("leetcode");

      if (isUpcoming && isTargetPlatform) {
        let platform = "Other";
        if (href.includes("codeforces")) platform = "Codeforces";
        else if (href.includes("atcoder")) platform = "AtCoder";
        else if (href.includes("leetcode")) platform = "LeetCode";
        else if (href.includes("codechef")) platform = "CodeChef";

        contests.push({
          id: `clist-${contest.id}`,
          platform: platform,
          contestName: contest.event,
          startTimeUtc: contest.start,
          duration: contest.duration,
          url: contest.href,
          status: "Upcoming"
        });
      }
    });

    contests.sort((a, b) => new Date(a.startTimeUtc) - new Date(b.startTimeUtc));
    return contests.length > 0 ? contests : MOCK_FALLBACK;
  } catch (err) {
    console.warn("Failed to fetch CList API, using fallback:", err);
    return MOCK_FALLBACK;
  }
}

function buildTelegramMessage(contest) {
  const localStartingTime = formatDateTimeBD(contest.startTimeUtc || contest.start);
  const durationFormatted = durationHM(contest.duration);

  return `🏆 Contest: ${contest.contestName}

💻 Platform: ${contest.platform}

📅 Starting Time: ${localStartingTime}

⏳ Duration: ${durationFormatted}

🔗 Link:
${contest.url}

🚨 Reminder: This contest starts in 24 hours.

Good Luck! 🚀`;
}

function downloadICS(contest) {
  const time = contest.startTimeUtc || contest.start;
  const start = new Date(time).toISOString().replace(/-|:|\.\d+/g, "");
  const end = new Date(new Date(time).getTime() + contest.duration * 1000).toISOString().replace(/-|:|\.\d+/g, "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `SUMMARY:🏆 ${contest.platform}: ${contest.contestName}`, `DESCRIPTION:Link: ${contest.url}`, `URL:${contest.url}`, `DTSTART:${start}`, `DTEND:${end}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${contest.contestName.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function Countdown({ startTimeUtc }) {
  const [timeLeft, setTimeLeft] = useState(calc());

  function calc() {
    const diff = new Date(startTimeUtc).getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, isLive: true };
    return {
      d: Math.floor(diff / (1000 * 60 * 60 * 24)),
      h: Math.floor((diff / (1000 * 60 * 60)) % 24),
      m: Math.floor((diff / 1000 / 60) % 60),
      s: Math.floor((diff / 1000) % 60),
      isLive: false
    };
  }

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(t);
  }, [startTimeUtc]);

  if (timeLeft.isLive) return null;

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Starts In</div>
      <div className="grid grid-cols-4 gap-1 text-slate-200 font-mono text-sm font-bold">
        <div>{String(timeLeft.d).padStart(2, "0")}<span className="text-[10px] text-slate-500 block font-sans">d</span></div>
        <div>{String(timeLeft.h).padStart(2, "0")}<span className="text-[10px] text-slate-500 block font-sans">h</span></div>
        <div>{String(timeLeft.m).padStart(2, "0")}<span className="text-[10px] text-slate-500 block font-sans">m</span></div>
        <div>{String(timeLeft.s).padStart(2, "0")}<span className="text-[10px] text-slate-500 block font-sans">s</span></div>
      </div>
    </div>
  );
}

const BADGE_COLORS = {
  Codeforces: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  LeetCode: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  CodeChef: "border-amber-700/30 bg-amber-700/10 text-amber-500",
  AtCoder: "border-purple-500/30 bg-purple-500/10 text-purple-400"
};

export default function App() {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("All");
  const [contests, setContests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [toast, setToast] = useState(null);

  const loadContests = async () => {
    setIsLoading(true);
    const data = await fetchCListContests();
    setContests(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadContests();
  }, []);

  const filtered = contests.filter((c) => {
    const matchSearch = c.contestName.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platform === "All" || c.platform.toLowerCase() === platform.toLowerCase();
    return matchSearch && matchPlatform;
  });

  const handleTestBot = async () => {
    let botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    let chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

    if (!botToken) botToken = prompt("Enter your TELEGRAM_BOT_TOKEN:");
    if (!chatId) chatId = prompt("Enter your TELEGRAM_CHAT_ID:");

    if (!botToken || !chatId) {
      setToast({ type: "error", text: "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required." });
      return;
    }

    if (filtered.length === 0) {
      setToast({ type: "error", text: "No contests visible on screen to send." });
      return;
    }

    setIsTestingBot(true);
    setToast(null);

    let sentCount = 0;

    try {
      for (const contest of filtered) {
        const text = encodeURIComponent(buildTelegramMessage(contest));
        const url = `https://api.telegram.org/bot${botToken.trim()}/sendMessage?chat_id=${chatId.trim()}&text=${text}`;
        
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok && data.ok) {
          sentCount++;
        }
        
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setToast({
        type: "success",
        text: `🚀 Sent ${sentCount} formatted contest reminders to Telegram!`
      });
    } catch (err) {
      setToast({ type: "error", text: "❌ Connection error sending messages to Telegram." });
    } finally {
      setIsTestingBot(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">CP Contest Reminder</h1>
              <p className="text-xs text-slate-400">Powered by CList.by API & Telegram Bot</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadContests}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition"
              title="Refresh CList API Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            </button>

            <button
              onClick={handleTestBot}
              disabled={isTestingBot || isLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              {isTestingBot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isTestingBot ? "Sending Reminders..." : "Test Bot (Send All)"}</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>CList.by API Connected</span>
            </div>
          </div>
        </div>
      </header>

      {toast && (
        <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-4">
          <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
            toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{toast.text}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1"><span className="text-xs">Total Contests</span><Activity className="w-4 h-4 text-indigo-400" /></div>
            <div className="text-2xl font-bold">{contests.length}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1"><span className="text-xs">Upcoming</span><Clock className="w-4 h-4 text-amber-400" /></div>
            <div className="text-2xl font-bold text-amber-400">{contests.filter(c => c.status === "Upcoming").length}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1"><span className="text-xs">Live Now</span><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span></div>
            <div className="text-2xl font-bold text-emerald-400">{contests.filter(c => c.status === "Live").length}</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search CList contests..." className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 outline-none" />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {["All", "Codeforces", "LeetCode", "CodeChef", "AtCoder"].map((p) => (
              <button key={p} onClick={() => setPlatform(p)} className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${platform === p ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-900 text-slate-400 border-slate-800"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-400">Fetching live contests from CList.by API (username: ifte_)...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((c) => (
              <div key={c.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${BADGE_COLORS[c.platform] || "text-slate-400"}`}>{c.platform}</span>
                    {c.status === "Live" ? (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Now
                      </span>
                    ) : (
                      <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                        <Bell className="w-3 h-3" /> 24h Alert Set
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-100 mb-3 line-clamp-2">{c.contestName}</h3>
                  <div className="space-y-1 text-xs text-slate-400 mb-4">
                    <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {formatDateTimeBD(c.startTimeUtc)}</div>
                    <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-slate-500" /> Duration: {durationHM(c.duration)}</div>
                  </div>
                </div>
                {c.status !== "Live" && <Countdown startTimeUtc={c.startTimeUtc} />}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2 rounded-xl">
                    Join Contest <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => downloadICS(c)} title="Export Calendar (.ics)" className="p-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-700">
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
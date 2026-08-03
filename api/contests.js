export default async function handler(req, res) {
  const contests = [
    {
      id: "lc-bw-188",
      platform: "LeetCode",
      contestName: "Biweekly Contest 188",
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 91800000).toISOString(),
      duration: 5400,
      url: "https://leetcode.com/contest/biweekly-contest-188",
      status: "Upcoming",
      reminderSent: false
    },
    {
      id: "cf-999-div2",
      platform: "Codeforces",
      contestName: "Codeforces Round 999 (Div. 2)",
      startTime: new Date(Date.now() + 172800000).toISOString(),
      endTime: new Date(Date.now() + 180000000).toISOString(),
      duration: 7200,
      url: "https://codeforces.com/contests",
      status: "Upcoming",
      reminderSent: false
    },
    {
      id: "cc-starters-170",
      platform: "CodeChef",
      contestName: "Starters 170 (Rated till 6-Stars)",
      startTime: new Date(Date.now() - 1800000).toISOString(),
      endTime: new Date(Date.now() + 5400000).toISOString(),
      duration: 7200,
      url: "https://www.codechef.com/contests",
      status: "Live",
      reminderSent: true
    },
    {
      id: "ac-abc-390",
      platform: "AtCoder",
      contestName: "AtCoder Beginner Contest 390",
      startTime: new Date(Date.now() + 432000000).toISOString(),
      endTime: new Date(Date.now() + 438000000).toISOString(),
      duration: 6000,
      url: "https://atcoder.jp/contests/",
      status: "Upcoming",
      reminderSent: false
    }
  ];

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
  res.status(200).json(contests);
}
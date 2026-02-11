import { useState, useEffect } from "react";
import { BarChart3, Users, MessageSquare, TrendingUp, ArrowLeft, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface PollRow {
  id: string;
  chat_id: number;
  sender_username: string | null;
  vote: string | null;
  created_at: string;
}

const CHART_COLORS = [
  "hsl(142 70% 45%)",
  "hsl(217 91% 60%)",
  "hsl(38 92% 50%)",
  "hsl(0 72% 51%)",
  "hsl(280 65% 55%)",
  "hsl(190 80% 45%)",
];

const VOTE_LABELS: Record<string, string> = {
  cto: "CTO",
  volume: "Volume",
  good_dev: "Good Dev",
  gamble: "Gamble",
  alpha: "Alpha",
};

const Dashboard = () => {
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolls = async () => {
      const { data } = await supabase
        .from("polls")
        .select("id, chat_id, sender_username, vote, created_at")
        .order("created_at", { ascending: true });
      setPolls(data || []);
      setLoading(false);
    };
    fetchPolls();
  }, []);

  const totalPolls = polls.length;
  const votedPolls = polls.filter((p) => p.vote).length;
  const openPolls = totalPolls - votedPolls;
  const uniqueGroups = new Set(polls.map((p) => p.chat_id)).size;

  // Daily activity (last 30 days)
  const dailyMap = new Map<string, number>();
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  polls.forEach((p) => {
    const day = p.created_at.slice(0, 10);
    if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
  });
  const dailyData = Array.from(dailyMap.entries()).map(([date, count]) => ({
    date: date.slice(5), // MM-DD
    polls: count,
  }));

  // Top users
  const userMap = new Map<string, number>();
  polls.forEach((p) => {
    const u = p.sender_username || "Unknown";
    userMap.set(u, (userMap.get(u) || 0) + 1);
  });
  const topUsers = Array.from(userMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name: name.length > 12 ? name.slice(0, 12) + "…" : name, polls: count }));

  // Vote breakdown
  const voteMap = new Map<string, number>();
  polls.forEach((p) => {
    if (!p.vote) return;
    p.vote.split(",").forEach((v) => {
      const label = VOTE_LABELS[v] || v;
      voteMap.set(label, (voteMap.get(label) || 0) + 1);
    });
  });
  const voteData = Array.from(voteMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Top groups
  const groupMap = new Map<number, number>();
  polls.forEach((p) => groupMap.set(p.chat_id, (groupMap.get(p.chat_id) || 0) + 1));
  const topGroups = Array.from(groupMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ name: `…${String(id).slice(-6)}`, polls: count }));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Activity className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">Bot Analytics</h1>
            <p className="text-xs text-muted-foreground">Usage stats & trends</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-6xl space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: BarChart3, label: "Total Polls", value: totalPolls, color: "text-primary" },
            { icon: TrendingUp, label: "Voted", value: votedPolls, color: "text-primary" },
            { icon: MessageSquare, label: "Open", value: openPolls, color: "text-muted-foreground" },
            { icon: Users, label: "Groups", value: uniqueGroups, color: "text-primary" },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-5 flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <div>
                  <p className="text-3xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Daily activity */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground text-base">Daily Activity (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="pollGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 70% 45%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(142 70% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(220 18% 8%)", border: "1px solid hsl(220 15% 16%)", borderRadius: 8, color: "hsl(210 20% 92%)" }}
                  />
                  <Area type="monotone" dataKey="polls" stroke="hsl(142 70% 45%)" fill="url(#pollGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top users */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground text-base">Top Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topUsers} layout="vertical">
                    <XAxis type="number" tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip
                      contentStyle={{ background: "hsl(220 18% 8%)", border: "1px solid hsl(220 15% 16%)", borderRadius: 8, color: "hsl(210 20% 92%)" }}
                    />
                    <Bar dataKey="polls" fill="hsl(142 70% 45%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Vote breakdown */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground text-base">Vote Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                {voteData.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No votes yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={voteData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {voteData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(220 18% 8%)", border: "1px solid hsl(220 15% 16%)", borderRadius: 8, color: "hsl(210 20% 92%)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top groups */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground text-base">Top Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topGroups}>
                  <XAxis dataKey="name" tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(220 18% 8%)", border: "1px solid hsl(220 15% 16%)", borderRadius: 8, color: "hsl(210 20% 92%)" }}
                  />
                  <Bar dataKey="polls" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;

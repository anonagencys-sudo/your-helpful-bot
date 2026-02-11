import { useState, useEffect } from "react";
import { Bot, Zap, CheckCircle, AlertCircle, Loader2, ExternalLink, BarChart3, Users, Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`;

const Index = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [affiliateCode, setAffiliateCode] = useState("");
  const [affiliateSaving, setAffiliateSaving] = useState(false);
  const [affiliateMsg, setAffiliateMsg] = useState("");

  useEffect(() => {
    supabase
      .from("bot_settings")
      .select("value")
      .eq("key", "affiliate_code")
      .single()
      .then(({ data }) => {
        if (data) setAffiliateCode(data.value);
      });
  }, []);

  const setWebhook = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${WEBHOOK_URL}?action=register`);
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
        setMessage("Webhook registered successfully!");
      } else {
        setStatus("error");
        setMessage(data.description || "Failed to set webhook");
      }
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
    }
  };

  const checkWebhook = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${WEBHOOK_URL}?action=status`);
      const data = await res.json();
      setWebhookInfo(data.result);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center glow-green">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Poll Affiliate Bot</h1>
              <p className="text-xs text-muted-foreground">Telegram · Solana · Jupiter</p>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
            Active
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold mb-3">
            <span className="text-gradient">Solana Poll Bot</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Detects contract addresses in Telegram groups, creates sentiment polls,
            and serves affiliate swap buttons via Jupiter.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: BarChart3, label: "Poll Options", value: "4" },
            { icon: Users, label: "Affiliate Links", value: "12" },
            { icon: Zap, label: "Latency", value: "<1s" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Setup */}
        <Card className="bg-card border-border/50 mb-6 glow-green">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Webhook Setup
            </CardTitle>
            <CardDescription>
              Register the webhook URL with your Telegram bot to start receiving updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
              <code className="text-sm text-muted-foreground truncate flex-1">
                {WEBHOOK_URL}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
                onClick={() => navigator.clipboard.writeText(WEBHOOK_URL)}
              >
                Copy
              </Button>
            </div>

            <div className="flex gap-3">
              <Button onClick={setWebhook} disabled={status === "loading"} className="flex-1">
                {status === "loading" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Register Webhook
              </Button>
              <Button variant="secondary" onClick={checkWebhook} disabled={status === "loading"}>
                Check Status
              </Button>
            </div>

            {status === "success" && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "hsl(142 70% 45%)" }}>
                <CheckCircle className="w-4 h-4" />
                {message}
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {message}
              </div>
            )}

            {webhookInfo && (
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">URL:</span>
                  <span className="text-foreground truncate max-w-[300px]">{webhookInfo.url || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending updates:</span>
                  <span className="text-foreground">{webhookInfo.pending_update_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last error:</span>
                  <span className="text-foreground">{webhookInfo.last_error_message || "None"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Affiliate Config */}
        <Card className="bg-card border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Affiliate Configuration
            </CardTitle>
            <CardDescription>
              Set the Jupiter referral code used in all swap buttons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                value={affiliateCode}
                onChange={(e) => setAffiliateCode(e.target.value)}
                placeholder="Enter your Jupiter affiliate/referral code"
                className="font-mono text-sm"
              />
              <Button
                variant="secondary"
                disabled={affiliateSaving}
                onClick={async () => {
                  setAffiliateSaving(true);
                  setAffiliateMsg("");
                  const { error } = await supabase
                    .from("bot_settings" as any)
                    .update({ value: affiliateCode, updated_at: new Date().toISOString() } as any)
                    .eq("key", "affiliate_code");
                  if (error) {
                    setAffiliateMsg("Error: " + error.message);
                  } else {
                    setAffiliateMsg("Saved!");
                  }
                  setAffiliateSaving(false);
                }}
              >
                {affiliateSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </Button>
            </div>
            {affiliateMsg && (
              <p className={`text-sm ${affiliateMsg.startsWith("Error") ? "text-destructive" : "text-primary"}`}>
                {affiliateMsg}
              </p>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { step: "1", title: "CA Detected", desc: "Bot detects a Solana contract address (32-44 base58 chars) in the group chat." },
                { step: "2", title: "Poll Created", desc: "A sentiment poll appears with options: Gamble, Volume, CTO, I Love It. Only the CA sender can vote." },
                { step: "3", title: "Vote & Result", desc: "After voting, the poll shows the result and 12 affiliate buy buttons via Jupiter." },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">{item.step}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-muted-foreground">
          <p>Powered by Jupiter Aggregator · Not financial advice</p>
        </div>
      </main>
    </div>
  );
};

export default Index;

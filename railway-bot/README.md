# Telegram Bot - Railway Deployment

## Deploy to Railway

1. **Create a new project** on [railway.app](https://railway.app)
2. **Connect this folder** as a GitHub repo or use `railway up` CLI
3. **Set environment variables** in Railway dashboard:

| Variable | Value |
|----------|-------|
| `TELEGRAM_BOT_TOKEN` | Your bot token from @BotFather |
| `SUPABASE_URL` | `https://zezelhkempjrojlkuqsy.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key (find in Lovable Cloud settings) |
| `WEBHOOK_URL` | Your Railway app URL (e.g., `https://your-app.up.railway.app`) |
| `PORT` | `3000` (Railway sets this automatically) |

4. **Register the webhook** after deployment:
   Visit `https://your-app.up.railway.app?action=register`

5. **Verify it works**:
   Visit `https://your-app.up.railway.app?action=status`

## Important Notes

- The bot connects to the same database as your Lovable project
- After deploying on Railway, you should disable the edge function webhook to avoid double-processing
- To disable the old webhook, just don't call the register action on the Lovable edge function

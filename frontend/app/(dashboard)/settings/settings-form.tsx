"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing, ShieldCheck } from "lucide-react";
import { updatePreferredPlatform } from "@/app/actions/settings";

interface SettingsFormProps {
  initialPlatform: string;
  discordConnected: boolean;
  telegramConnected: boolean;
}

export default function SettingsForm({ initialPlatform, discordConnected, telegramConnected }: SettingsFormProps) {
  const [saving, setSaving] = useState(false);
  const [preferredPlatform, setPreferredPlatform] = useState(initialPlatform);

  const handlePlatformChange = async (platform: string) => {
    setSaving(true);
    setPreferredPlatform(platform);
    
    try {
      const result = await updatePreferredPlatform(platform);
      if (!result.success) {
        console.error(result.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-indigo-500" />
          <CardTitle className="text-lg">Primary Notification Platform</CardTitle>
        </div>
        <CardDescription>
          Choose where your Guardian AI should send proactive reminders (like morning routines, habits, and evening check-ins).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div 
          onClick={() => handlePlatformChange("discord")}
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
            preferredPlatform === "discord" 
              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10" 
              : "border-slate-200 dark:border-slate-800 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#5865F2]/10 flex items-center justify-center text-[#5865F2]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Discord</h3>
              <p className="text-sm text-slate-500">Receive proactive messages in your Discord DMs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!discordConnected && (
              <span className="text-xs font-medium text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">Not Connected</span>
            )}
            {preferredPlatform === "discord" ? (
              <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700"></div>
            )}
          </div>
        </div>

        <div 
          onClick={() => handlePlatformChange("telegram")}
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
            preferredPlatform === "telegram" 
              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10" 
              : "border-slate-200 dark:border-slate-800 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Telegram</h3>
              <p className="text-sm text-slate-500">Receive proactive messages in your Telegram chat</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!telegramConnected && (
              <span className="text-xs font-medium text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">Not Connected</span>
            )}
            {preferredPlatform === "telegram" ? (
              <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700"></div>
            )}
          </div>
        </div>

        {saving && (
          <p className="text-xs text-slate-500 animate-pulse text-right">Saving preference...</p>
        )}
        
      </CardContent>
    </Card>
  );
}

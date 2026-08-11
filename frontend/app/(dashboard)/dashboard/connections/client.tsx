"use client";

import { MessageCircle, Mail, Brain, ArrowRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateDiscordConnectCode, disconnectDiscord } from "@/app/actions/discord";
import { generateTelegramConnectCode, disconnectTelegram } from "@/app/actions/telegram";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ConnectionsClient({ 
  isDiscordConnected, 
  isTelegramConnected
}: { 
  isDiscordConnected: boolean;
  isTelegramConnected: boolean;
}) {
  const router = useRouter();
  const [isDiscordDialogOpen, setIsDiscordDialogOpen] = useState(false);
  const [connectCode, setConnectCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState(false);
  const [telegramConnectCode, setTelegramConnectCode] = useState<string | null>(null);
  const [isGeneratingTelegram, setIsGeneratingTelegram] = useState(false);
  const [isDisconnectingTelegram, setIsDisconnectingTelegram] = useState(false);

  const handleConnectDiscord = async () => {
    setIsGenerating(true);
    setIsDiscordDialogOpen(true);
    try {
      const code = await generateDiscordConnectCode();
      setConnectCode(code);
    } catch (err) {
      toast.error("Failed to generate connect code");
    }
    setIsGenerating(false);
  };

  const handleDisconnectDiscord = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectDiscord();
      toast.success("Discord disconnected successfully");
      router.refresh();
    } catch (err) {
      toast.error("Failed to disconnect Discord");
    }
    setIsDisconnecting(false);
  };

  const handleConnectTelegram = async () => {
    setIsGeneratingTelegram(true);
    setIsTelegramDialogOpen(true);
    try {
      const code = await generateTelegramConnectCode();
      setTelegramConnectCode(code);
    } catch (err) {
      toast.error("Failed to generate connect code");
    }
    setIsGeneratingTelegram(false);
  };

  const handleDisconnectTelegram = async () => {
    setIsDisconnectingTelegram(true);
    try {
      await disconnectTelegram();
      toast.success("Telegram disconnected successfully");
      router.refresh();
    } catch (err) {
      toast.error("Failed to disconnect Telegram");
    }
    setIsDisconnectingTelegram(false);
  };

  const copyToClipboard = () => {
    if (connectCode) {
      navigator.clipboard.writeText(`!connect ${connectCode}`);
      toast.success("Copied to clipboard!");
    }
  };

  const copyTelegramCode = () => {
    if (telegramConnectCode) {
      navigator.clipboard.writeText(`!connect ${telegramConnectCode}`);
      toast.success("Copied to clipboard!");
    }
  };

  const connections = [
    {
      id: "telegram",
      name: "Telegram",
      icon: <MessageCircle className="w-8 h-8 text-[#0088cc]" />,
      color: "bg-[#0088cc]/10",
      description: "Chat with Guardian on Telegram for quick advice and check-ins.",
      status: isTelegramConnected ? "connected" : "disconnected",
      lastSync: isTelegramConnected ? "Just now" : null,
      onConnect: handleConnectTelegram,
      onDisconnect: handleDisconnectTelegram,
      isLoading: isDisconnectingTelegram || isGeneratingTelegram
    },
    {
      id: "discord",
      name: "Discord",
      icon: <MessageCircle className="w-8 h-8 text-[#5865F2]" />,
      color: "bg-[#5865F2]/10",
      description: "Integrate Guardian into your private DMs.",
      status: isDiscordConnected ? "connected" : "disconnected",
      onConnect: handleConnectDiscord,
      onDisconnect: handleDisconnectDiscord,
      isLoading: isDisconnecting
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Connections</h1>
        <p className="text-slate-500">Manage where and how Guardian communicates with you.</p>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800 flex flex-col md:flex-row items-center md:items-start gap-4">
        <div className="bg-indigo-100 dark:bg-indigo-800 p-3 rounded-xl shrink-0">
          <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">Powered by Caspian SDK</h3>
          <p className="text-indigo-800/80 dark:text-indigo-200/80 text-sm leading-relaxed">
            Guardian uses Caspian SDK to communicate seamlessly across all connected channels while maintaining one shared identity and one shared memory. No matter where you message, it&apos;s the same Guardian.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connections.map((conn) => (
          <Card key={conn.id} className="border-slate-200 dark:border-slate-800 flex flex-col h-full">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${conn.color}`}>
                  {conn.icon}
                </div>
                <div>
                  <CardTitle className="text-xl">{conn.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {conn.status === "connected" ? (
                      <span className="flex items-center text-emerald-600 dark:text-emerald-500 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                        Connected
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs font-medium">
                        Not connected
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {conn.description}
              </p>
              {conn.status === "connected" && conn.lastSync && (
                <div className="mt-4 flex items-center text-xs text-slate-500">
                  <span className="font-medium mr-1">Last sync:</span> {conn.lastSync}
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2 mt-auto">
              {conn.status === "connected" ? (
                <Button 
                  onClick={conn.onDisconnect} 
                  disabled={(isDisconnecting && conn.id === "discord") || conn.isLoading} 
                  variant="outline" 
                  className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 border-rose-200 dark:border-rose-900/50"
                >
                  {conn.isLoading ? "Disconnecting..." : "Disconnect"}
                </Button>
              ) : (
                <Button 
                  onClick={conn.onConnect} 
                  disabled={conn.isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {conn.isLoading ? "Connecting..." : `Connect ${conn.name}`} 
                  {!conn.isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Discord Connect Dialog */}
      <Dialog open={isDiscordDialogOpen} onOpenChange={setIsDiscordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#5865F2]" />
              Connect Discord
            </DialogTitle>
            <DialogDescription>
              Because of Discord's security rules, you must share a server with Guardian AI before it can DM you.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-2 space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-lg text-sm border border-blue-100 dark:border-blue-900/50">
              <h4 className="font-bold mb-2">Step 1: Join the Official Server</h4>
              <p className="mb-3">Guardian AI cannot message you until you join its home server.</p>
              <Button 
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
                onClick={() => window.open(`https://discord.gg/y9Bd9Y2zGT`, '_blank')}
              >
                Join Guardian AI Server
              </Button>
            </div>

            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-sm mb-2 text-slate-800 dark:text-slate-200">Step 2: Send your Code</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Once inside the server, copy your code and click the button below to DM Guardian AI:
              </p>
              <div className="flex items-center justify-between bg-white dark:bg-black p-3 rounded-md border border-slate-200 dark:border-slate-800 mb-3">
                <code className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isGenerating ? "..." : `!connect ${connectCode}`}
                </code>
                <Button size="icon" variant="ghost" onClick={copyToClipboard} disabled={isGenerating}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button 
                variant="outline"
                className="w-full text-slate-700 dark:text-slate-300"
                onClick={() => window.open(`https://discord.com/users/${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1532718363867086878'}`, '_blank')}
              >
                Message Bot on Discord
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Telegram Connect Dialog */}
      <Dialog open={isTelegramDialogOpen} onOpenChange={setIsTelegramDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#0088cc]" />
              Connect Telegram
            </DialogTitle>
            <DialogDescription>
              Link Guardian AI to your Telegram account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-2 space-y-4">
            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-sm mb-2 text-slate-800 dark:text-slate-200">Send your Code</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Copy your code and click the button below to message Guardian AI on Telegram:
              </p>
              <div className="flex items-center justify-between bg-white dark:bg-black p-3 rounded-md border border-slate-200 dark:border-slate-800 mb-3">
                <code className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isGeneratingTelegram ? "..." : `!connect ${telegramConnectCode}`}
                </code>
                <Button size="icon" variant="ghost" onClick={copyTelegramCode} disabled={isGeneratingTelegram}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button 
                className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white"
                onClick={() => window.open(`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'Gaurdian_AI_bot'}`, '_blank')}
              >
                Message Bot on Telegram
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

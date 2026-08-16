"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Brain, MessageCircle, ArrowRight, Check, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { generateDiscordConnectCode, checkDiscordConnection } from "@/app/actions/discord";
import { generateTelegramConnectCode, checkTelegramConnection } from "@/app/actions/telegram";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [motivationStyle, setMotivationStyle] = useState("");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [fullyConnectedPlatforms, setFullyConnectedPlatforms] = useState<string[]>([]);

  // Dialog States
  const [isDiscordDialogOpen, setIsDiscordDialogOpen] = useState(false);
  const [connectCode, setConnectCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState(false);
  const [telegramConnectCode, setTelegramConnectCode] = useState<string | null>(null);
  const [isGeneratingTelegram, setIsGeneratingTelegram] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDiscordDialogOpen) {
      interval = setInterval(async () => {
        const isConnected = await checkDiscordConnection();
        if (isConnected) {
          setIsDiscordDialogOpen(false);
          toast.success("Discord Connected successfully!");
          setFullyConnectedPlatforms(prev => Array.from(new Set([...prev, "discord"])));
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isDiscordDialogOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTelegramDialogOpen) {
      interval = setInterval(async () => {
        const isConnected = await checkTelegramConnection();
        if (isConnected) {
          setIsTelegramDialogOpen(false);
          toast.success("Telegram Connected successfully!");
          setFullyConnectedPlatforms(prev => Array.from(new Set([...prev, "telegram"])));
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isTelegramDialogOpen]);

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setIsLoading(true);
      try {
        const res = await fetch("/api/user/complete-onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            timezone,
            occupation,
            motivationStyle,
            platforms: connectedPlatforms,
          }),
        });
        if (res.ok) {
          // Force a hard navigation to clear all Next.js client-side router caches 
          window.location.href = "/dashboard";
        } else {
          console.error("Failed to complete onboarding");
          setIsLoading(false);
        }
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    if (step === 1) return name.trim() !== "" && timezone !== "" && occupation !== "";
    if (step === 2) return motivationStyle !== "";
    return true; 
  };

  const handleConnectDiscord = async () => {
    setIsGenerating(true);
    setIsDiscordDialogOpen(true);
    try {
      const code = await generateDiscordConnectCode();
      setConnectCode(code);
      if (!connectedPlatforms.includes("discord")) {
        setConnectedPlatforms(prev => [...prev, "discord"]);
      }
    } catch (err) {
      toast.error("Failed to generate connect code");
    }
    setIsGenerating(false);
  };

  const handleConnectTelegram = async () => {
    setIsGeneratingTelegram(true);
    setIsTelegramDialogOpen(true);
    try {
      const code = await generateTelegramConnectCode();
      setTelegramConnectCode(code);
      if (!connectedPlatforms.includes("telegram")) {
        setConnectedPlatforms(prev => [...prev, "telegram"]);
      }
    } catch (err) {
      toast.error("Failed to generate connect code");
    }
    setIsGeneratingTelegram(false);
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

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-center mb-8 gap-2">
        <Brain className="h-8 w-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome to Guardian</h1>
      </div>

      <div className="flex justify-between items-center mb-8 px-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step >= s ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
            }`}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div className={`h-1 w-16 sm:w-32 mx-2 rounded-full transition-colors ${
                step > s ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
              }`} />
            )}
          </div>
        ))}
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 1 && (
              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Basic Information</h2>
                  <p className="text-slate-500 dark:text-slate-400">Let&apos;s start with the basics so Guardian knows who it&apos;s talking to.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Preferred Name</Label>
                    <Input 
                      id="name" 
                      placeholder="How should Guardian call you?" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={(val) => setTimezone(val || "Asia/Kolkata")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your timezone" />
                      </SelectTrigger>
                      <SelectContent  className="max-h-[250px]">
                        <SelectItem value="pst">Pacific Time (US & Canada)</SelectItem>
                        <SelectItem value="est">Eastern Time (US & Canada)</SelectItem>
                        <SelectItem value="brt">Brasília Time (BRT)</SelectItem>
                        <SelectItem value="utc">Coordinated Universal Time (UTC)</SelectItem>
                        <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
                        <SelectItem value="cet">Central European Time (CET)</SelectItem>
                        <SelectItem value="ist">Indian Standard Time (IST)</SelectItem>
                        <SelectItem value="ast">Arabia Standard Time (AST)</SelectItem>
                        <SelectItem value="sgt">Singapore Time (SGT)</SelectItem>
                        <SelectItem value="jst">Japan Standard Time (JST)</SelectItem>
                        <SelectItem value="aest">Australian Eastern Standard Time (AEST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupation">Current Status / Occupation</Label>
                    <Select value={occupation} onValueChange={(val) => setOccupation(val || "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="What do you do?" />
                      </SelectTrigger>
                      <SelectContent >
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Motivation Style</h2>
                  <p className="text-slate-500 dark:text-slate-400">How would you like Guardian to interact with you?</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: "logical", title: "Logical & Direct", desc: "Focuses on facts, plans, and straight answers." },
                    { id: "friendly", title: "Supportive Friend", desc: "Warm, encouraging, and highly empathetic." },
                    { id: "stoic", title: "Stoic Philosopher", desc: "Calm, objective, focusing on what you can control." },
                    { id: "coach", title: "Strict Coach", desc: "No excuses. Pushes you hard to meet your targets." },
                  ].map((style, i) => (
                    <div 
                      key={i} 
                      onClick={() => setMotivationStyle(style.id)}
                      className={`border p-4 rounded-xl cursor-pointer hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all relative ${motivationStyle === style.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                    >
                      <input 
                        type="radio" 
                        name="style" 
                        id={`style-${i}`} 
                        className="absolute top-4 right-4 text-indigo-600 accent-indigo-600" 
                        checked={motivationStyle === style.id}
                        readOnly
                      />
                      <Label htmlFor={`style-${i}`} className="cursor-pointer block">
                        <div className="font-semibold text-lg mb-1">{style.title}</div>
                        <div className="text-sm text-slate-500">{style.desc}</div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Connect Platforms</h2>
                  <p className="text-slate-500 dark:text-slate-400">Link your channels. Guardian uses Caspian SDK to sync memory across all of them.</p>
                </div>
                <div className="space-y-3">
                  {[
                    { id: "telegram", name: "Telegram", icon: <MessageCircle className="h-5 w-5" />, color: "text-[#0088cc]", bg: "bg-[#0088cc]/10", onClick: handleConnectTelegram },
                    { id: "discord", name: "Discord", icon: <MessageCircle className="h-5 w-5" />, color: "text-[#5865F2]", bg: "bg-[#5865F2]/10", onClick: handleConnectDiscord },
                  ].map((platform, i) => {
                    const isInitiated = connectedPlatforms.includes(platform.id);
                    const isFullyConnected = fullyConnectedPlatforms.includes(platform.id);
                    
                    return (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${platform.bg} ${platform.color}`}>
                          {platform.icon}
                        </div>
                        <div>
                          <div className="font-medium">{platform.name}</div>
                          <div className="text-xs text-slate-500">
                            {isFullyConnected ? (
                              <span className="text-emerald-600 font-medium">Connected</span>
                            ) : isInitiated ? (
                              'Setup Initiated'
                            ) : (
                              'Not connected'
                            )}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant={isInitiated || isFullyConnected ? "outline" : "default"} 
                        size="sm" 
                        className={!isInitiated && !isFullyConnected ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                        onClick={platform.onClick}
                        disabled={isFullyConnected}
                      >
                        {isFullyConnected ? "Connected" : isInitiated ? "View Code" : "Connect"}
                      </Button>
                    </div>
                  )})}
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl flex items-start gap-3">
                  <div className="bg-indigo-100 dark:bg-indigo-800 p-1.5 rounded-md mt-0.5">
                    <Brain className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    You can always connect more platforms later in the dashboard.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          <Button variant="ghost" onClick={handleBack} disabled={step === 1 || isLoading}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={isLoading || !canProceed()} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing...</>
            ) : step === 3 ? (
              "Complete Setup"
            ) : (
              <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </Card>

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


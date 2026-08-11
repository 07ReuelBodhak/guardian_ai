"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, Brain, Activity, Shield, Link as LinkIcon, 
  MessageCircle, Mail, Goal, Calendar, Clock, LayoutGrid
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center w-full overflow-hidden">
      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-4 pt-8 pb-16 md:pt-12 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-4 px-4 py-1.5 rounded-full text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400">
                Powered by Caspian SDK
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              One Brain. <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">
                Every Channel.
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Guardian AI isn&apos;t trapped inside a single chat window. It remembers you across Telegram, Discord, and Email using Caspian SDK, giving you one shared memory, one identity and one intelligent companion wherever you talk.
            </motion.p>

            <motion.div 
              className="flex flex-wrap justify-center lg:justify-start items-center gap-3 mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <Badge variant="outline" className="px-3 py-1.5 text-sm bg-white dark:bg-slate-900 shadow-sm font-medium border-slate-200 dark:border-slate-800">🧠 One Shared Memory</Badge>
              <Badge variant="outline" className="px-3 py-1.5 text-sm bg-white dark:bg-slate-900 shadow-sm font-medium border-slate-200 dark:border-slate-800">🔗 Cross-Platform Identity</Badge>
              <Badge variant="outline" className="px-3 py-1.5 text-sm bg-white dark:bg-slate-900 shadow-sm font-medium border-slate-200 dark:border-slate-800">⚡ Powered by Caspian SDK</Badge>
            </motion.div>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-full px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#demo" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 bg-white dark:bg-slate-900">
                  View Demo
                </Button>
              </Link>
            </motion.div>
          </div>

          <motion.div 
            className="w-full relative mt-16 lg:mt-0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 dark:from-indigo-900/40 dark:to-violet-900/40 rounded-full blur-3xl -z-10"></div>
            
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Center Brain */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20">
                <motion.div 
                  className="w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-[2px] shadow-2xl shadow-indigo-500/30"
                  animate={{ 
                    boxShadow: ["0px 0px 20px 0px rgba(99,102,241,0.4)", "0px 0px 40px 10px rgba(99,102,241,0.6)", "0px 0px 20px 0px rgba(99,102,241,0.4)"] 
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="w-full h-full rounded-[22px] bg-slate-900 flex flex-col items-center justify-center p-4">
                     <Brain className="w-10 h-10 text-white mb-2" />
                     <span className="text-white font-bold text-xs text-center leading-tight">Guardian AI</span>
                  </div>
                </motion.div>
              </div>

              {/* Floating Legend */}
              <div className="absolute bottom-[5%] right-0 flex flex-col gap-3 items-start z-20">
                <Badge variant="secondary" className="bg-indigo-50/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] px-2 py-0.5 shadow-sm backdrop-blur-md">Shared Memory</Badge>
                <Badge variant="secondary" className="bg-violet-50/80 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 text-[10px] px-2 py-0.5 shadow-sm backdrop-blur-md">One Identity</Badge>
                <Badge variant="secondary" className="bg-blue-50/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] px-2 py-0.5 shadow-sm backdrop-blur-md">Multi-Agent AI</Badge>
              </div>

              {/* Orbital connections */}
              <div className="absolute inset-0 rounded-full border border-slate-200 dark:border-slate-800/60 border-dashed animate-[spin_60s_linear_infinite] opacity-50 z-0"></div>
              <div className="absolute inset-8 rounded-full border border-indigo-200 dark:border-indigo-800/40 opacity-50 z-0"></div>

              {/* Platform Nodes */}
              {/* Telegram */}
              <motion.div 
                className="absolute top-[10%] left-[10%] w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 z-10"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0 }}
              >
                <MessageCircle className="w-6 h-6 text-[#0088cc]" />
                <span className="absolute -bottom-6 text-[10px] font-medium text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">Telegram</span>
              </motion.div>

              {/* Discord */}
              <motion.div 
                className="absolute top-[10%] right-[10%] w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 z-10"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <MessageCircle className="w-6 h-6 text-[#5865F2]" />
                <span className="absolute -bottom-6 text-[10px] font-medium text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">Discord</span>
              </motion.div>

              {/* Email */}
              <motion.div 
                className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 z-10"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <Mail className="w-6 h-6 text-rose-500" />
                <span className="absolute -bottom-6 text-[10px] font-medium text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-800">Email</span>
              </motion.div>
              
              {/* Connection Lines */}
              <svg className="absolute inset-0 w-full h-full z-0 opacity-20 dark:opacity-40 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4">
                <motion.line x1="15%" y1="15%" x2="50%" y2="50%" animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                <motion.line x1="85%" y1="15%" x2="50%" y2="50%" animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                <motion.line x1="50%" y1="90%" x2="50%" y2="50%" animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm hover:shadow-md transition-shadow">
             <CardContent className="p-6">
                <Brain className="w-8 h-8 text-indigo-600 mb-4" />
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">One Shared Memory</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Start a conversation on Telegram and continue it on Discord without losing context.</p>
             </CardContent>
           </Card>
           <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm hover:shadow-md transition-shadow">
             <CardContent className="p-6">
                <LinkIcon className="w-8 h-8 text-indigo-600 mb-4" />
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Cross-Platform Identity</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Connect all your communication platforms into one Guardian profile.</p>
             </CardContent>
           </Card>
           <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm hover:shadow-md transition-shadow">
             <CardContent className="p-6">
                <Activity className="w-8 h-8 text-indigo-600 mb-4" />
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Multi-Agent Intelligence</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Specialized AI agents work together to understand your goals, emotions and routines.</p>
             </CardContent>
           </Card>
           <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm hover:shadow-md transition-shadow">
             <CardContent className="p-6">
                <Shield className="w-8 h-8 text-indigo-600 mb-4" />
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Powered by Caspian SDK</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">One handler. Multiple communication channels. No duplicated logic.</p>
             </CardContent>
           </Card>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="w-full max-w-3xl mx-auto px-4 py-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"></div>
          
          <div className="flex flex-col gap-10 relative z-10">
            {/* Telegram Block */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc]">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Telegram</span>
              </div>
              <div className="flex flex-col gap-4 text-sm">
                <div className="self-end bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[85%] shadow-sm">
                  Tomorrow I have my Math exam.
                </div>
                <div className="self-start bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl rounded-tl-sm px-5 py-3 max-w-[85%] shadow-sm flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex-shrink-0 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="pt-1 leading-relaxed">Good luck! I&apos;ll remind you tomorrow morning.</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center -my-2 relative z-20">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 shadow-sm">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>
            </div>

            {/* Discord Block */}
            <div>
              <div className="flex items-center gap-2 mb-6 justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#5865F2]/10 flex items-center justify-center text-[#5865F2]">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Discord</span>
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Next Day</span>
              </div>
              <div className="flex flex-col gap-4 text-sm">
                <div className="self-start bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl rounded-tl-sm px-5 py-3 max-w-[85%] shadow-sm flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex-shrink-0 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="pt-1 leading-relaxed">
                    <p className="mb-2">Good morning.</p>
                    <p className="mb-2">Your Math exam is today.</p>
                    <p>Let&apos;s review for 20 minutes before you leave.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-10 text-center border-t border-slate-100 dark:border-slate-800 pt-8">
             <p className="font-bold text-lg text-slate-900 dark:text-white">Same Guardian. Same Memory. Different Platform.</p>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full bg-white dark:bg-slate-950 py-24 border-y border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Why Guardian AI is Different</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Guardian learns your habits, tracks your progress, and communicates wherever you are.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: <Brain />, title: "One AI Across Every Platform", desc: "Remembers what matters across Telegram, Discord, Email, and more." },
              { icon: <Activity />, title: "Emotional Awareness", desc: "Checks in when you're struggling and adapts to your mood." },
              { icon: <Goal />, title: "Accountability Partner", desc: "Keeps you accountable to your daily and long-term goals." },
              { icon: <Calendar />, title: "Contextual Routines", desc: "Understands your routines and schedule to provide timely help." },
              { icon: <LinkIcon />, title: "Omnichannel Support", desc: "Supports you wherever you communicate without missing a beat." },
              { icon: <Shield />, title: "Continuous Learning", desc: "Learns over time to become a truly personalized companion." },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6 flex flex-col items-start text-left">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="w-full py-24 max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">How Guardian Learns and Grows With You</h2>
        </div>
        
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 md:left-1/2 md:-ml-px"></div>
          
          {[
            { step: 1, title: "Create Account", desc: "Set up your profile, goals, and preferred motivation style." },
            { step: 2, title: "Connect Platforms", desc: "Link Telegram, Discord, or Email via Caspian SDK." },
            { step: 3, title: "Guardian Learns", desc: "Chat normally. Guardian builds a private graph of your memory." },
            { step: 4, title: "Daily Support", desc: "Receive proactive check-ins, routine reminders, and insights." },
          ].map((item, i) => (
            <motion.div 
              key={i}
              className={`relative flex items-center justify-between md:justify-normal w-full mb-12 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="hidden md:block w-5/12"></div>
              
              <div className="absolute left-8 md:left-1/2 -ml-4 w-8 h-8 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-950 flex items-center justify-center text-white font-bold text-sm shadow-sm z-10">
                {item.step}
              </div>
              
              <div className="pl-20 md:pl-0 md:w-5/12">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{item.desc}</p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section className="w-full bg-indigo-600 py-24 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to meet your Guardian?</h2>
          <p className="text-indigo-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Join the beta today and experience the first AI companion that truly understands your life across all platforms.
          </p>
          <Link href="/login">
            <Button size="lg" className="rounded-full px-8 bg-white text-indigo-600 hover:bg-slate-50 shadow-xl">
              Get Started for Free
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}

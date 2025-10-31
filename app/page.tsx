"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, Filter, Clock, X, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { streamText, CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type ModelProvider = "openai" | "gemini" | "xai";

interface ApiKeys {
  openai: string | null;
  gemini: string | null;
  xai: string | null;
}

// Helper function moved outside component
const getProviderName = (provider: ModelProvider) => {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "gemini":
      return "Google Gemini";
    case "xai":
      return "xAI (Grok)";
    default:
      return provider;
  }
};

const getGreetingForHour = (hour: number) => {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
};

const MessageLoader: React.FC = () => {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block w-2.5 h-2.5 rounded-full bg-current"
          initial={{ y: 0, opacity: 0.5 }}
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.12 }}
        />
      ))}
    </div>
  );
};

export default function Page() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: null,
    gemini: null,
    xai: null,
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [selectedProvider, setSelectedProvider] =
    useState<ModelProvider>("openai");
  const [modalProvider, setModalProvider] = useState<ModelProvider>("openai");

  // Maintain processing state so UI can react to it
  const isProcessingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const storedKeys = {
      openai: localStorage.getItem("ai_api_key_openai"),
      gemini: localStorage.getItem("ai_api_key_gemini"),
      xai: localStorage.getItem("ai_api_key_xai"),
    };
    setApiKeys(storedKeys);
  }, []); // Only run once on mount

  const handleSend = async () => {
    if (!message.trim() || isProcessingRef.current) return;
    const currentApiKey = apiKeys[selectedProvider];
    if (!currentApiKey) {
      setModalProvider(selectedProvider);
      setTempApiKey(""); // Reset temp key
      setShowApiKeyModal(true);
      return;
    }

    // mark processing
    isProcessingRef.current = true;
    setIsProcessing(true);

    const newMessage: Message = { role: "user", content: message };
    const newMessagesHistory = [...messages, newMessage];

    // Optimistic update: append user's message + assistant placeholder
    setMessages(newMessagesHistory);
    setMessage("");
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      let provider;
      let model;

      switch (selectedProvider) {
        case "openai":
          provider = createOpenAI({ apiKey: currentApiKey });
          model = provider.chat("gpt-5-nano");
          break;
        case "gemini":
          provider = createGoogleGenerativeAI({ apiKey: currentApiKey });
          model = provider.chat("gemini-2.5-flash");
          break;
        case "xai":
          provider = createXai({ apiKey: currentApiKey });
          model = provider.chat("grok-beta");
          break;
        default:
          throw new Error("Invalid model provider selected");
      }

      const { textStream } = await streamText({
        model: model,
        messages: newMessagesHistory as CoreMessage[],
      });

      let fullResponse = "";
      for await (const textPart of textStream) {
        fullResponse += textPart;
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          lastMessage.content = fullResponse;
          return newMessages;
        });
      }
    } catch (error) {
      console.error("AI SDK Error:", error);
      const errorText =
        "An error occurred. Your API key might be invalid or the model service is down.";
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        lastMessage.content = errorText;
        return newMessages;
      });

      localStorage.removeItem(`ai_api_key_${selectedProvider}`);
      setApiKeys((prev) => ({ ...prev, [selectedProvider]: null }));
      setTimeout(() => {
        setModalProvider(selectedProvider);
        setShowApiKeyModal(true);
      }, 1000);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (hasMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, hasMessages]);

  const handleKeySave = () => {
    if (!tempApiKey.trim()) return;

    const newApiKeys = { ...apiKeys, [modalProvider]: tempApiKey };
    setApiKeys(newApiKeys);
    localStorage.setItem(`ai_api_key_${modalProvider}`, tempApiKey);
    setTempApiKey("");
    setShowApiKeyModal(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle Enter key in the API key input
  const handleApiKeyInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleKeySave();
    }
  };

  // derive greeting using user's local time
  const userName = "Mayur"; // change this if you store the user's name elsewhere
  const now = new Date();
  const greeting = getGreetingForHour(now.getHours());

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Modal moved out of nested function and rendered conditionally */}
        <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3 border border-primary/20">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center">
                Enter Your {getProviderName(modalProvider)} API Key
              </DialogTitle>
              <DialogDescription className="text-center">
                To use {getProviderName(modalProvider)} models, please enter
                your API key. Your key is saved only in your browser's local
                storage.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="provider-select"
                  className="text-sm font-medium"
                >
                  Provider
                </label>
                <Select
                  value={modalProvider}
                  onValueChange={(value) =>
                    setModalProvider(value as ModelProvider)
                  }
                >
                  <SelectTrigger id="provider-select">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="xai">xAI (Grok)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="api-key-input" className="text-sm font-medium">
                  API Key
                </label>
                <Input
                  id="api-key-input"
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  onKeyDown={handleApiKeyInputKeyDown}
                  placeholder={
                    modalProvider === "openai"
                      ? "sk..."
                      : modalProvider === "gemini"
                      ? "AI..."
                      : "xai..."
                  }
                  className="text-center"
                  autoFocus
                />
              </div>
              <Button onClick={handleKeySave} className="w-full">
                Save and Continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div
          className={`flex h-full w-full flex-col items-center ${
            hasMessages ? "justify-between" : "justify-center"
          }`}
        >
          <AnimatePresence mode="wait">
            {hasMessages ? (
              <div
                key="messages"
                className="flex-1 w-full max-w-2xl overflow-y-auto px-4 pt-6 pb-24"
              >
                <div className="space-y-6">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-2 text-sm shadow-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/40 text-foreground"
                        }`}
                      >
                        {msg.role === "assistant" && msg.content === "" ? (
                          // show loader while streaming
                          <MessageLoader />
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            ) : (
              <div key="empty-state" className="text-center space-y-2">
                <p className="text-sm text-muted-foreground font-medium">
                  Free plan • Upgrade
                </p>
                <h1 className="text-4xl font-serif font-semibold tracking-tight">
                  {greeting}, {userName}
                </h1>
              </div>
            )}
          </AnimatePresence>

          <div
            className={`w-full flex justify-center ${
              hasMessages
                ? "sticky bottom-0 bg-background/70 backdrop-blur-sm p-4 border-t border-border"
                : "mt-8 px-4"
            }`}
          >
            <div className="w-full max-w-xl">
              <div className="w-full rounded-xl bg-muted/20 border border-border p-4 shadow-sm">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="How can I help you today?"
                  className="text-foreground mb-3 text-left w-full bg-transparent border-none focus:outline-none text-base"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button className="rounded-md border border-border p-2 hover:bg-muted">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button className="rounded-md border border-border p-2 hover:bg-muted">
                      <Filter className="w-4 h-4" />
                    </button>
                    <button className="rounded-md border border-border p-2 hover:bg-muted">
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Model Selector */}
                    <Select
                      value={selectedProvider}
                      onValueChange={(value) =>
                        setSelectedProvider(value as ModelProvider)
                      }
                    >
                      <SelectTrigger className="w-[140px] text-sm">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">
                          OpenAI {!apiKeys.openai && "(Not Set)"}
                        </SelectItem>
                        <SelectItem value="gemini">
                          Gemini {!apiKeys.gemini && "(Not Set)"}
                        </SelectItem>
                        <SelectItem value="xai">
                          xAI {!apiKeys.xai && "(Not Set)"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={handleSend}
                      className="rounded-md bg-primary/90 p-2 text-primary-foreground hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!message.trim() || isProcessingRef.current}
                      title={isProcessing ? "Processing..." : "Send"}
                    >
                      {isProcessing ? (
                        <div className="w-4 h-4 rounded-full animate-spin border-2 border-t-transparent" />
                      ) : (
                        <ArrowUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {!hasMessages && (
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  "Write",
                  "Learn",
                  "Code",
                  "Life stuff",
                  "Claude's choice",
                ].map((label) => (
                  <button
                    key={label}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

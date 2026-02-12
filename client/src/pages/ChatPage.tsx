import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { coursesApi, type Subject } from "../services/coursesApi";
import {
  chatApi,
  type Message,
  type ChatPreview,
  type Topic,
} from "../services/chatApi";

const ChatPage: React.FC = () => {
  const { semesterId, subjectId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef<string>("");

  const [message, setMessage] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatPreview[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"chats" | "topics">("chats");
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!semesterId) return;
      try {
        const response = await coursesApi.getSubjects(semesterId);
        if (response.success && response.semester) {
          setSubjects(response.semester.subjects);
          const current = response.semester.subjects.find(
            (s) => s.id === subjectId,
          );
          setCurrentSubject(current || null);
        }
      } catch (err) {
        console.error("Error fetching subjects:", err);
      }
    };
    fetchSubjects();
  }, [semesterId, subjectId]);

  useEffect(() => {
    const fetchChats = async () => {
      if (!subjectId) return;
      setLoading(true);
      try {
        const response = await chatApi.getChats(subjectId);
        if (response.success && response.chats) {
          setChatHistory(response.chats);
          if (response.chats.length > 0 && !currentChatId) {
            loadChat(response.chats[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching chats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, [subjectId]);

  useEffect(() => {
    const fetchTopics = async () => {
      if (!subjectId || sidebarTab !== "topics") return;
      setTopicsLoading(true);
      try {
        const response = await chatApi.getTopics(subjectId);
        if (response.success && response.topics) {
          setTopics(response.topics);
        }
      } catch (err) {
        console.error("Error fetching topics:", err);
      } finally {
        setTopicsLoading(false);
      }
    };
    fetchTopics();
  }, [subjectId, sidebarTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const loadChat = async (chatId: string) => {
    setLoading(true);
    try {
      const response = await chatApi.getChat(chatId);
      if (response.success && response.chat) {
        setCurrentChatId(chatId);
        setMessages(response.chat.messages);
      }
    } catch (err) {
      console.error("Error loading chat:", err);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async () => {
    if (!subjectId) return;
    setLoading(true);
    try {
      const response = await chatApi.createChat(subjectId);
      if (response.success && response.chat) {
        setCurrentChatId(response.chat.id);
        setMessages([]);
        setChatHistory((prev) => [
          {
            id: response.chat!.id,
            title: "New Chat",
            updatedAt: new Date().toISOString(),
            messageCount: 0,
            preview: "",
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error("Error creating chat:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !currentChatId || sending) return;

    const userMessage = message.trim();
    setMessage("");
    setSending(true);
    setStreamingContent("");
    streamingContentRef.current = "";

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      await chatApi.sendMessageStream(
        currentChatId,
        userMessage,
        (chunk) => {
          streamingContentRef.current += chunk;
          setStreamingContent(streamingContentRef.current);
        },
        () => {
          const finalContent = streamingContentRef.current;
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: finalContent,
              timestamp: new Date().toISOString(),
            },
          ]);
          setStreamingContent("");
          streamingContentRef.current = "";
          setSending(false);

          setChatHistory((prev) =>
            prev.map((chat) =>
              chat.id === currentChatId
                ? {
                    ...chat,
                    title: userMessage.substring(0, 50),
                    messageCount: chat.messageCount + 2,
                  }
                : chat,
            ),
          );
        },
        (error) => {
          console.error("Stream error:", error);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Error: " + error,
              timestamp: new Date().toISOString(),
            },
          ]);
          setStreamingContent("");
          setSending(false);
        },
      );
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Failed to get response. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startEditing = (
    chatId: string,
    currentTitle: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditTitle(currentTitle);
  };

  const saveTitle = async (chatId: string) => {
    if (!editTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    try {
      await chatApi.renameChat(chatId, editTitle);
      setChatHistory((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: editTitle } : c)),
      );
      setEditingChatId(null);
    } catch (err) {
      console.error("Error renaming chat:", err);
    }
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatApi.deleteChat(chatId);
      setChatHistory((prev) => prev.filter((c) => c.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const preprocessLaTeX = (content: string) => {
    // 1. Replace block math \[ ... \] with $$ ... $$
    let processed = content.replace(/\\\[([\s\S]*?)\\\]/g, "$$$$$1$$$$");

    // 2. Replace inline math \( ... \) with $ ... $
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, "$$ $1 $$");

    // 3. Handle weird "backslash space paren" e.g. \ ( ... \ )
    processed = processed.replace(/\\ \(/g, "$ (").replace(/\\ \)/g, ") $");

    // 4. Heuristic: Wrap math-like parenthesized expressions containing backslashes
    // e.g. ( p \rightarrow q ) -> $ ( p \rightarrow q ) $
    processed = processed.replace(
      /(\([^\n$]*?\\[a-zA-Z]+[^\n$]*?\))/g,
      (match) => {
        // Double check not already wrapped
        if (
          (match.startsWith("$") || match.startsWith(" $")) &&
          (match.endsWith("$") || match.endsWith("$ "))
        )
          return match;
        return ` $ ${match} $ `;
      },
    );

    return processed;
  };

  return (
    <div className="flex h-screen bg-black text-white font-mono overflow-hidden relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <button
        onClick={() => navigate(`/select-subject/${semesterId}`)}
        className="cursor-target absolute top-4 left-4 text-white/40 hover:text-white text-xs tracking-widest transition-colors z-20 flex items-center gap-2 group"
      >
        <span className="group-hover:-translate-x-1 transition-transform">
          &lt;&lt;
        </span>{" "}
        BACK
      </button>

      <div className="flex-1 flex flex-col relative z-10 pl-8 pr-96 pt-16 pb-8">
        <div className="flex-1 overflow-y-auto space-y-6 mb-24 scrollbar-hide pr-4">
          <div className="text-center opacity-30 my-8 text-xs tracking-[0.2em]">
            --- SYSTEM INITIALIZED: {currentSubject?.name || subjectId} ---
          </div>

          {messages.length === 0 && !loading && (
            <div className="flex gap-4 items-start group">
              <div className="w-8 h-8 rounded-sm bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0">
                <span className="text-green-500 text-xs font-bold">AI</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-sm max-w-2xl relative">
                <p className="opacity-80 text-sm leading-relaxed text-green-100/90">
                  Hello! I'm your StudyBuddy for{" "}
                  <span className="text-green-400 font-bold">
                    {currentSubject?.name || subjectId}
                  </span>
                  . Ask me anything about your lectures!
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 items-start group ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${
                  msg.role === "user"
                    ? "bg-white/10 border border-white/30"
                    : "bg-green-500/10 border border-green-500/30"
                }`}
              >
                <span
                  className={`text-xs font-bold ${msg.role === "user" ? "text-white/70" : "text-green-500"}`}
                >
                  {msg.role === "user" ? "U" : "AI"}
                </span>
              </div>
              <div
                className={`border p-4 rounded-sm max-w-2xl relative ${
                  msg.role === "user"
                    ? "bg-white/10 border-white/20"
                    : "bg-white/5 border-white/10"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white/10 prose-pre:p-3">
                    <ReactMarkdown
                      remarkPlugins={[
                        [remarkMath, { singleDollarTextMath: true }],
                        remarkGfm,
                      ]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          const [copied, setCopied] = React.useState(false);

                          const handleCopy = () => {
                            navigator.clipboard.writeText(
                              String(children).replace(/\n$/, ""),
                            );
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          };

                          return !inline && match ? (
                            <div className="relative group rounded-sm overflow-hidden my-4 border border-white/10 bg-black/40">
                              <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
                                  {match[1]}
                                </span>
                                <button
                                  onClick={handleCopy}
                                  className="text-[10px] tracking-widest text-green-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:text-green-400"
                                >
                                  {copied ? "COPIED!" : "COPY_CODE"}
                                </button>
                              </div>
                              <div className="p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                <code
                                  className={`${className} !bg-transparent !p-0`}
                                  {...props}
                                >
                                  {children}
                                </code>
                              </div>
                            </div>
                          ) : (
                            <code className={`${className}`} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {preprocessLaTeX(msg.content)}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="opacity-80 text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-sm bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0">
                <span className="text-green-500 text-xs font-bold">AI</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-sm max-w-2xl">
                {streamingContent ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white/10 prose-pre:p-3">
                    <ReactMarkdown
                      remarkPlugins={[
                        [remarkMath, { singleDollarTextMath: true }],
                        remarkGfm,
                      ]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          const [copied, setCopied] = React.useState(false);

                          const handleCopy = () => {
                            navigator.clipboard.writeText(
                              String(children).replace(/\n$/, ""),
                            );
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          };

                          return !inline && match ? (
                            <div className="relative group rounded-sm overflow-hidden my-4 border border-white/10 bg-black/40">
                              <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
                                  {match[1]}
                                </span>
                                <button
                                  onClick={handleCopy}
                                  className="text-[10px] tracking-widest text-green-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:text-green-400"
                                >
                                  {copied ? "COPIED!" : "COPY_CODE"}
                                </button>
                              </div>
                              <div className="p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                <code
                                  className={`${className} !bg-transparent !p-0`}
                                  {...props}
                                >
                                  {children}
                                </code>
                              </div>
                            </div>
                          ) : (
                            <code className={`${className}`} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {preprocessLaTeX(streamingContent)}
                    </ReactMarkdown>
                    <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-1" />
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-green-500/50 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-green-500/50 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-green-500/50 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="absolute bottom-10 left-8 right-96 max-w-4xl mx-auto px-4 z-30">
          <div className="relative group">
            <div className="relative bg-black/80 border border-white/20 backdrop-blur-xl flex items-center transition-all duration-300 focus-within:border-green-500/50 focus-within:shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <span className="pl-6 text-green-500 animate-pulse font-bold">
                &gt;
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentChatId
                    ? "ENTER COMMAND OR QUERY..."
                    : "CREATE A NEW CHAT TO START..."
                }
                className="cursor-target w-full bg-transparent text-white p-4 pl-4 outline-none font-mono placeholder-white/20 text-sm tracking-wide resize-none h-[60px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                disabled={!currentChatId || sending}
                autoFocus
              />
              <button
                onClick={handleSend}
                disabled={!currentChatId || sending || !message.trim()}
                className="cursor-target px-6 py-2 mr-2 bg-white/5 border border-white/10 hover:bg-green-500 hover:text-black hover:border-green-500 transition-all duration-200 text-xs font-bold tracking-wider disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white disabled:hover:border-white/10"
              >
                {sending ? "..." : "SEND"}
              </button>
            </div>
            <div className="absolute -top-1 -left-1 w-2 h-2 border-l border-t border-white pointer-events-none group-focus-within:border-green-500 transition-colors" />
            <div className="absolute -top-1 -right-1 w-2 h-2 border-r border-t border-white pointer-events-none group-focus-within:border-green-500 transition-colors" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-l border-b border-white pointer-events-none group-focus-within:border-green-500 transition-colors" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-r border-b border-white pointer-events-none group-focus-within:border-green-500 transition-colors" />
          </div>
          <div className="text-[10px] text-white/20 text-center mt-2 tracking-widest uppercase">
            Press [ENTER] to execute
          </div>
        </div>
      </div>

      <div className="w-80 border-l border-white/10 bg-black/40 backdrop-blur-xl flex flex-col z-20 absolute right-0 top-0 bottom-0">
        <div className="p-6 border-b border-white/10 bg-white/5">
          <label className="block text-[10px] text-green-500/70 mb-2 tracking-[0.2em] font-bold">
            ACTIVE_MODULE
          </label>
          <div className="relative group">
            <select
              className="w-full bg-black/50 border border-white/20 text-white p-3 text-xs font-mono outline-none cursor-target appearance-none hover:border-green-500/50 transition-colors focus:border-green-500"
              value={subjectId}
              onChange={(e) =>
                navigate(`/chat/${semesterId}/${e.target.value}`)
              }
            >
              {subjects.map((sub) => (
                <option
                  key={sub.id}
                  value={sub.id}
                  className="bg-black text-white"
                >
                  {sub.name.toUpperCase()}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none text-green-500 opacity-50 group-hover:opacity-100">
              ▼
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-white/10">
          <button
            onClick={createNewChat}
            disabled={loading}
            className="cursor-target w-full py-2 bg-green-500/10 border border-green-500/30 text-green-500 text-xs tracking-widest font-bold hover:bg-green-500 hover:text-black hover:border-green-500 transition-all duration-200 disabled:opacity-50"
          >
            + NEW CHAT
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-2">
            <label className="block text-[10px] text-white/30 tracking-[0.2em] uppercase">
              {sidebarTab === "chats" ? "Session_Logs" : "Topics_to_Learn"}
            </label>
            <div className="relative">
              <button
                onClick={() => setShowTabMenu(!showTabMenu)}
                className="cursor-target text-white/40 hover:text-white text-sm transition-colors"
              >
                ⋮
              </button>
              {showTabMenu && (
                <div className="absolute right-0 top-6 bg-black border border-white/20 shadow-lg z-50 min-w-[120px]">
                  <button
                    onClick={() => {
                      setSidebarTab("chats");
                      setShowTabMenu(false);
                    }}
                    className={`cursor-target w-full text-left px-4 py-2 text-xs tracking-widest hover:bg-white/10 transition-colors ${
                      sidebarTab === "chats"
                        ? "text-green-500 bg-white/5"
                        : "text-white/70"
                    }`}
                  >
                    CHATS
                  </button>
                  <button
                    onClick={() => {
                      setSidebarTab("topics");
                      setShowTabMenu(false);
                    }}
                    className={`cursor-target w-full text-left px-4 py-2 text-xs tracking-widest hover:bg-white/10 transition-colors ${
                      sidebarTab === "topics"
                        ? "text-green-500 bg-white/5"
                        : "text-white/70"
                    }`}
                  >
                    TOPICS
                  </button>
                </div>
              )}
            </div>
          </div>

          {sidebarTab === "chats" && (
            <div className="space-y-1">
              {chatHistory.map((chat, index) => (
                <div
                  role="button"
                  tabIndex={0}
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      loadChat(chat.id);
                    }
                  }}
                  className={`cursor-target w-full text-left group relative p-3 border transition-all duration-200 ${
                    currentChatId === chat.id
                      ? "border-green-500/30 bg-green-500/10"
                      : "border-transparent hover:border-white/10 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-green-500/50 group-hover:text-green-400 font-bold">
                      LOG_{(index + 1).toString().padStart(3, "0")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-white/20">
                        {formatDate(chat.updatedAt)}
                      </span>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                        <button
                          onClick={(e) => startEditing(chat.id, chat.title, e)}
                          className="text-green-500/50 hover:text-green-500 text-[10px]"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => deleteChat(chat.id, e)}
                          className="text-red-500/50 hover:text-red-500 text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                  {editingChatId === chat.id ? (
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => saveTitle(chat.id)}
                      onKeyDown={(e) => e.key === "Enter" && saveTitle(chat.id)}
                      className="w-full bg-black/50 border border-green-500/50 text-white text-xs p-1 outline-none font-medium"
                      autoFocus
                    />
                  ) : (
                    <div className="text-xs text-white/60 group-hover:text-white truncate font-medium">
                      {chat.title}
                    </div>
                  )}
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-green-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center" />
                </div>
              ))}
              {chatHistory.length === 0 && !loading && (
                <div className="text-center text-white/20 text-xs py-4">
                  No chats yet. Create one!
                </div>
              )}
            </div>
          )}

          {sidebarTab === "topics" && (
            <div className="space-y-2">
              {topicsLoading ? (
                <div className="text-center text-white/40 text-xs py-8">
                  Loading topics...
                </div>
              ) : topics.length > 0 ? (
                topics.map((topic, index) => (
                  <div
                    key={index}
                    className="group relative p-3 border border-white/10 hover:border-green-500/30 hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="mb-1">
                      <span className="text-[10px] text-green-500/50 group-hover:text-green-400 font-bold">
                        TOPIC_{(index + 1).toString().padStart(3, "0")}
                      </span>
                    </div>
                    <div className="text-xs text-white/70 group-hover:text-white font-medium leading-relaxed">
                      {topic.title}
                    </div>
                    {topic.courseName && (
                      <div className="text-[10px] text-white/30 mt-1">
                        {topic.courseName}
                      </div>
                    )}
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-green-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center" />
                  </div>
                ))
              ) : (
                <div className="text-center text-white/20 text-xs py-8">
                  No topics available for this subject.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-white/5">
          <button
            onClick={() => {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("isAuthenticated");
              navigate("/");
            }}
            className="cursor-target w-full py-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs tracking-widest font-bold hover:bg-red-500 hover:text-black hover:border-red-500 transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            <span className="group-hover:translate-x-1 transition-transform">
              &gt;&gt;
            </span>
            LOGOUT
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

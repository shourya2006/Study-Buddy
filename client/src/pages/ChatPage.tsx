import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const ChatPage: React.FC = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  const subjects = [
    { id: "DS", name: "DATA STRUCTURES" },
    { id: "ALGO", name: "ALGORITHMS" },
    { id: "OS", name: "OPERATING SYSTEMS" },
    { id: "CN", name: "COMPUTER NETWORKS" },
    { id: "DBMS", name: "DATABASE SYSTEMS" },
  ];

  const history = [
    { id: 1, title: "Linked Lists Inquiry", date: "2023-10-24" },
    { id: 2, title: "Binary Search Trees", date: "2023-10-22" },
    { id: 3, title: "Stack & Queue Implementation", date: "2023-10-20" },
    { id: 4, title: "Graph Traversal", date: "2023-10-18" },
  ];

  return (
    <div className="flex h-screen bg-black text-white font-mono overflow-hidden relative">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)} // Go back to subject selection
        className="cursor-target absolute top-4 left-4 text-white/40 hover:text-white text-xs tracking-widest transition-colors z-20 flex items-center gap-2 group"
      >
        <span className="group-hover:-translate-x-1 transition-transform">
          &lt;&lt;
        </span>{" "}
        BACK
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10 pl-8 pr-96 pt-16 pb-8">
        {" "}
        {/* Right padding leaves room for sidebar */}
        {/* Chat Container */}
        <div className="flex-1 overflow-y-auto space-y-6 mb-24 scrollbar-hide pr-4">
          <div className="text-center opacity-30 my-8 text-xs tracking-[0.2em]">
            --- SYSTEM INITIALIZED: {subjectId} ---
          </div>
          {/* Mock Messages */}
          <div className="flex gap-4 items-start group">
            <div className="w-8 h-8 rounded-sm bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0">
              <span className="text-green-500 text-xs text-bold">AI</span>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-sm max-w-2xl relative">
              <p className="opacity-80 text-sm leading-relaxed text-green-100/90 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                Hello, Unit. Ready for data input on{" "}
                <span className="text-green-400 font-bold">{subjectId}</span>.
              </p>
              {/* Decorative corner */}
              <div className="absolute -top-1 -left-1 w-2 h-2 border-l border-t border-green-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
        {/* Input Area (Bottom Center) */}
        <div className="absolute bottom-10 left-8 right-96 max-w-4xl mx-auto px-4 z-30">
          <div className="relative group">
            {/* Input Container */}
            <div className="relative bg-black/80 border border-white/20 backdrop-blur-xl flex items-center transition-all duration-300 focus-within:border-green-500/50 focus-within:shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <span className="pl-6 text-green-500 animate-pulse font-bold">
                &gt;
              </span>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="ENTER COMMAND OR QUERY..."
                className="cursor-target w-full bg-transparent text-white p-6 pl-4 outline-none font-mono placeholder-white/20 text-sm tracking-wide"
                autoFocus
              />

              {/* Send Button */}
              <button className="cursor-target px-6 py-2 mr-2 bg-white/5 border border-white/10 hover:bg-green-500 hover:text-black hover:border-green-500 transition-all duration-200 text-xs font-bold tracking-wider">
                SEND
              </button>
            </div>

            {/* Corner Accents for Input */}
            <div className="absolute -top-1 -left-1 w-2 h-2 border-l border-t border-white pointer-events-none group-focus-within:border-green-500 transition-colors" />
            <div className="absolute -top-1 -right-1 w-2 h-2 border-r border-t border-white pointer-events-none group-focus-within:border-green-500 transition-colors" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-l border-b border-white pointer-events-none group-focus-within:border-green-500 transition-colors" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-r border-b border-white pointer-events-none group-focus-within:border-green-500 transition-colors" />
          </div>
          <div className="text-[10px] text-white/20 text-center mt-2 tracking-widest uppercase">
            // Press [ENTER] to execute
          </div>
        </div>
      </div>

      {/* Right Sidebar - History & Config */}
      <div className="w-80 border-l border-white/10 bg-black/40 backdrop-blur-xl flex flex-col z-20 absolute right-0 top-0 bottom-0">
        {/* Subject Switcher (Top of Sidebar) */}
        <div className="p-6 border-b border-white/10 bg-white/5">
          <label className="block text-[10px] text-green-500/70 mb-2 tracking-[0.2em] font-bold">
            // ACTIVE_MODULE
          </label>
          <div className="relative group">
            <select
              className="w-full bg-black/50 border border-white/20 text-white p-3 text-xs font-mono outline-none cursor-target appearance-none hover:border-green-500/50 transition-colors focus:border-green-500"
              defaultValue={subjectId}
              onChange={(e) => navigate(`/chat/${e.target.value}`)}
            >
              {subjects.map((sub) => (
                <option
                  key={sub.id}
                  value={sub.id}
                  className="bg-black text-white"
                >
                  {sub.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none text-green-500 opacity-50 group-hover:opacity-100">
              ▼
            </div>
            {/* Scanline hover effect for dropdown */}
            <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-green-500 group-hover:w-full transition-all duration-500" />
          </div>
        </div>

        {/* Session Logs (History) */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <label className="block text-[10px] text-white/30 mb-6 tracking-[0.2em] uppercase border-b border-white/5 pb-2">
            Session_Logs
          </label>
          <div className="space-y-1">
            {history.map((item) => (
              <button
                key={item.id}
                className="cursor-target w-full text-left group relative p-3 border border-transparent hover:border-white/10 hover:bg-white/5 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-green-500/50 group-hover:text-green-400 font-bold">
                    LOG_{item.id.toString().padStart(3, "0")}
                  </span>
                  <span className="text-[9px] text-white/20">{item.date}</span>
                </div>
                <div className="text-xs text-white/60 group-hover:text-white truncate font-medium">
                  {item.title}
                </div>
                {/* Active indicator line */}
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-green-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center" />
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer - Logout */}
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

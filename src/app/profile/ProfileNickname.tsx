"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";

const NICKNAME_KEY = "modoo-chat-nickname";

export default function ProfileNickname() {
  const [nickname, setNickname] = useState("");
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NICKNAME_KEY) ?? "";
      setNickname(saved);
    } catch {}
  }, []);

  function startEdit() {
    setInput(nickname);
    setEditing(true);
  }

  function save() {
    const name = input.trim();
    if (!name) return;
    try { localStorage.setItem(NICKNAME_KEY, name); } catch {}
    setNickname(name);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setInput("");
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          maxLength={20}
          autoFocus
          className="text-base font-black font-serif border-b-2 border-[#1c1712] bg-transparent focus:outline-none w-40"
        />
        <button onClick={save} disabled={!input.trim()} className="text-[#2a6828] hover:text-[#1a4818] disabled:opacity-40 transition-colors">
          <Check size={16} />
        </button>
        <button onClick={cancel} className="text-[#882020] hover:text-[#5a1010] transition-colors">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <p className="text-base font-black font-serif">
        {nickname || "닉네임 없음"}
      </p>
      <button
        onClick={startEdit}
        className="text-[#8c8070] hover:text-[#1c1712] transition-colors"
        title="닉네임 수정"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}

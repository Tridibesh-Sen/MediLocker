import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

export default function AICompanionDrawer({ user, onShowToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.name ? user.name.split(' ')[0] : 'there'}! I am Medi-AI, your clinical health assistant powered by Mistral AI. You can ask me about your prescriptions, symptoms, or home medicine routine.`
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      const res = await api.askAiCompanion(userText, {
        fullName: user?.name,
        isPregnant: false,
        recentAlcohol: false,
        knownAllergies: user?.allergies,
        chronicConditions: user?.chronicConditions,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.response,
          emergencyBypass: res.emergencyBypass,
        }
      ]);

      if (res.emergencyBypass) {
        onShowToast?.({
          type: 'error',
          title: 'Emergency Triage',
          message: 'Critical emergency detected. National Services 112/108 recommended.'
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I encountered an error connecting to Medi-AI. Please ensure your query is safe and try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'What should I take for a mild headache?',
    'Any contraindications with Dolo 650?',
    'What are my active medications?'
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 md:bottom-6 right-6 z-40 bg-gradient-to-tr from-gov-navy to-sky-700 hover:from-sky-900 hover:to-sky-600 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 border-2 border-white/40 group"
        title="Medi-AI Clinical Companion"
      >
        <div className="relative">
          <Bot className="w-6 h-6 text-amber-300" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white animate-pulse"></span>
        </div>
        <span className="hidden sm:inline font-bold text-sm tracking-wide pr-1">Medi-AI Companion</span>
      </button>

      {/* Drawer / Window */}
      {isOpen && (
        <div className="fixed bottom-0 md:bottom-20 right-0 md:right-6 z-50 w-full sm:w-96 md:w-[420px] h-[580px] max-h-[90vh] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-600/50 border border-sky-400/40 flex items-center justify-center text-amber-300">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="font-display font-bold text-sm flex items-center gap-1.5">
                  <span>Medi-AI Clinical Companion</span>
                  <span className="text-[10px] bg-sky-500/30 text-sky-200 px-1.5 py-0.5 rounded border border-sky-400/30">Mistral AI</span>
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Sovereign Guardrails & Triage Active</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-sm">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-sky-800 text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : m.emergencyBypass
                      ? 'bg-rose-50 text-rose-950 border-2 border-rose-400 rounded-tl-none font-medium'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none'
                  }`}
                >
                  {m.emergencyBypass && (
                    <div className="flex items-center gap-1.5 font-bold text-rose-600 text-xs mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>EMERGENCY PROTOCOL</span>
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200 max-w-[200px]">
                <Sparkles className="w-4 h-4 text-sky-600 animate-spin" />
                <span>Consulting Medi-AI...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto text-[11px]">
            {quickPrompts.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="whitespace-nowrap px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full border border-slate-200 transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Form Submit Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Medi-AI anything..."
              className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center transition shadow-sm"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

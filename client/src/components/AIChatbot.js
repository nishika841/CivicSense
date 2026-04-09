import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { aiAPI } from '../utils/api';

const KNOWLEDGE_BASE = [
  { q: ['how to file', 'how to report', 'report complaint', 'file complaint', 'submit complaint', 'new complaint', 'kaise kare'],
    a: 'To file a complaint:\n1. Click "Report Issue" in the navbar\n2. Enter a title and description\n3. Select a category (AI will auto-suggest!)\n4. Click on the map to set location\n5. Upload photos (optional)\n6. Click Submit to register your complaint.' },
  { q: ['track complaint', 'status', 'check status', 'where is my complaint', 'complaint status', 'kya hua'],
    a: 'You can track your complaint status on the Dashboard page. Each complaint shows its current status: Reported → Verified → In Progress → Resolved.' },
  { q: ['map', 'location', 'find complaint', 'nearby', 'area', 'search map'],
    a: 'The Map page shows all complaints on an interactive map. You can:\n• Search any city or area\n• Toggle satellite view\n• Enable heatmap to see complaint hotspots\n• Click markers to see complaint details\n• Your location is auto-detected' },
  { q: ['analytics', 'stats', 'statistics', 'data', 'chart', 'graph', 'trend'],
    a: 'The Analytics page shows real-time stats:\n• Total complaints, resolution rate, avg resolution time\n• Status distribution (pie chart)\n• Category breakdown (bar chart)\n• Monthly trends (line chart)\n• Top hotspot areas\n• Search by area to filter stats for any city!' },
  { q: ['vote', 'upvote', 'support', 'like'],
    a: 'You can upvote complaints to increase their priority. More votes = higher impact score = faster attention from authorities. Just click the vote button on any complaint.' },
  { q: ['category', 'categories', 'types', 'what can i report'],
    a: 'You can report these categories:\n• 🕳️ Pothole\n• 🗑️ Garbage Overflow\n• 💧 Water Leakage\n• 💡 Streetlight\n• 🚰 Drainage\n• 🛣️ Road Damage\n• 📋 Other\n\nAI will auto-detect the category from your description!' },
  { q: ['ai', 'artificial intelligence', 'smart', 'auto detect', 'suggestion'],
    a: 'CivicSense uses AI to:\n• Auto-detect complaint category from your description\n• Assess severity (Low/Medium/High/Critical)\n• Find similar/duplicate complaints nearby\n• Generate smart summaries\nAll powered by our built-in NLP engine!' },
  { q: ['admin', 'authority', 'government', 'resolve', 'who fixes'],
    a: 'Admins (municipal authorities) can:\n• Verify reported complaints\n• Update status to In Progress/Resolved\n• Upload resolution proof photos' },
  { q: ['hello', 'hi', 'hey', 'help', 'what can you do', 'namaste'],
    a: 'Hello! 👋 I\'m the CivicSense AI Assistant. I can help you with:\n• How to file a complaint\n• Tracking complaint status\n• Using the map and analytics\n• Any questions about the platform\n\nJust ask me anything!' },
  { q: ['heatmap', 'heat map', 'hotspot', 'red zone'],
    a: 'The Heatmap shows complaint density on the map. Red/orange zones = many complaints, green = fewer. Toggle it using the 🔥 flame button on the Map page. Great for identifying problem areas!' },
  { q: ['image', 'photo', 'upload', 'picture', 'camera'],
    a: 'You can upload up to 5 images per complaint. Photos help verify the issue and speed up resolution. Supported formats: JPG, PNG, etc. Just click the upload area on the Report Issue page.' },
];

function findAnswer(query) {
  const lower = query.toLowerCase().trim();
  
  let bestMatch = null;
  let bestScore = 0;

  for (const item of KNOWLEDGE_BASE) {
    for (const keyword of item.q) {
      if (lower.includes(keyword) || keyword.includes(lower)) {
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = item.a;
        }
      }
    }
  }

  // Fuzzy word match fallback
  if (!bestMatch) {
    const words = lower.split(/\s+/).filter(w => w.length > 2);
    for (const item of KNOWLEDGE_BASE) {
      let matchCount = 0;
      for (const keyword of item.q) {
        for (const word of words) {
          if (keyword.includes(word)) matchCount++;
        }
      }
      if (matchCount > bestScore) {
        bestScore = matchCount;
        bestMatch = item.a;
      }
    }
  }

  return bestMatch || "I'm not sure about that. Try asking about:\n• How to file a complaint\n• Tracking complaint status\n• Map & Analytics features\n• AI features\n\nOr type 'help' for an overview!";
}

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! 👋 I'm the CivicSense AI Assistant. How can I help you today?", time: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input.trim(), time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const query = input.trim();
    setInput('');
    setTyping(true);

    try {
      // Try Gemini API first
      const res = await aiAPI.chat(query);
      if (res.data.success && res.data.reply) {
        setMessages(prev => [...prev, { role: 'bot', text: res.data.reply, time: new Date(), poweredBy: 'gemini' }]);
        setTyping(false);
        return;
      }
    } catch (err) {
      // Gemini failed, use local fallback
    }

    // Fallback to local knowledge base
    const answer = findAnswer(query);
    setMessages(prev => [...prev, { role: 'bot', text: answer, time: new Date(), poweredBy: 'local' }]);
    setTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'bg-gray-700 rotate-90' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-110'
        }`}
      >
        {isOpen ? <X size={24} className="text-white" /> : <MessageCircle size={24} className="text-white" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[9999] w-[360px] max-h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center space-x-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">CivicSense AI</p>
              <p className="text-white/70 text-xs">Always here to help</p>
            </div>
            <div className="ml-auto flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className="text-white/70 text-xs">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[340px]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-primary-100' : 'bg-indigo-100'
                  }`}>
                    {msg.role === 'user' ? <User size={14} className="text-primary-600" /> : <Bot size={14} className="text-indigo-600" />}
                  </div>
                  <div>
                    <div className={`px-3 py-2 rounded-xl text-sm whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                    {msg.role === 'bot' && msg.poweredBy === 'gemini' && (
                      <div className="flex items-center mt-0.5 ml-1">
                        <Sparkles size={8} className="text-indigo-400 mr-1" />
                        <span className="text-[9px] text-indigo-400">Gemini AI</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Bot size={14} className="text-indigo-600" />
                  </div>
                  <div className="bg-gray-100 px-4 py-2 rounded-xl rounded-tl-sm">
                    <div className="flex space-x-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {['How to report?', 'Track status', 'AI features'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => handleSend(), 0); setInput(q); }}
                  className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 px-3 py-2 flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;

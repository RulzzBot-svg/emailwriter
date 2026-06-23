import React, { useState } from 'react';
import { 
  Wand2, 
  Copy, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles,
  Leaf
} from 'lucide-react';

export default function App() {
  const [rawInput, setRawInput] = useState('');
  const [tone, setTone] = useState('professional');
  const [shortSimple, setShortSimple] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  // Tones available
  const tones = [
    { id: 'professional', emoji: '💼', label: 'Professional', instruction: 'Use a polished, business-professional tone.' },
    { id: 'casual', emoji: '😌', label: 'Casual', instruction: 'Use a relaxed, natural conversational tone while staying clear.' },
    { id: 'formal', emoji: '📜', label: 'Formal', instruction: 'Use a formal, precise, and respectful corporate tone.' },
    { id: 'friendly', emoji: '😊', label: 'Friendly', instruction: 'Use a warm, approachable, and positive tone.' },
    { id: 'empathetic', emoji: '🤝', label: 'Empathetic', instruction: 'Use a considerate and understanding tone.' },
    { id: 'urgent', emoji: '⚡', label: 'Urgent', instruction: 'Use an urgent tone. Create a sense of urgency, and focus on action.' }
  ];

  const selectedTone = tones.find((t) => t.id === tone) || tones[0];

  // The REAL AI Logic connecting to Gemini
  const generateEmail = async () => {
    if (!rawInput.trim()) return;
    
    // Using Vite's env variable system. Paste key in the quotes if .env still gives you trouble!
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 

    if (!apiKey) {
      setOutput("Error: API Key is missing. Please check your .env file or paste it directly into the code.");
      return;
    }

    setIsGenerating(true);
    setOutput('');
    setCopied(false);

    try {
      const brevityInstruction = shortSimple
        ? 'Keep the email short, simple, and easy to understand.'
        : 'Include enough detail to be clear while staying professional.';

      const prompt = `You are a professional email copywriter. Turn the following messy notes into a clear corporate email body.
      ${selectedTone.instruction}
      ${brevityInstruction}
      Do not include a subject line. Return only the email body.
      Notes: ${rawInput}`;
      
      let data = null;
      let success = false;
      let lastError = '';
      let delay = 1000;
      const modelName = 'gemini-2.5-flash';

      // Calling the Gemini API with exponential backoff retries (from your extension!)
      for (let i = 0; i < 5; i++) {
          try {
              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                      contents: [{ parts: [{ text: prompt }] }]
                  })
              });
              
              if (response.ok) {
                  data = await response.json();
                  success = true;
                  break;
              }

              let errorPayload = null;
              try {
                  errorPayload = await response.json();
              } catch (parseErr) {
                  errorPayload = null;
              }

              lastError = errorPayload?.error?.message || `HTTP Error ${response.status}`;

              // Do not retry client-side errors except 429 (Too Many Requests).
              if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                  break;
              }
          } catch (err) {
              lastError = err?.message || 'Network error while contacting Gemini API.';
          }
          
          if (!success && i < 4) {
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2;
          }
      }

      if (!success || !data) {
          throw new Error(lastError);
      }
      
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!generatedText.trim()) {
          throw new Error('Gemini returned an empty response.');
      }
      
      setOutput(generatedText.trim());

    } catch (error) {
      setOutput(`Whoops, Gemini request failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = output;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 md:p-8 font-sans">
      
      {/* Chrome Extension Sized Container */}
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col h-[750px]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg text-white backdrop-blur-sm">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">ProDraft</h1>
            <p className="text-blue-100 text-xs font-medium">Brain-dump to Professional Email</p>
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col overflow-y-auto">
          
          {/* Step 1: Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              1. Type your messy thoughts
            </label>
            <textarea 
              rows="4"
              placeholder="e.g., tell the client the website is done but they need to pay the final invoice before I send the passwords..."
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-sm"
            ></textarea>
          </div>

          {/* Step 2: Tone Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              2. Choose the vibe
            </label>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              >
                {tones.map((t) => (
                  <option key={t.id} value={t.id}>
                    {`${t.emoji} ${t.label}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 3: Short & Simple Toggle */}
          <div className="mb-6">
            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-200">Keep response short & simple</p>
                <p className="text-xs text-slate-400">Uses your selected tone with fewer words.</p>
              </div>
              <button
                type="button"
                onClick={() => setShortSimple((prev) => !prev)}
                aria-pressed={shortSimple}
                className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 ${
                  shortSimple
                    ? 'bg-emerald-300/25 border-emerald-200 text-emerald-200 shadow-[0_0_22px_rgba(110,231,183,0.45)]'
                    : 'bg-slate-800 border-slate-600 text-slate-400'
                }`}
              >
                {shortSimple && (
                  <span className="absolute h-11 w-11 rounded-full bg-emerald-200/35 animate-ping" />
                )}
                <Leaf
                  size={20}
                  className={`relative z-10 transition-all duration-300 ${
                    shortSimple ? 'scale-110 rotate-6 fill-emerald-200 text-emerald-200' : 'scale-100 rotate-0'
                  }`}
                />
                <span
                  className={`absolute -bottom-7 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-300 ${
                    shortSimple ? 'text-emerald-300' : 'text-slate-500'
                  }`}
                >
                  {shortSimple ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button 
            onClick={generateEmail}
            disabled={!rawInput.trim() || isGenerating}
            className={`w-full py-3.5 rounded-xl font-bold text-white flex justify-center items-center gap-2 transition-all mb-6 shadow-lg ${
              !rawInput.trim() 
                ? 'bg-slate-700 cursor-not-allowed text-slate-400 shadow-none' 
                : isGenerating
                  ? 'bg-indigo-500 cursor-wait'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Polishing your thoughts...
              </>
            ) : (
              <>
                <Wand2 size={20} />
                Translate to Professional
              </>
            )}
          </button>

          {output && (
            <button
              onClick={generateEmail}
              disabled={!rawInput.trim() || isGenerating}
              className="w-full py-2.5 rounded-xl font-semibold text-slate-200 flex justify-center items-center gap-2 transition-all mb-6 border border-slate-600 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
              Regenerate with same tone
            </button>
          )}

          {/* Output Section */}
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              4. Your Polished Email
            </label>
            <div className="relative flex-1">
              <textarea 
                readOnly
                value={output}
                placeholder="Your corporate-approved email will appear here..."
                className="w-full h-full min-h-[150px] bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:outline-none text-sm leading-relaxed"
              ></textarea>
              
              {output && (
                <button 
                  onClick={handleCopy}
                  className={`absolute bottom-3 right-3 p-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                    copied 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
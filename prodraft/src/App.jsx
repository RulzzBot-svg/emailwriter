import React, { useState } from 'react';
import { 
  Wand2, 
  Copy, 
  CheckCircle2, 
  RefreshCw, 
  Briefcase, 
  ShieldAlert, 
  Coffee,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function App() {
  const [rawInput, setRawInput] = useState('');
  const [tone, setTone] = useState('Professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  // Tones available
  const tones = [
    { id: 'Professional', icon: <Briefcase size={16} />, desc: 'Standard Corporate' },
    { id: 'Apologetic', icon: <ShieldAlert size={16} />, desc: 'Soft & Polite' },
    { id: 'Direct', icon: <ArrowRight size={16} />, desc: 'Firm & Clear' },
    { id: 'Friendly', icon: <Coffee size={16} />, desc: 'Warm & Casual' }
  ];

  // Simulated AI Logic (In the real app, this sends rawInput to OpenAI API)
  const generateEmail = () => {
    if (!rawInput.trim()) return;
    
    setIsGenerating(true);
    setOutput('');
    setCopied(false);

    // Fake API delay to simulate AI thinking
    setTimeout(() => {
      let generatedText = "";
      const lowerInput = rawInput.toLowerCase();

      if (lowerInput.includes('late') || lowerInput.includes('delay')) {
        if (tone === 'Apologetic') {
          generatedText = "Hi [Name],\n\nPlease accept my sincere apologies, but there will be a slight delay with the current project. We encountered an unexpected bottleneck with the data retrieval, but my team is actively resolving it. I will have this on your desk by [Time/Date].\n\nThank you for your patience and understanding,\nRaul";
        } else {
          generatedText = "Hi [Name],\n\nI want to provide a quick update on the project status. We are experiencing a minor delay due to outstanding data dependencies. We are on track to have everything finalized and delivered to you by [Time/Date]. \n\nBest regards,\nRaul";
        }
      } else if (lowerInput.includes('sick') || lowerInput.includes('doctor')) {
        generatedText = "Hi Team,\n\nPlease note that I am feeling under the weather today and will need to take a sick day to recover. I will be offline and monitoring emails only for absolute emergencies. [Colleague Name] can assist with any immediate needs.\n\nBest,\nRaul";
      } else {
        // Generic response for the demo if keywords don't match
        generatedText = `Hi [Name],\n\nI am writing to follow up regarding our recent discussion. ${rawInput.charAt(0).toUpperCase() + rawInput.slice(1)}.\n\nPlease let me know if you need any further clarification.\n\nBest,\nRaul`;
      }

      setOutput(generatedText);
      setIsGenerating(false);
    }, 1500); // 1.5 second fake delay
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
            <div className="grid grid-cols-2 gap-2">
              {tones.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                    tone === t.id 
                      ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {t.icon}
                  <div>
                    <div className="text-sm font-medium">{t.id}</div>
                  </div>
                </button>
              ))}
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

          {/* Output Section */}
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              3. Your Polished Email
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
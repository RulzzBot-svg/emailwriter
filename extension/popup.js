document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const rawInput = document.getElementById('rawInput');
    const toneSelect = document.getElementById('toneSelect');
    const outputArea = document.getElementById('outputArea');
    const modelName = 'gemini-3.5-flash';

    // Paste your free Google AI Studio key here when available:
    const apiKey = "";

    function isLikelyGeminiApiKey(key) {
        if (typeof key !== 'string') return false;
        const trimmed = key.trim();
        return trimmed.startsWith('AQ.') || trimmed.startsWith('AIza');
    }

    function getGeminiErrorMessage(payload) {
        const message = payload?.error?.message;
        if (!message) return 'Unknown API error.';
        if (/API key not valid/i.test(message)) {
            return 'Invalid API key. Gemini keys usually start with "AQ." (legacy keys may start with "AIza").';
        }
        if (/quota|rate|429/i.test(message)) {
            return 'Rate limited or quota exceeded. Try again shortly or check your Google AI quota.';
        }
        return message;
    }

    function getToneInstruction(tone) {
        const toneMap = {
            professional: 'Use a polished, business-professional tone.',
            casual: 'Use a relaxed, natural conversational tone while staying clear.',
            formal: 'Use a formal, precise, and respectful corporate tone.',
            friendly: 'Use a warm, approachable, and positive tone.',
            empathetic: 'Use a considerate and understanding tone.',
            concise: 'Use a concise, efficient tone with short, clear sentences.',
        };
        return toneMap[tone] || toneMap.professional;
    }

    generateBtn.addEventListener('click', async function() {
        const text = rawInput.value.trim();
        if (!text) return;
        if (!apiKey.trim()) {
            outputArea.value = "Error: Paste your Gemini API key into popup.js first.";
            return;
        }
        if (!isLikelyGeminiApiKey(apiKey)) {
            outputArea.value = "Error: Key format looks invalid. Gemini keys currently look like 'AQ....' (legacy keys may start with 'AIza').";
            return;
        }

        generateBtn.innerText = "Polishing with AI...";
        generateBtn.disabled = true;
        
        try {
            // The prompt we are secretly sending to Gemini behind the scenes
            const selectedTone = toneSelect?.value || 'professional';
            const toneInstruction = getToneInstruction(selectedTone);
            const prompt = `Turn these messy notes into a clear corporate email body. ${toneInstruction} Do not include subject lines, just the body. Here are the notes: ${text}`;
            
            let data = null;
            let success = false;
            let lastError = 'Failed to connect to the AI.';
            let delay = 1000;

            // Calling the Gemini API with exponential backoff retries
            for (let i = 0; i < 5; i++) {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': apiKey.trim()
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

                    lastError = getGeminiErrorMessage(errorPayload);

                    // Do not retry client-side errors except 429.
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
            
            // Extracting the text from Gemini's response
            const emailText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (!emailText.trim()) {
                throw new Error('Gemini returned an empty response.');
            }
            
            outputArea.value = emailText.trim();
            copyBtn.classList.add('visible');

        } catch (error) {
            outputArea.value = `Whoops, Gemini request failed: ${error?.message || 'Unknown error.'}`;
        } finally {
            generateBtn.innerText = "Translate to Professional";
            generateBtn.disabled = false;
        }
    });

    copyBtn.addEventListener('click', function() {
        outputArea.select();
        document.execCommand('copy');
        copyBtn.innerText = "Copied!";
        copyBtn.classList.add('success');
        setTimeout(() => {
            copyBtn.innerText = "Copy to Clipboard";
            copyBtn.classList.remove('success');
        }, 2000);
    });
});
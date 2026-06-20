document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const rawInput = document.getElementById('rawInput');
    const outputArea = document.getElementById('outputArea');

    // Paste your free Google AI Studio key here when available:
    const apiKey = ""; 

    generateBtn.addEventListener('click', async function() {
        const text = rawInput.value.trim();
        if (!text) return;
        if (apiKey === "") {
            outputArea.value = "Error: You need to paste your Google AI Studio API Key into the code first!";
            return;
        }

        generateBtn.innerText = "Polishing with AI...";
        generateBtn.disabled = true;
        
        try {
            // The prompt we are secretly sending to Gemini behind the scenes
            const prompt = `Turn these messy notes into a polite, professional, and clear corporate email. Do not include subject lines, just the body. Here are the notes: ${text}`;
            
            let data = null;
            let success = false;
            let delay = 1000;

            // Calling the Gemini API with exponential backoff retries
            for (let i = 0; i < 5; i++) {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }]
                        })
                    });
                    
                    if (response.ok) {
                        data = await response.json();
                        success = true;
                        break;
                    }
                } catch (err) {
                    // Suppress retry logs
                }
                
                if (!success && i < 4) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                }
            }

            if (!success || !data) {
                throw new Error("Failed to connect to the AI.");
            }
            
            // Extracting the text from Gemini's response
            const emailText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            
            outputArea.value = emailText.trim();
            copyBtn.classList.remove('hidden');

        } catch (error) {
            outputArea.value = "Whoops, something went wrong connecting to the AI. Please check your API key.";
        } finally {
            generateBtn.innerText = "Translate to Professional";
            generateBtn.disabled = false;
        }
    });

    copyBtn.addEventListener('click', function() {
        outputArea.select();
        document.execCommand('copy');
        copyBtn.innerText = "Copied!";
        copyBtn.classList.add('bg-emerald-500', 'text-white');
        setTimeout(() => {
            copyBtn.innerText = "Copy to Clipboard";
            copyBtn.classList.remove('bg-emerald-500', 'text-white');
        }, 2000);
    });
});
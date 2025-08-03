chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyzePage") {
   
    const url = new URL(message.url);
    const isGoogleSearch = url.hostname.includes('google.com') && 
                          (url.pathname.includes('/search') || url.searchParams.has('q'));
    
   
    if (isGoogleSearch) {
      console.log('Skipping emotion analysis for Google search page:', message.url);
      return;
    }
    
    fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message.text })
    })
    .then(res => res.json())
    .then(data => {
      const entry = {
        url: message.url,
        emotion: data.sentiment,
        timestamp: Date.now()
      };
      chrome.storage.local.get({ visits: [] }, (result) => {
        const visits = result.visits;
        visits.push(entry);
        chrome.storage.local.set({ visits });
      });
    })
    .catch(err => {
      
      console.error('Sentiment analysis failed:', err);
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message); 
 
  if (message.action === "getPageText") {
    const text = document.body.innerText;
    sendResponse({ text: text });
  }

  return true;
});


if (window.top === window) {
  chrome.runtime.sendMessage({
    action: "analyzePage",
    url: window.location.href,
    text: document.body.innerText
  });
}
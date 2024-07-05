console.log("this is working!");

// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "WEB_TASK_RESPONSE") {
    // Relay the message to the popup
    chrome.runtime.sendMessage({ type: "WEB_TASK_RESPONSE", data: message.data });
  }
  console.log("received in background: ", message);
});

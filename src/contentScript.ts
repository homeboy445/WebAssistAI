// Here we can interact with the page's DOM!

import { performTaskBasedOnPrompt } from "./Utility/aiQueryHandler";

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log(">> received from extension: ", request);
  if (request.type === "WEB_TASK" && request.task) {
    let result;
    try {
      result = await performTaskBasedOnPrompt(request.task);
      console.log("@@ result: ", result);
    } catch (e) {
      result = { isError: true };
    }
    chrome.runtime.sendMessage({ type: 'WEB_TASK_RESPONSE', data: result });
  } else {
    sendResponse('hello from content-script');
  }
  return true;
});

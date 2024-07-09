// Here we can interact with the page's DOM!
import DOMPurify from "dompurify";
import { Marked } from "marked";
import { TaskType } from "./types/types";
import { performTaskBasedOnPrompt } from "./Utility/aiQueryHandler";
import domUtils from "./Utility/domUtils";

function objectToHTML(obj: any): string {
  if (typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.join(".");
  }
  let html = "";
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      html += `<div><strong>${key}:</strong> ${obj[key]}</div>`;
    }
  }
  return html;
}

const parseMarkdown = async (content: string) => {
  const markParsed = new Marked();
  try {
    return DOMPurify.sanitize(await markParsed.parse(content));
  } catch (e) {
    console.error("Error parsing markdown: ", e);
    return content;
  }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log(">> received from extension: ", request);
  if (request.type === "WEB_TASK" && request.task) {
    let result;
    try {
      result = await performTaskBasedOnPrompt(request.task);
      if (result.functionType === TaskType.INFO_RETRIEVAL) {
        domUtils.createDialogBox({ title: "Info you requested", content: await parseMarkdown(objectToHTML(result.result) + "\nAdditionally, " + objectToHTML(result.additionalInfo)) });
      }
    } catch (e) {
      result = { isError: true };
    }
    chrome.runtime.sendMessage({ type: 'WEB_TASK_RESPONSE', data: result });
  } else {
    sendResponse('hello from content-script');
  }
  return true;
});

(window as any).domUtils = domUtils;

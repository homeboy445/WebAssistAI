// apiUtils.ts (New file to encapsulate API interactions)

import { getBaseURL } from "../consts/Urls";
import { AITaskResponse, GenericObject, TaskType } from "../types/types";
import domUtils from "./domUtils";
import $ from "jquery";

interface APIOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

async function sendApiRequest(
  url: string,
  options: APIOptions = {}
): Promise<any> {
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: { ...options.headers, "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  } catch (error) {
    console.error("Error sending API request:", error);
    return {};
  }
}

export async function askAI(
  prompt: string,
  route = "getOperationName",
  additionalInfo = {}
): Promise<any> {
  const url = `${getBaseURL()}/${route}`;
  return sendApiRequest(url, {
    method: "POST",
    body: { userPrompt: prompt, ...additionalInfo },
  });
}

function performOperations(element: HTMLElement | null, opType: string): boolean {
  if (!element) {
    return false;
  }
  switch (opType) {
    case "Click": {
      element?.click();
      return true;
    }
    case "scrollIntoView": {
      $(element).css({ border: "5px solid black", "padding": "2px" });
        $(element)
          .animate({ borderWidth: "0px", border: "none" }, 1000)
          .animate({ borderWidth: "5px", border: "5px solid black" }, 1000)
          .animate({ borderWidth: "0px", border: "none" }, 1000)
          .animate({ borderWidth: "5px", border: "5px solid black" }, 1000);
      setTimeout(() => {
        $(element).css({ border: "none", "padding": "none" });
      }, 5000);
      element?.scrollIntoView();
      return true;
    }
  }
  return false;
}

// taskUtils.ts (New file to handle task execution)

export function parseGenAICodeResponse(
  codeString: string,
  type: string
): string {
  return codeString.replaceAll("```", "").replaceAll(type, " ");
}

export async function performTaskBasedOnPrompt(prompt: string): Promise<AITaskResponse> {
  const result = await askAI(prompt);
  console.log("Result received:", result);

  const parsedResponse = JSON.parse(parseGenAICodeResponse(result, "json"));
  const tasks = parsedResponse["result"] || [];
  let operationSuccess = true;
  let functionType = "";
  for (const { fn, input, operation } of tasks) {
    functionType = domUtils.getFunctionType(fn);
    if (!functionType) {
      return { operationSuccess: false, result: "Invalid operation!" };
    }
    const foundElements = await (domUtils as any)[fn]?.(input);
    switch (fn) {
      case "collectSiteDataAndProcessContent": {
        if (foundElements.result) {
          return { ...JSON.parse(parseGenAICodeResponse(foundElements.result, "json")), operationSuccess: true, functionType: TaskType.INFO_RETRIEVAL };
        }
      }
      default: {
        if (operation) {
          if (Array.isArray(foundElements)) {
            console.log("I am here! ", foundElements);
            for (const elements of foundElements) {
              if (!performOperations(elements, operation)) {
                operationSuccess = false;
              }
            }
          } else {
            operationSuccess = performOperations(foundElements, operation);
          }
          if (operation.toLowerCase() !== "scrollintoview" && operation.indexOf("scroll") > -1) {
            operationSuccess = true;
          }
        }
      }
    }
  }
  return { ...parsedResponse, operationSuccess, functionType };
}

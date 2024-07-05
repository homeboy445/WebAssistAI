// apiUtils.ts (New file to encapsulate API interactions)

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

const BASE_API_URL = "http://localhost:3000";

export async function askAI(
  prompt: string,
  route = "getOperationName",
  additionalInfo = {}
): Promise<any> {
  const url = `${BASE_API_URL}/${route}`;
  return sendApiRequest(url, {
    method: "POST",
    body: { userPrompt: prompt, ...additionalInfo },
  });
}

function performOperations(element: HTMLElement | null, opType: string): boolean {
  console.log("## operating on: ", element);
  if (!element) {
    return false;
  }
  switch (opType) {
    case "Click": {
      return element?.click(), true;
    }
    case "scrollIntoView": {
      $(element).css({ border: "5px solid red", "padding": "2px" });
        $(element)
          .animate({ borderWidth: "0px", border: "none" }, 1000)
          .animate({ borderWidth: "5px", border: "5px solid red" }, 1000)
          .animate({ borderWidth: "0px", border: "none" }, 1000)
          .animate({ borderWidth: "5px", border: "5px solid red" }, 1000);
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

export async function performTaskBasedOnPrompt(prompt: string): Promise<any> {
  const result = await askAI(prompt);
  console.log("Result received:", result);

  const parsedResponse = JSON.parse(parseGenAICodeResponse(result, "json"));
  const tasks = parsedResponse["result"] || [];
  let operationSuccess = false;
  let functionType = "";
  for (const { fn, input, operation } of tasks) {
    functionType = domUtils.getFunctionType(fn);
    if (!functionType) {
      return { operationSuccess: false, message: "Invalid operation!" };
    }
    const foundElements = await (domUtils as any)[fn]?.(input);

    switch (fn) {
      case "collectSiteDataAndProcessContent": {
        if (foundElements.result) {
          return { ...JSON.parse(parseGenAICodeResponse(foundElements.result, "json")), operationSuccess: true };
        }
      }
      default: {
        if (operation) {
          if (Array.isArray(foundElements)) {
            foundElements?.reduce((element: any) => {
              operationSuccess = performOperations(element, operation) && operationSuccess;
            }, operationSuccess);
          } else {
            operationSuccess = performOperations(foundElements, operation);
          }
        }
      }
    }
  }

  return { ...parsedResponse, operationSuccess, functionType };
}

// (Existing domUtils.ts file with domUtils object)

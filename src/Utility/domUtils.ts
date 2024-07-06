import { TaskType } from "../types/types";
import { askAI, parseGenAICodeResponse } from "./aiQueryHandler";
import colorMap from "./colorMap";
import { io } from "socket.io-client";
import { DialogBoxConfig, DialogBoxHandler } from "./dialogBoxHandler";

const socket = io("http://localhost:3000");

function getVisibleElements(
  validatorCallback: (element: HTMLElement) => boolean = () => true
): HTMLElement[] {
  const visibleElements: HTMLElement[] = [];
  const allElements = Array.from(
    document.body.querySelectorAll("*")
  ) as Array<HTMLElement>;
  const restrictedElements: { [key: string]: number } = {
    SCRIPT: 1,
    NOSCRIPT: 1,
    STYLE: 1,
  };

  allElements.forEach((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    if (
      validatorCallback(element) &&
      !restrictedElements[element.tagName] &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    ) {
      visibleElements.push(element);
    }
  });

  return visibleElements;
}

function hexToRgb(hex: string): number[] {
  hex = hex.replace(/^#/, "");

  let bigint: number;
  if (hex.length === 3) {
    bigint = parseInt(hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    bigint = parseInt(hex, 16);
  } else {
    throw new Error("Invalid hex color format");
  }

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return [r, g, b];
}

function isColorVariant(rgbColor: string, baseColor: string): boolean {
  function rgbStringToArray(rgbString: string): number[] | null {
    const rgbArray = rgbString
      .slice(rgbString.indexOf("(") + 1, rgbString.indexOf(")") - 1)
      .split(",")
      .map((x) => +x);
    return rgbArray ? rgbArray.map(Number) : null;
  }

  function weightedColorDistance(
    rgbString1: string | number[],
    rgbString2: string | number[]
  ): number {
    const rgb1 = Array.isArray(rgbString1)
      ? rgbString1
      : rgbStringToArray(rgbString1);
    const rgb2 = Array.isArray(rgbString2)
      ? rgbString2
      : rgbStringToArray(rgbString2);
    if (!rgb1 || !rgb2) {
      throw new Error("Invalid RGB string format");
    }
    const r1 = rgb1[0],
      g1 = rgb1[1],
      b1 = rgb1[2];
    const r2 = rgb2[0],
      g2 = rgb2[1],
      b2 = rgb2[2];
    const distance = Math.sqrt(
      (1 || 0.3) * (r1 - r2) ** 2 +
        (1 || 0.59) * (g1 - g2) ** 2 +
        (1 || 0.11) * (b1 - b2) ** 2
    );
    return distance;
  }

  const distance = weightedColorDistance(rgbColor, baseColor);
  return distance < 60;
}

const RESTRICTED_ELEMENTS: { [key: string]: number } = {
  SCRIPT: 1,
  NOSCRIPT: 1,
  STYLE: 1,
  IFRAME: 1,
};

class DomUtils {
  functionTypeStore: Record<string, TaskType> = {
    findAndClickOnElementBasedOnText: TaskType.DOM_OPERATION,
    findAndClickElementBasedOnColor: TaskType.DOM_OPERATION,
    findAndClickElementBasedOnLink: TaskType.DOM_OPERATION,
    scrollPageDownByShortValue: TaskType.DOM_OPERATION,
    scrollPageUpByShortValue: TaskType.DOM_OPERATION,
    goForwardInHistory: TaskType.DOM_OPERATION,
    goBackwardInHistory: TaskType.DOM_OPERATION,
    scrollToBottom: TaskType.DOM_OPERATION,
    scrollToTop: TaskType.DOM_OPERATION,
    collectSiteDataAndProcessContent: TaskType.INFO_RETRIEVAL,
    findElementOnThePageGloballyByText: TaskType.DOM_OPERATION,
  };

  getFunctionType(functionName: string): TaskType {
    return this.functionTypeStore[functionName];
  }

  findAndClickOnElementBasedOnText(text: string = ""): Element[] {
    if (!text) {
      return [];
    }
    const results = this.getVisibleElements(function (element: HTMLElement) {
      const elementText = element.textContent?.trim().toLowerCase() || "";
      const elementInnerText = element.innerText?.trim().toLowerCase() || "";
      const textToCompareAgainst = text.trim().toLowerCase();
      return (
        elementInnerText === textToCompareAgainst ||
        elementText === textToCompareAgainst
      );
    });
    if (results.length) {
      results.forEach(function (btnElement: HTMLElement) {
        btnElement.style.border = "2px solid yellow";
        setTimeout(function () {
          console.log("restoring...");
          btnElement.style.border = "none";
        }, 10000);
      });
    }
    return results;
  }

  findAndClickElementBasedOnColor(colorName: string = ""): Element[] {
    if (!colorName) {
      return [];
    }
    return this.getVisibleElements(function (element: Element) {
      if (RESTRICTED_ELEMENTS[element.tagName]) {
        return false;
      }
      const elementColor = window.getComputedStyle(element).backgroundColor;
      if (elementColor === "rgba(0, 0, 0, 0)") {
        return false;
      }
      if (elementColor.toLowerCase() === colorName.toLowerCase()) {
        return true;
      }
      let processedElementColor = elementColor;
      if (processedElementColor.indexOf("rgb") === -1) {
        if (processedElementColor.indexOf("#") !== -1) {
          processedElementColor = hexToRgb(processedElementColor).join(",");
        } else {
          processedElementColor = ""; // Assuming colorMap is defined elsewhere
        }
      }
      if (isColorVariant(colorMap[colorName], processedElementColor)) {
        return true;
      }
      return false;
    });
  }

  findAndClickElementBasedOnLink(url: string): Element[] {
    if (!url) {
      return [];
    }
    return this.getVisibleElements(function (element: HTMLElement) {
      if (
        element &&
        (element as HTMLAnchorElement).href &&
        (element as HTMLAnchorElement).href.includes(url)
      ) {
        return true;
      }
      return false;
    });
  }

  scrollPageDownByShortValue(): void {
    window.scrollBy(0, 500);
  }

  scrollPageUpByShortValue(): void {
    window.scrollBy(0, -500);
  }

  goForwardInHistory(): void {
    history.forward();
  }

  goBackwardInHistory(): void {
    history.back();
  }

  scrollToBottom(): void {
    window.scrollTo(0, document.body.scrollHeight);
  }

  scrollToTop(): void {
    window.scrollTo(0, 0);
  }

  getAllTextContentWithTags(): string {
    function getTextContentWithTags(node: Node, depth: number = 0): string {
      let text = "";
      if (node.nodeType === Node.TEXT_NODE) {
        text = node.nodeValue?.trim() || "";
        if (text) {
          let tagOpen = `<${(
            node.parentElement as Element
          ).tagName.toLowerCase()}>\n`;
          let tagClose = `</${(
            node.parentElement as Element
          ).tagName.toLowerCase()}>\n`;
          return `\n${tagOpen}${text}${tagClose}\n`;
        }
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        !{
          ...RESTRICTED_ELEMENTS,
          A: 1,
          FORM: 1,
          INPUT: 1,
          LINK: 1,
          TEXTAREA: 1,
          LABEL: 1,
          TABLE: 1,
          TH: 1,
          TR: 1,
          TD: 1,
          CITE: 1,
          CODE: 1,
          BUTTON: 1
        }[(node as Element).tagName]
      ) {
        let tagContent = "";
        Array.from((node as HTMLElement).childNodes).forEach((child: Node) => {
          tagContent += getTextContentWithTags(child, depth + 1);
        });
        text = tagContent;
      }
      return text;
    }
    return `<body>${getTextContentWithTags(document.body)}</body>`;
  }

  async collectSiteDataAndProcessContent() {
    const htmlStructureString = this.getAllTextContentWithTags();
    const pageDataList = htmlStructureString.split("\n");
    let finalResponse = "";
    let promiseResolvedCallback = (...args: any[]) => {};
    const responseCallback = (data: any) => {
      promiseResolvedCallback(data);
    };
    socket.on("pageSummarisation.response", responseCallback);
    for (let idx = 0; idx < pageDataList.length; idx += 500) {
      const pageStringList = pageDataList.slice(idx, idx + 500);
      const data = {
        pageString: pageStringList.join(" "),
        isStart: idx === 0,
        isEnd: idx + 500 > pageDataList.length,
      };
      socket.emit("pageSummarisation.send", data);
      finalResponse = await new Promise((resolve) => {
        const timer = setTimeout(() => {
          resolve("Not found!");
        }, 60000 * 5);
        promiseResolvedCallback = (response) => {
          clearTimeout(timer);
          resolve(response);
        };
      });
    }
    return finalResponse;
  }

  private getVisibleElements(
    validatorCallback: (element: HTMLElement) => boolean = () => true
  ): HTMLElement[] {
    const visibleElements: HTMLElement[] = [];
    const allElements = Array.from(
      document.body.querySelectorAll("*")
    ) as Array<HTMLElement>;
    const restrictedElements: { [key: string]: number } = {
      SCRIPT: 1,
      NOSCRIPT: 1,
      STYLE: 1,
    };

    allElements.forEach((element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      if (
        validatorCallback(element) &&
        !restrictedElements[element.tagName] &&
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <=
          (window.innerWidth || document.documentElement.clientWidth)
      ) {
        visibleElements.push(element);
      }
    });

    return visibleElements;
  }

  async findElementOnThePageGloballyByText(
    input: string
  ): Promise<HTMLElement | null> {
    const treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );
    const textList: Node[] = [];
    while (treeWalker.nextNode()) {
      const currentNode = treeWalker.currentNode;
      if (RESTRICTED_ELEMENTS[currentNode?.parentElement?.tagName || ""]) {
        continue;
      }
      const textContent = currentNode.textContent?.trim();
      if (textContent && input.length + 25 > textContent.length) {
        textList.push(currentNode);
      }
    }
    let iterator = 0;
    const limit = 50;
    do {
      const currentTextListBatch = textList.slice(iterator, iterator + limit);
      iterator += limit;
      const result = await askAI(input, "findElement", {
        textArray: currentTextListBatch.map((x) => x.textContent?.trim()),
      });
      try {
        const parsedResult = JSON.parse(parseGenAICodeResponse(result, "json"));
        if (
          parsedResult &&
          !isNaN(+parsedResult?.idx) &&
          parsedResult?.idx !== -1
        ) {
          const eleText =
            currentTextListBatch[parsedResult.idx - 1]?.textContent?.trim?.() ||
            "";
          if (
            eleText &&
            eleText.toLowerCase().indexOf(input.toLowerCase()) > -1
          ) {
            return currentTextListBatch[parsedResult.idx - 1]
              ?.parentElement as HTMLElement;
          } else {
            for (const text of currentTextListBatch) {
              const mainTxt = (text.textContent || "").trim();
              if (mainTxt.toLowerCase().indexOf(input.toLowerCase()) > -1) {
                return text.parentElement as HTMLElement;
              }
            }
          }
        }
      } catch (e) {}
    } while (iterator < textList.length);
    return null;
  }

  createDialogBox(data: {
    title: string;
    content: string;
    onAcceptCB?: () => void;
  }) {
    const dialogBox = new DialogBoxHandler();
    dialogBox.spawn(data, { width: "50%", height: "100vh" });
  }
}

export default new DomUtils();

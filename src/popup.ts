// This file will control the popup.html file which is responsible for loading extension UI!
import $ from "jquery";

const establishCommunication = async () => {
  let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  
  const sendMessage = (messageObj: { type: string; task: string }, responseCb?: (response: unknown) => void) => {
    chrome.tabs.sendMessage(tab.id || -1, messageObj, (response) => {
      if (!chrome.runtime.lastError) {
        console.log('fine');
      } else {
        // This will print the mentioned error in the console
        console.log(chrome.runtime.lastError);
      }
      console.log("## received from contentScript: ", response);
      responseCb?.(response);
    });
  }
  console.log('established the connection!');
  return {
    sendMessage
  };
}

const globalPromiseManager = (() => {
  let resolverCB = (...args: any) => {}, rejectorCB = () => {};
  let promiseInstance = Promise.resolve();
  return {
    initialize: () => {
      promiseInstance = new Promise((resolve, reject) => {
        resolverCB = resolve;
        rejectorCB = reject;
      });
    },
    getPromise: () => promiseInstance,
    resolver: (data: any) => {
      resolverCB(data);
    },
    rejector: () => {
      rejectorCB();
    }
  }
})();

const loader = (() => {
  const loaderParent = $(".main-loader-section");
  const loaderText = $("#loaderText");
  const loaderBar = $("#loader");
  const loaderTextList = [
    "AI is curating the content for you!🤗",
    "AI is learning from the data!🧐",
    "Thinking...🤔",
    "AI is working on it!🏃",
    "AI is heavy at work!🤖",
    "Understanding the page's data!📚",
  ]
  const updateText = (idx = 0) => {
    loaderText.html(loaderTextList[(idx % loaderTextList.length)]);
  }
  const handler = {
    beginProcedure: (promiseToAwait: Promise<any>, timer = 100) => {
      return new Promise((resolve) => {
        loaderParent.css({ display: "flex" });
        let width = 10;
        let textIdx = 0;
        let textChangingTimer: any;
        const func = () => {
          if (textChangingTimer === null) { return; }
          const timer = Math.round(Math.random() * 5000);
          textChangingTimer = setTimeout(func, timer);
          updateText(textIdx++);
        };
        func();
        const interval = setInterval(async () => {
          width = Math.min(100, width + Math.round(Math.random() * 10));
          if (width >= 100) {
            clearInterval(interval);
            resolve(await promiseToAwait);
            clearInterval(textChangingTimer);
            setTimeout(() => {
              handler.reset();
            }, 1000);
          }
          loaderBar.css({ width: `${width}%` });
        }, timer);
      });
    },
    reset: () => {
      loaderBar.css({ width: "0%" });
      loaderParent.css({ display: "none" });
    }
  };
  return handler;
})();

const AIResponseDialogBox = (() => {
  const dialogBox = $(".main-ai-response");
  const infoBox = $("#additionalInfo");
  const operationStatusSection = $("#operationStatus");
  $(".close-dialog-btn").on("click", () => {
    dialogBox.css({ display: "none" });
  });
  return {
    show({ message, operationStatus }: { message: string; operationStatus: boolean }) {
      infoBox.html(message || "AI's got nothing to say!😅");
      operationStatusSection.html("The operations's a " + (operationStatus ? "success🥳" : "failure🥲"));
      dialogBox.css({ display: "flex" });
    },
  };
})();

const run = async () => {
  const element = document.querySelector(".search-submit");
  element?.addEventListener("click", async () => {
    const searchBar = document.querySelector(".search-bar") as HTMLInputElement;
    if (searchBar?.value) {
      const communicator = await establishCommunication();
      globalPromiseManager.initialize();
      communicator.sendMessage({ type: 'WEB_TASK', task: searchBar.value.trim() }, (response) => {
        console.log("## response: ", response);
      });
      searchBar.value = "";
    }
    const responsePromise = globalPromiseManager.getPromise();
    responsePromise.then((message: any) => {
      console.log("running the dialog box: ", message);
      AIResponseDialogBox.show({ message: message.data?.additionalInfo, operationStatus: message.data?.operationSuccess || false });
    });
    loader.beginProcedure(responsePromise);
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "WEB_TASK_RESPONSE") {
      console.log('Received message in popup:', message.data);
      globalPromiseManager.resolver(message);
    }
    console.log("popup: ", message);
  });
}


if (document.readyState !== 'loading') {
  run();
} else {
  document.addEventListener('DOMContentLoaded', run);
}


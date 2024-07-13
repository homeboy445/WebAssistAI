import $ from "jquery";
import {
  AIResponseDialogBox,
  audioRecorderInterface,
  loader,
} from "./components/components";

const establishCommunication = async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const sendMessage = (
    messageObj: { type: string; task: string },
    responseCb?: (response: unknown) => void
  ) => {
    chrome.tabs.sendMessage(tab.id || -1, messageObj, (response) => {
      if (!chrome.runtime.lastError) {
        console.log("fine");
      } else {
        // This will print the mentioned error in the console
        console.log(chrome.runtime.lastError);
      }
      console.log("## received from contentScript: ", response);
      responseCb?.(response);
    });
  };
  console.log("established the connection!");
  return {
    sendMessage,
  };
};

const globalPromiseManager = (() => {
  const promiseHandlerCallbacks: {
    [props: string]: { resolver: (...args: any) => void; rejector: () => void };
  } = {};
  const promiseStore: { [props: string]: Promise<any> } = {
    global: Promise.resolve(),
  };
  return {
    initialize: (promiseAlias = "global") => {
      return (promiseStore[promiseAlias] = new Promise((resolve, reject) => {
        promiseHandlerCallbacks[promiseAlias] =
          promiseHandlerCallbacks[promiseAlias] || {};
        promiseHandlerCallbacks[promiseAlias].resolver = resolve;
        promiseHandlerCallbacks[promiseAlias].rejector = reject;
      }));
    },
    getPromise: (promiseAlias = "global") => promiseStore[promiseAlias],
    resolver: (data: any, promiseAlias = "global") => {
      promiseHandlerCallbacks[promiseAlias]?.resolver(data);
    },
    rejector: (promiseAlias = "global") => {
      promiseHandlerCallbacks[promiseAlias]?.rejector();
    },
  };
})();

const initialize = async () => {
  const runAITask = async (task: string, staticMessage?: string) => {
    const communicator = await establishCommunication();
    globalPromiseManager.initialize();
    communicator.sendMessage({
      type: "WEB_TASK",
      task: task.trim(),
    });
    const responsePromise = globalPromiseManager.getPromise();
    const timer = setTimeout(() => {
      globalPromiseManager.resolver({
        operationSuccess: false,
        result: "The operation timed out!😅",
      });
    }, 60000 * 5);
    responsePromise.then((message: any) => {
      clearTimeout(timer);
      AIResponseDialogBox.show(message.data);
    });
    await loader.run(responsePromise, 100, staticMessage);
  };

  const handleSearchSubmit = async () => {
    const searchBar = document.querySelector(".search-bar") as HTMLInputElement;
    if (searchBar?.value) {
      runAITask(searchBar.value);
      searchBar.value = "";
    }
  };

  const handleRecordAudio = () => {
    const handler = {
      start: async () => {
        const communicator = await establishCommunication();
        communicator.sendMessage({
          type: "WEB_RECORD_AUDIO_START",
          task: "record",
        });
        const promiseInstance = globalPromiseManager.initialize("recorder");
        audioRecorderInterface.show();
        const timer = setTimeout(() => {
          audioRecorderInterface.logError();
          globalPromiseManager.resolver(
            { operationSuccess: false, result: "The operation timed out!😅" },
            "recorder"
          );
          audioRecorderInterface.hide();
        }, 30000);
        promiseInstance.then((response) => {
          console.log("recording promise resolved! ", response);
          clearTimeout(timer);
          if (response.data && typeof response.data.transcribedData === "string" && response.data.transcribedData !== "error") {
            runAITask(response.data.transcribedData, `Processing request: '${response.data.transcribedData}'`);
            audioRecorderInterface.hide();
          } else {
            audioRecorderInterface.logError();
            setTimeout(() => { audioRecorderInterface.hide() }, 1000);
          }
        });
      },
      stop: async (type: string) => {
        console.log("stopping audio recording! ", type);
        const communicator = await establishCommunication();
        communicator.sendMessage({
          type: "WEB_RECORD_AUDIO_STOP",
          task: "record",
        });
      },
    };
    let audioRecordingStarted = false;
    let timeout: NodeJS.Timeout | undefined;
    if (!audioRecordingStarted) {
      handler.start();
      timeout = setTimeout(() => {
        handler.stop("timer");
        audioRecorderInterface.haltTimer();
      }, 10000);
      audioRecorderInterface.onStop(() => {
        clearTimeout(timeout);
        handler.stop("manual");
      });
      audioRecordingStarted = true;
    } else {
      clearTimeout(timeout);
      handler.stop("toggled");
    }
  };

  const handleChromeRuntimeMessage = (message: any) => {
    if (message.type === "WEB_TASK_RESPONSE") {
      globalPromiseManager.resolver(message);
    } else if (message.type === "WEB_RECORD_AUDIO_RESPONSE") {
      console.log("received audio blob url: ", message.data);
      globalPromiseManager.resolver(message, "recorder");
    }
  };

  $(".search-submit").on("click", handleSearchSubmit);
  $(".record-audio").on("click", handleRecordAudio);
  chrome.runtime.onMessage.addListener(handleChromeRuntimeMessage);
};

if (document.readyState !== "loading") {
  initialize();
} else {
  document.addEventListener("DOMContentLoaded", initialize);
}

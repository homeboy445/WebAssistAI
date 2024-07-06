import $ from "jquery";

export interface DialogBoxConfig {
  width: string | number;
  height: string | number;
}

export class DialogBoxHandler {
  target: JQuery<HTMLElement>;

  constructor(targetParent: HTMLElement = document.body) {
    this.target = $(targetParent || document.body);
  }

  private getDialogBox(store: { title: string; content: string }) {
    const parent = $(`<div></div>`);
    const titleHolder = $(`<h1>${store.title}</h1>`);
    const contentHolder = $(`<p>${store.content}</p>`);
    const toggleButton = $(`<button>Close</button>`);
    titleHolder.css({
      "font-size": "2rem",
      "margin-top": "10%",
      "font-weight": "800",
    });
    contentHolder.css({
      "font-size": "1.3rem",
      margin: "2%",
      "margin-top": "5%",
      "margin-bottom": "5%",
      "line-height": "inherit",
    });
    parent.append(titleHolder);
    parent.append(contentHolder);
    parent.append(toggleButton);
    parent.css({
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: "center",
      position: "fixed",
      top: "0%",
      left: "50%",
      "z-index": "1000",
      background: "white",
      "overflow-x": "scroll",
      padding: "2%",
    });
    return {
      parent,
      child: {
        titleHolder,
        contentHolder,
        toggleButton,
      },
    };
  }

  spawn(
    data: { title: string; content: string; onAcceptCB?: () => void },
    config: DialogBoxConfig
  ) {
    const dialogBox = this.getDialogBox(data);
    dialogBox.parent.css({ width: config.width, "height": config.height });
    this.target.append(dialogBox.parent);
    dialogBox.child.toggleButton.on("click", () => {
      try {
        data.onAcceptCB?.();
      } catch (e) {}
      dialogBox.parent.css({ left: "100%" });
    });
    return dialogBox;
  }
}

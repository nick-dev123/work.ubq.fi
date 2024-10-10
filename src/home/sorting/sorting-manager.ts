import { displayGitHubIssues } from "../fetch-github/fetch-and-display-previews";
import { taskManager } from "../home";
import { renderErrorInModal } from "../rendering/display-popup-modal";
import { Sorting } from "./generate-sorting-buttons";

export class SortingManager {
  private _lastChecked: HTMLInputElement | null = null;
  private _toolBarFilters: HTMLElement;
  private _filterTextBox: HTMLInputElement;
  private _sortingButtons: HTMLElement;
  private _instanceId: string;

  constructor(filtersId: string, sortingOptions: readonly string[], instanceId: string) {
    const filters = document.getElementById(filtersId);
    if (!filters) throw new Error(`${filtersId} not found`);
    this._toolBarFilters = filters;
    this._instanceId = instanceId;
    this._filterTextBox = this._generateFilterTextBox();
    this._sortingButtons = this._generateSortingButtons(sortingOptions);
  }

  public render() {
    this._toolBarFilters.appendChild(this._sortingButtons);
    this._toolBarFilters.appendChild(this._filterTextBox);
  }

  private _generateFilterTextBox() {
    const textBox = document.createElement("input");
    textBox.type = "text";
    textBox.id = `filter-${this._instanceId}`;
    textBox.placeholder = "Text Filter";

    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "f") {
        event.preventDefault();
        textBox.focus();
      }
    });

    const issuesContainer = document.getElementById("issues-container") as HTMLDivElement;
    textBox.addEventListener("input", () => {
      try {
        const filterText = textBox.value.toLowerCase();
        const issues = Array.from(issuesContainer.children) as HTMLDivElement[];
        issues.forEach((issue) => {
          const issueId = issue.children[0].getAttribute("data-issue-id");
          if (!issueId) return;
          const gitHubIssue = taskManager.getGitHubIssueById(parseInt(issueId));
          if (!gitHubIssue) return;
          const searchableProperties = ["title", "body", "number", "html_url"] as const;
          const searchableStrings = searchableProperties.map((prop) => gitHubIssue[prop]?.toString().toLowerCase());
          const isVisible = searchableStrings.some((str) => str?.includes(filterText));
          issue.style.display = isVisible ? "block" : "none";
        });
      } catch (error) {
        return renderErrorInModal(error as Error);
      }
    });

    return textBox;
  }

  private _generateSortingButtons(sortingOptions: readonly string[]) {
    const buttons = document.createElement("div");
    buttons.className = "labels";

    sortingOptions.forEach((option) => {
      const input = this._createRadioButton(option);
      const label = this._createLabel(option);

      buttons.appendChild(input);
      buttons.appendChild(label);

      input.addEventListener("click", () => {
        try {
          void this._handleSortingClick(input, option);
        } catch (error) {
          renderErrorCatch(error as ErrorEvent);
        }
      });
    });

    return buttons;
  }

  private _createRadioButton(option: string): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "radio";
    input.value = option;
    input.id = `${option}-${this._instanceId}`;
    input.name = `sort-${this._instanceId}`;
    return input;
  }

  private _createLabel(option: string): HTMLLabelElement {
    const label = document.createElement("label");
    label.htmlFor = `${option}-${this._instanceId}`;
    label.textContent = option.charAt(0).toUpperCase() + option.slice(1);
    return label;
  }

  private _handleSortingClick(input: HTMLInputElement, option: string) {
    const ordering = input === this._lastChecked ? "reverse" : "normal";
    input.checked = input !== this._lastChecked;
    input.setAttribute("data-ordering", ordering);
    this._lastChecked = input.checked ? input : null;
    this._filterTextBox.value = "";
    input.parentElement?.childNodes.forEach((node) => {
      if (node instanceof HTMLInputElement) {
        node.setAttribute("data-ordering", "");
      }
    });

    input.setAttribute("data-ordering", ordering);
    // instantly load from cache
    try {
      void displayGitHubIssues(option as Sorting, { ordering });
    } catch (error) {
      renderErrorCatch(error as ErrorEvent);
    }
    // load from network in the background
    // const fetchedPreviews = await fetchIssuePreviews();
    // const cachedTasks = taskManager.getTasks();
    // const updatedCachedIssues = verifyGitHubIssueState(cachedTasks, fetchedPreviews);
    // displayGitHubIssues(sorting, options);
    // taskManager.syncTasks(updatedCachedIssues);
    // return fetchAvatars();
  }
}

function renderErrorCatch(event: ErrorEvent) {
  return renderErrorInModal(event.error);
}

import { GitHubIssueWithNewFlag } from "./fetch-github-issues";

export async function renderGitHubIssues(container: HTMLDivElement, issues: GitHubIssueWithNewFlag[]) {
  const avatarCache: Record<string, string> = JSON.parse(localStorage.getItem("avatarCache") || "{}");
  const fetchInProgress = new Set(); // Track in-progress fetches
  const existingIssueIds = new Set(Array.from(container.querySelectorAll(".issue-element-inner")).map((element) => element.getAttribute("data-issue-id")));

  let delay = 0;
  const baseDelay = 1000 / 15; // Base delay in milliseconds

  for (const issue of issues) {
    if (!existingIssueIds.has(issue.id.toString())) {
      const issueWrapper = document.createElement("div");
      const issueElement = document.createElement("div");
      issueElement.setAttribute("data-issue-id", issue.id.toString());

      if (issue.isNew) {
        issueWrapper.classList.add("new-issue");
      }
      // issueWrapper.classList.add("issue-element-wrapper", "new-issue"); // Add "new-issue" class here
      issueElement.classList.add("issue-element-inner");
      setTimeout(() => issueWrapper.classList.add("active"), delay);

      delay += baseDelay;

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const mirrorUrls = issue.body.match(urlRegex);

      const urlPattern = /https:\/\/github\.com\/([^/]+)\/([^/]+)\//;
      const match = mirrorUrls?.shift()?.match(urlPattern);
      const organizationName = match?.[1];
      const repositoryName = match?.[2];

      type LabelKey = "Pricing: " | "Time: " | "Priority: ";

      const labelOrder: Record<LabelKey, number> = { "Pricing: ": 1, "Time: ": 2, "Priority: ": 3 };

      issue.labels.sort((a, b) => {
        const matchA = a.name.match(/^(Pricing|Time|Priority): /)?.[0] as LabelKey | undefined;
        const matchB = b.name.match(/^(Pricing|Time|Priority): /)?.[0] as LabelKey | undefined;
        const orderA = matchA ? labelOrder[matchA] : 0;
        const orderB = matchB ? labelOrder[matchB] : 0;
        return orderA - orderB;
      });

      // Filter labels that begin with specific prefixes
      const filteredLabels = issue.labels.filter((label) => {
        return label.name.startsWith("Time: ") || label.name.startsWith("Pricing: ") || label.name.startsWith("Priority: ");
      });

      // Map the filtered labels to HTML elements
      const labels = filteredLabels.map((label) => {
        // Remove the prefix from the label name
        const name = label.name.replace(/(Time|Pricing|Priority): /, "");
        if (label.name.startsWith("Pricing: ")) {
          return `<label class="pricing">${name}</label>`;
        } else {
          return `<label class="label">${name}</label>`;
        }
      });

      issueElement.innerHTML = `
      <div class="info"><div class="title"><h3>${
        issue.title
      }</h3></div><div class="partner"><p class="organization-name">${organizationName}</p><p class="repository-name">${repositoryName}</p></div></div><div class="labels">${labels.join(
        ""
      )}<img /></div>`;

      issueElement.addEventListener("click", () => {
        console.log(issue);
        window.open(match?.input, "_blank");
      });

      issueWrapper.appendChild(issueElement);

      // Set the issueWrapper background-image to the organization's avatar
      if (organizationName) {
        const cachedAvatar = avatarCache[organizationName];
        const image = issueElement.querySelector("img") as HTMLImageElement;
        if (cachedAvatar) {
          image.src = cachedAvatar;
        } else if (!fetchInProgress.has(organizationName)) {
          // Mark this organization's avatar as being fetched
          fetchInProgress.add(organizationName);

          try {
            const response = await fetch(`https://api.github.com/orgs/${organizationName}`);
            const data = await response.json();
            if (data && data.avatar_url) {
              avatarCache[organizationName] = data.avatar_url;
              localStorage.setItem("avatarCache", JSON.stringify(avatarCache));
              image.src = data.avatar_url;
            }
          } catch (error) {
            console.error("Error fetching avatar:", error);
          } finally {
            // Fetch is complete, remove from the in-progress set
            fetchInProgress.delete(organizationName);
          }
        }
      }

      container.appendChild(issueWrapper);
    }
  }
  container.classList.add("ready");
}
const rulesList = document.querySelector("#rulesList");
const bulkData = document.querySelector("#bulkData");
const fallbackInput = document.querySelector("#fallback");
const goodbyeInput = document.querySelector("#goodbye");
const saveStatus = document.querySelector("#saveStatus");
let responseEditorMode = "rows";

function addRuleRow(keyword = "", response = "") {
  const row = document.createElement("div");
  row.className = "rule-row";
  row.innerHTML = `
    <input class="keyword-input" type="text" aria-label="Keyword" placeholder="Keyword e.g. hello" value="${keyword.replaceAll('"', "&quot;")}">
    <input class="response-input" type="text" aria-label="Response" placeholder="Bot response" value="${response.replaceAll('"', "&quot;")}">
    <button class="remove-rule" type="button" aria-label="Remove response rule" title="Remove rule">×</button>`;
  row.querySelector(".remove-rule").addEventListener("click", () => {
    responseEditorMode = "rows";
    row.remove();
  });
  rulesList.append(row);
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) throw new Error("Could not load configuration");
    const config = await response.json();
    Object.entries(config.responses).forEach(([keyword, reply]) => addRuleRow(keyword, reply));
    bulkData.value = JSON.stringify(config.responses, null, 2);
    fallbackInput.value = config.fallback;
    goodbyeInput.value = config.goodbye;
  } catch (error) {
    saveStatus.textContent = "Could not load config. Is chatbot.py running?";
  }
}

bulkData.addEventListener("input", () => {
  responseEditorMode = "bulk";
});

rulesList.addEventListener("input", () => {
  responseEditorMode = "rows";
});

document.querySelector("#importData").addEventListener("click", () => {
  try {
    const parsed = JSON.parse(bulkData.value.trim());
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
    if (Object.entries(parsed).some(([keyword, reply]) => typeof keyword !== "string" || typeof reply !== "string")) throw new Error();
    rulesList.innerHTML = "";
    Object.entries(parsed).forEach(([keyword, reply]) => addRuleRow(keyword, reply));
    responseEditorMode = "rows";
    saveStatus.textContent = "Response data loaded into rules";
  } catch (error) {
    saveStatus.textContent = "Use valid JSON with keyword and response text";
  }
});

document.querySelector("#addRule").addEventListener("click", () => {
  responseEditorMode = "rows";
  addRuleRow();
  rulesList.lastElementChild.querySelector(".keyword-input").focus();
});

document.querySelector("#saveConfig").addEventListener("click", async () => {
  const responses = {};
  if (responseEditorMode === "bulk") {
    try {
      const parsed = JSON.parse(bulkData.value.trim());
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
      if (Object.entries(parsed).some(([keyword, reply]) => typeof keyword !== "string" || typeof reply !== "string")) throw new Error();
      Object.entries(parsed).forEach(([keyword, reply]) => {
        if (keyword.trim() && reply.trim()) responses[keyword.trim()] = reply.trim();
      });
    } catch (error) {
      saveStatus.textContent = "Save failed: use valid JSON response data";
      return;
    }
  } else {
    document.querySelectorAll(".rule-row").forEach((row) => {
      const keyword = row.querySelector(".keyword-input").value.trim();
      const response = row.querySelector(".response-input").value.trim();
      if (keyword && response) responses[keyword] = response;
    });
  }

  const config = { responses, fallback: fallbackInput.value.trim(), goodbye: goodbyeInput.value.trim() };

  saveStatus.textContent = "Saving...";
  try {
    const response = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    if (!response.ok) throw new Error("Could not save configuration");
    bulkData.value = JSON.stringify(config.responses, null, 2);
    responseEditorMode = "rows";
    saveStatus.textContent = "Saved · Chatbot updated";
  } catch (error) {
    saveStatus.textContent = "Save failed. Is chatbot.py running?";
  }
});

loadConfig();

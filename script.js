const messages = document.querySelector("#messages");
const form = document.querySelector("#chatForm");
const input = document.querySelector("#userInput");
const clearButton = document.querySelector("#clearChat");

function addMessage(text, sender) {
  const message = document.createElement("article");
  message.className = `message ${sender}-message`;
  const label = sender === "bot" ? "MOHIT · NOW" : "YOU · NOW";
  const avatar = sender === "bot" ? "M" : "Y";
  message.innerHTML = `
    <div class="avatar">${avatar}</div>
    <div class="message-content">
      <span class="message-label">${label}</span>
      <p></p>
    </div>`;
  message.querySelector("p").textContent = text;
  messages.append(message);
  if (window.matchMedia("(max-width: 700px)").matches) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    });
  } else if (messages.scrollHeight > messages.clientHeight) {
    messages.scrollTo({ top: messages.scrollHeight, behavior: "smooth" });
  } else {
    message.scrollIntoView({ behavior: "smooth", block: "end" });
  }
}

async function sendMessage(text) {
  const question = text.trim();
  if (!question) return;
  addMessage(question, "user");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question })
    });
    if (!response.ok) throw new Error("Chatbot server returned an error");
    const data = await response.json();
    addMessage(data.reply, "bot");

    if (question.toLowerCase() === "bye") {
      input.disabled = true;
      form.querySelector("button").disabled = true;
    }
  } catch (error) {
    addMessage("The Python chatbot is offline. Start it with: python chatbot.py", "bot");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
  input.value = "";
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
    input.focus();
  });
});

clearButton.addEventListener("click", () => {
  messages.innerHTML = `
    <article class="message bot-message">
      <div class="avatar">M</div>
      <div class="message-content">
        <span class="message-label">MOHIT · NOW</span>
        <p>Hi, welcome. How can I help you?</p>
      </div>
    </article>`;
  input.disabled = false;
  form.querySelector("button").disabled = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
  input.focus();
});

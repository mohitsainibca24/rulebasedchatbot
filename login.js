const form = document.querySelector("#loginForm");
const status = document.querySelector("#loginStatus");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "Signing in...";
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.querySelector("#username").value,
        password: document.querySelector("#password").value
      })
    });
    if (!response.ok) throw new Error("Invalid username or password");
    window.location.href = "/admin.html";
  } catch (error) {
    status.textContent = error.message;
  }
});

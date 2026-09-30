import json
import os
import secrets
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

CONFIG_PATH = Path(os.environ.get("CHATBOT_CONFIG_PATH", Path(__file__).with_name("chatbot_config.json")))
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "mohitbot")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "saini")
admin_sessions = set()
DEFAULT_CONFIG = {
    "responses": {
    "hello": "Hi, welcome. How can I help you?",
    "how are you": "I am very fine. Thank you",
    "who are you": "I am smart AI chatbot",
    "motivate me": "Keep going. Every bug of your project makes you a better developer",
    "happy": "Great to hear that",
    "functions kya hote hai": "jakar chapter 7 padho"
    },
    "fallback": "I am not able to tell that yet. Mai jald hi ye sikh lunga",
    "goodbye": "Goodbye! Have a nice day."
}


def load_config():
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as config_file:
            loaded_config = json.load(config_file)
        if not isinstance(loaded_config, dict) or not isinstance(loaded_config.get("responses"), dict):
            raise ValueError("config must contain a responses object")
        return loaded_config
    except (OSError, json.JSONDecodeError, ValueError):
        return DEFAULT_CONFIG.copy()


def save_config(config):
    with CONFIG_PATH.open("w", encoding="utf-8") as config_file:
        json.dump(config, config_file, indent=2, ensure_ascii=False)


config = load_config()


# Method/Function to get response of ChatBot
def getResponseBot(userQuestion):
    userQuestion = userQuestion.lower()

    for eachKey in config["responses"]:
        if eachKey in userQuestion:
            return config["responses"][eachKey]

    return config["fallback"]


class ChatbotRequestHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path not in ("/api/chat", "/api/config", "/api/login"):
            self.send_error(404)
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            request_data = json.loads(self.rfile.read(content_length))
        except (ValueError, json.JSONDecodeError):
            self.send_json({"error": "Request body must be valid JSON"}, 400)
            return
        if not isinstance(request_data, dict):
            self.send_json({"error": "Request body must be a JSON object"}, 400)
            return

        if self.path == "/api/login":
            if request_data.get("username") == ADMIN_USERNAME and request_data.get("password") == ADMIN_PASSWORD:
                session_token = secrets.token_urlsafe(32)
                admin_sessions.add(session_token)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Set-Cookie", f"admin_session={session_token}; Path=/; HttpOnly; SameSite=Strict")
                self.send_header("Content-Length", "2")
                self.end_headers()
                self.wfile.write(b"{}")
            else:
                self.send_json({"error": "Invalid username or password"}, 401)
            return

        if self.path == "/api/config" and not self.is_admin_authenticated():
            self.send_json({"error": "Admin login required"}, 401)
            return

        if self.path == "/api/config":
            global config
            new_config = request_data
            if not isinstance(new_config.get("responses"), dict):
                self.send_error(400, "responses must be an object")
                return
            if not all(isinstance(key, str) and key.strip() and isinstance(value, str) for key, value in new_config["responses"].items()):
                self.send_error(400, "Each keyword and response must be text")
                return
            config = {
                "responses": {key.strip().lower(): value.strip() for key, value in new_config["responses"].items() if value.strip()},
                "fallback": str(new_config.get("fallback", DEFAULT_CONFIG["fallback"])).strip(),
                "goodbye": str(new_config.get("goodbye", DEFAULT_CONFIG["goodbye"])).strip()
            }
            try:
                save_config(config)
            except OSError:
                self.send_json({"error": "Configuration storage is unavailable"}, 500)
                return
            self.send_json(config)
            return

        user_input = str(request_data.get("message", "")).strip()

        if user_input.lower() == "bye":
            reply = config["goodbye"]
        else:
            reply = getResponseBot(user_input)

        self.send_json({"reply": reply})

    def do_GET(self):
        if self.path == "/api/config" and not self.is_admin_authenticated():
            self.send_json({"error": "Admin login required"}, 401)
            return
        if self.path == "/api/config":
            self.send_json(config)
            return
        if self.path == "/admin.html" and not self.is_admin_authenticated():
            self.send_response(302)
            self.send_header("Location", "/login.html")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        super().do_GET()

    def is_admin_authenticated(self):
        cookies = self.headers.get("Cookie", "").split(";")
        session_cookie = next((cookie.strip() for cookie in cookies if cookie.strip().startswith("admin_session=")), "")
        session_token = session_cookie.removeprefix("admin_session=")
        return session_token in admin_sessions

    def send_json(self, data, status=200):
        response_data = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response_data)))
        self.end_headers()
        self.wfile.write(response_data)

    def log_message(self, format, *args):
        return


def run_server():
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), ChatbotRequestHandler)
    print(f"Mohit ChatBot running on {host}:{port}")
    print("Edit the responses dictionary in chatbot.py, then restart the server to apply changes.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nGoodbye! Have a nice day.")
    finally:
        server.server_close()


if __name__ == "__main__":
    run_server()
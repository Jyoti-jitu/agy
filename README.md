# BigQuery Release Notes Explorer 🚀

A modern, fast, and interactive web application built with **Python Flask** and **Vanilla HTML/CSS/JS** to view, search, and share Google Cloud BigQuery release notes. The application pulls release data in real-time from the official Google Cloud feeds, structures them into readable, categorized cards, and provides a built-in composer to share updates on X (Twitter).

---

## ✨ Features

- **Granular Update Parsing**: Daily release note entries are parsed using `BeautifulSoup` and split by update type (e.g., `Feature`, `Issue`, `Deprecation`, `Notice`, `Resolved`).
- **Interactive Dashboard**:
  - Live search filtering by keywords, dates, or types.
  - Multi-select capability to select multiple items to compile.
  - Interactive badges and glassmorphism panel designs.
- **Dynamic Tweet Composer**:
  - Automatically structures a clean draft with date, type, and source links.
  - Integrates a **character counter** (0-280) with warnings at 240, danger at 280, and validation checks.
  - Single-card and multi-card consolidated tweet generator.
  - Redirects securely using **Twitter Web Intents** without needing developer keys.
- **Caching Mechanism**: Caches parsed results in-memory for 10 minutes to maintain high speeds and prevent hitting Google feed rate limits. Includes a hard refresh bypass.

---

## 📂 Project Structure

```text
agy-cli-projects/
├── app.py                      # Flask Server (Routing, RSS Parser, Caching)
├── requirements.txt            # Python Dependencies
├── README.md                   # Project documentation
├── .gitignore                  # Git untracked ignore rules
├── templates/
│   └── index.html              # HTML5 Semantic markup & templates
└── static/
    ├── css/
    │   └── style.css           # Premium Dark glassmorphism stylesheet
    └── js/
        └── app.js              # State tracking, search filtering, modals & intents
```

---

## 🛠️ Technical Stack

- **Backend**: Python 3, Flask, Requests, Feedparser, BeautifulSoup4
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Flexbox/Grid, Backdrop-filter), Vanilla JavaScript (ES6+, Fetch API)
- **Deployment & Tooling**: Git, Pip, Virtualenv

---changes by jitu

## 🚀 Getting Started

Follow these steps to run the application locally on your system.

### Prerequisites
- Python 3.8+ installed on your system.

### 1. Clone & Setup Directory
Open your terminal and navigate to the project directory:
```bash
cd /home/jitu/Desktop/agy-cli-projects
```

### 2. Create and Activate Virtual Environment
```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Web Application
```bash
python3 app.py
```

After starting the server, open your web browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## ⚙️ How it Works (Under the hood)

1. **Request**: The browser makes a fetch request to `/api/releases`.
2. **Fetch**: Flask checks the in-memory cache. If expired (or `?refresh=true` is used), it fetches the XML feed from `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
3. **Parse**: The server parses the feed and splits daily log items using `<h3>` headers into individual objects with fields: `id`, `date`, `link`, `type`, `content_html`, and `content_text`.
4. **Render**: The client-side Javascript receives the JSON, parses, and injects cards dynamically into the DOM with CSS transitions.
5. **X (Twitter) Intent**: Clicking "Share on X" prepares a URL-safe text intent and opens `https://twitter.com/intent/tweet?text=YOUR_TEXT` in a new window.

---

## 📝 License
This project is open-source and available under the MIT License.

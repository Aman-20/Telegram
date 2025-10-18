# 📁 Telegram File Bot

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Node.js CI](https://github.com/Aman-20/Telegram/actions/workflows/ci.yml/badge.svg)
![Stars](https://img.shields.io/github/stars/Aman-20/Telegram?style=social)

A simple yet powerful Telegram bot for **searching, uploading, and sharing files** (like movies or documents) with daily user limits, trending, favorites, and inline search features.  
Built with **Node.js**, **Express**, **MongoDB**, and **node-telegram-bot-api**.

---

## ✨ Features

- 🔍 Keyword-based file search (exact, text, regex)
- ⏳ Daily usage limit per user
- 📈 Trending & recent file listings
- ⭐ Add/remove favorites
- 📤 Admin-only file uploads with confirmation
- 🧹 Auto-deletes files after 1 minute
- 🌐 Inline query support
- 📝 Broadcast system for admins

---

## 🚀 Demo

You can access the bot here:  
👉 [**@File_sharing_hd_bot**](https://t.me/File_sharing_hd_bot)

---

## 🛠️ Tech Stack

- **Node.js** + **Express**
- **MongoDB** with Mongoose
- **node-telegram-bot-api**
- EJS for minimal frontend
- Jest for testing
- GitHub Actions for CI

---

## 🧭 Quick Start (Local)

### 1️⃣ Clone the repo
```bash
git clone https://github.com/Aman-20/Telegram.git
cd Telegram
```

---

### 2️⃣ Install dependencies
```bash
npm ci
```

---

### 3️⃣ Create .env file
Create a file named .env and add:
```bash
TELEGRAM_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
MONGODB_URI=YOUR_MONGO_URI
RENDER_EXTERNAL_URL=https://your-app-url.com
ADMIN_IDS=123456789
REQUIRED_CHANNEL=@yourchannel
```

## 🔐 Environment Variables
```bash
| Variable             | Description                                       |
|----------------------|---------------------------------------------------|
| TELEGRAM_TOKEN       | Telegram bot token from BotFather                 |
| MONGODB_URI          | MongoDB connection string                         |
| RENDER_EXTERNAL_URL  | Your hosted bot URL (e.g. Render)                 |
| ADMIN_IDS            | Comma-separated Telegram IDs of admins            |
| REQUIRED_CHANNEL     | Channel users must join before downloading        |
```

---

## 📂 Folder Structure
```bash
Telegram/
├── .github/workflows/ # CI configuration
├── tests/ # Jest test files
├── views/ # EJS templates
├── bot.js # Main bot logic
├── package.json
├── README.md
└── LICENSE
```

---

### 4️⃣ Start the bot
For development:
```bash
npm run dev
```
For production:
```bash
npm start

Visit http://localhost:3000 to see the landing page.
```

---

### 🧪 Run Tests
```bash
npm test
```

---

### 🧑‍💻 Contributing
- Contributions are welcome!
- Fork the repo
- Create a new branch (git checkout -b feature/your-feature)
- Commit your changes (git commit -m "Add your feature")
- Push to the branch (git push origin feature/your-feature)
- Create a Pull Request ✅
  
---

### 📝 License
This project is licensed under the MIT License – see the LICENSE
 file for details.
 
---

### ⭐ Support
If you like this project, consider giving it a ⭐ on GitHub!

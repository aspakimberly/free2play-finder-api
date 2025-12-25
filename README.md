# Free2Play Finder — FreeToGame API (Solo Project)

A responsive, two-panel web application that allows users to browse **free-to-play games** using the **FreeToGame API**.

Users can **search**, **filter by platform**, **filter by tag/category**, **sort results**, enable **multi-tag filtering**, view **game details**, **copy the official game URL**, and save **favorites** using `localStorage`.

---

## 📋 Project Requirements Checklist (Rubric Mapping)

### 1) Base URL (Main API Root)
```

[https://www.freetogame.com/api](https://www.freetogame.com/api)

````

---

### 2) Endpoints Used (3+)

1. **List all games**
   - `GET /games`
   - Example:  
     `https://www.freetogame.com/api/games`

2. **List games with filters**
   - `GET /games?platform=pc|browser|all`
   - `GET /games?category=<tag>`
   - `GET /games?sort-by=popularity|release-date|alphabetical|relevance`

3. **Multi-tag filtering**
   - `GET /filter?tag=tag1.tag2.tag3&platform=pc`
   - Example:  
     `https://www.freetogame.com/api/filter?tag=mmorpg.3d.pvp&platform=pc`

4. **Game details**
   - `GET /game?id=<id>`
   - Example:  
     `https://www.freetogame.com/api/game?id=452`

---

### 3) Required Parameters

| Endpoint | Parameter | Type | Required | Purpose |
|--------|----------|------|----------|---------|
| `/game` | `id` | Query | ✅ Yes | Fetch full game details |
| `/games` | `platform` | Query | Optional | `pc`, `browser`, `all` |
| `/games` | `category` | Query | Optional | Filter by genre/tag |
| `/games` | `sort-by` | Query | Optional | Sort results |
| `/filter` | `tag` | Query | ✅ Yes | Dot-separated tags |
| `/filter` | `platform` | Query | Optional | Combine with tags |
| `/filter` | `sort` | Query | Optional | Sorting results |

---

### 4) Authentication
**None**

- No API key required  
- No OAuth  
- Public API access

---

### 5) Sample JSON Responses (Fields Used)

**From `/games` or `/filter`:**
```json
{
  "id": 452,
  "title": "Call Of Duty: Warzone",
  "thumbnail": "https://www.freetogame.com/g/452/thumbnail.jpg",
  "short_description": "A free-to-play battle royale ...",
  "genre": "Shooter",
  "platform": "Windows",
  "game_url": "https://www.freetogame.com/open/call-of-duty-warzone"
}
````

**From `/game`:**

```json
{
  "id": 452,
  "title": "Call Of Duty: Warzone",
  "thumbnail": "https://www.freetogame.com/g/452/thumbnail.jpg",
  "description": "Full description ...",
  "genre": "Shooter",
  "platform": "Windows",
  "publisher": "Activision",
  "developer": "Infinity Ward",
  "release_date": "2020-03-10",
  "game_url": "https://www.freetogame.com/open/call-of-duty-warzone"
}
```

---

## ▶ How to Run the Project

### Option 1: Using Live Server (Recommended)

1. Open the project folder in **VS Code**
2. Install the **Live Server** extension
3. Right-click `index.html`
4. Select **Open with Live Server**

⚠️ **Important:**
Do **NOT** open the project using `file://`
Fetch requests may fail due to CORS restrictions.

---

### Option 2: Simple HTTP Server

If you have **Node.js** installed:

```bash
npx serve .
```

Then open the provided local URL in your browser.

---

## 📁 Project Structure

```text
free2play-finder/
│
├── index.html
├── style.css
├── script.js
└── README.md
```

---

## 📚 Notes

* Uses a **CORS proxy fallback** for improved reliability
* Favorites are stored using **localStorage**
* Fully responsive UI for mobile and desktop

---



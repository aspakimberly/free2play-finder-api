# Free2Play Finder — FreeToGame API (Solo Project)

A responsive, two-panel web app that lets users browse **free-to-play games** using the **FreeToGame API**.  
Users can **search**, **filter by platform**, **filter by tag/category**, **sort**, enable **multi-tag mode**, view **game details**, **copy the official URL**, and save **favorites** using `localStorage`.

---

## Project Requirements Checklist (Rubric Mapping)

### 1) Base URL (Main API Root)
https://www.freetogame.com/api


---

### 2) Endpoints Used (3+)
This project uses these endpoints:

1. **List games**
   - `GET /games`
   - Example: `https://www.freetogame.com/api/games`

2. **List games with filters**
   - `GET /games?platform=pc|browser|all`
   - `GET /games?category=<tag>`
   - `GET /games?sort-by=popularity|release-date|alphabetical|relevance`

3. **Multi-tag filtering**
   - `GET /filter?tag=tag1.tag2.tag3&platform=pc`
   - Example: `https://www.freetogame.com/api/filter?tag=mmorpg.3d.pvp&platform=pc`

4. **Game details**
   - `GET /game?id=<id>`
   - Example: `https://www.freetogame.com/api/game?id=452`

---

### 3) Required Parameters
| Endpoint | Parameter | Type | Required? | Purpose |
|---|---|---:|---:|---|
| `/game` | `id` | query | ✅ Yes | Fetch full game details by ID |
| `/games` | `platform` | query | Optional | Filter: `pc`, `browser`, `all` |
| `/games` | `category` | query | Optional | Filter by category/tag (ex: `shooter`) |
| `/games` | `sort-by` | query | Optional | Sort results |
| `/filter` | `tag` | query | ✅ Yes (when using `/filter`) | Dot-separated tags (ex: `fantasy.pvp.3d`) |
| `/filter` | `platform` | query | Optional | Combine with tags |
| `/filter` | `sort` | query | Optional | Sorting in filter endpoint (API-supported) |

---

### 4) Authentication
**None.**  
No API key, no OAuth, no account required.

---

### 5) Sample JSON Response (Fields Used)
Only the fields used in this project are shown below.

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

## ▶ How to Run the Project

### Option 1: Using Live Server (Recommended)

1. Open the project folder in **VS Code**
2. Install the **Live Server** extension
3. Right-click `index.html`
4. Click **Open with Live Server**

⚠️ **Important:** Do **NOT** open using `file://`  
Fetch requests may fail due to CORS restrictions.

---

### Option 2: Simple HTTP Server

If you have Node.js installed:

```bash
npx serve .
```

Then open the provided local URL in your browser.

---

## 📁 Project Structure

```
free2play-finder/
│
├── index.html
├── style.css
├── script.js
└── README.md
```

---

## 📚 Notes

* Uses a **CORS proxy fallback** for reliability
* Favorites are saved using `localStorage`
* UI is fully responsive for mobile and desktop


---





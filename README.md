# AI Form Builder (Typeform Clone)

A modern, full-stack AI-powered form builder that lets you generate form schemas via Google Gemini API, edit them with a Notion-style drag-and-drop builder, and display them as an animated Typeform-style public form.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS v4, Framer Motion, dnd-kit, Lucide Icons.
- **Backend**: Node.js, Express, `@google/genai` sdk.
- **Storage**: LocalStorage (for forms) and Google Sheets API via Apps Script Webhook (for responses).

## Prerequisites
1. [Node.js](https://nodejs.org/) installed
2. A free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

---

## Setup & Running Locally

### 1. Backend Setup
\`\`\`bash
cd backend
npm install
\`\`\`
- Rename `backend/.env.example` to `backend/.env`.
- Add your `GEMINI_API_KEY`.
- *(Optional)* Add the `GOOGLE_SHEETS_WEBHOOK_URL` once you set up Google Sheets (see below).
- Start the server:
\`\`\`bash
node server.js
\`\`\`

### 2. Frontend Setup
In a new terminal:
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
- The app should now be running (usually on `http://localhost:5173`).
- The backend runs on `http://localhost:5000`.

---

## How to use Google Sheets as a Database

1. Go to [Google Sheets](https://docs.google.com/spreadsheets) and create a new blank spreadsheet.
2. In the menu, click **Extensions** > **Apps Script**.
3. Delete any default code and paste the contents of the root `Code.gs` file.
4. Click **Deploy** > **New deployment** in the top right.
5. In the generic gear icon next to "Select type", choose **Web app**.
6. Set "Who has access" to **Anyone**.
7. Click **Deploy** and authorize the script (it may warn about being unsafe, click Advanced > Go to Untitled project).
8. Copy the **Web app URL**.
9. Paste that URL into your `backend/.env` file as `GOOGLE_SHEETS_WEBHOOK_URL`.

Now, anytime someone submits a public form, a new row will automatically be appended to your Google Sheet!

---

## Deployment (Vercel)

Both the frontend and backend can be hosted entirely for free on Vercel.

**Frontend:**
1. Push the code to GitHub.
2. Import the `frontend/` directory as a new React project in Vercel.
3. Deploy!

**Backend:**
1. To host an Express server on Vercel, you need a `api/index.js` file and a `vercel.json`. This project is structured simply, so you can host the `backend/` folder on an external Vercel deployment or another free tier like Render.com.
2. Don't forget to configure `GEMINI_API_KEY` in your production environment variables.

Enjoy your completely free AI Form Builder!

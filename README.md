# 🎓 ExamFlow Online Test Platform

ExamFlow is a robust, secure, and fully functional online examination platform designed to facilitate creating and taking timed quizzes and tests with advanced anti-cheating mechanisms.

## 🚀 Technology Stack
- **Backend:** Java 21, Spring Boot 3, Spring Data JPA
- **Database:** PostgreSQL (Neon Serverless Postgres)
- **Frontend:** React 19 (Vite), Axios, React Router

## 🌟 Key Features

### Modifiable Test Parameters
- **Question Types:** Multiple Choice (MCQ), Multiple Answer (MAQ), True/False, Single Word Answer.
- **Dynamic Options:** Shuffle Questions and Shuffle Options for every candidate to prevent patterned cheating.
- **Test Policies:**
  - Standard Public Links vs **Private Invite-Only** Tests.
  - Expiry Dates (Strictly enforced at the minute).
  - Reveal Answers configurations (Show Immediately, Show After Expiry, Never Show).

### 🛡️ Iron-clad Candidate Security & Anti-Cheat
- **Mandatory Fullscreen:** Candidates cannot start without entering fullscreen, and exiting forces a prompt to re-enter.
- **Tab Switch Detection:** Moving away from the browser tab logs a violation. After **3 violations**, the test automatically submits.
- **Keyboard/Mouse Restrictions:** Blocks Right-click context menus, Copy, Cut, Paste.
- **DevTools Prevention:** Window resize listening detects open DevTools.
- **Anti-Back Navigation:** Prevents clicking the browser back button by overriding `pushState`.

### ⏱️ Session Intelligence & Background Autosaving
- **Session Locking:** Single test attempt enforcement tied rigidly to a candidate's email.
- **Auto-Submission:** Test submits instantaneously when the timer hits zero.
- **Periodic 15-second Autosaving:** Protects against browser crashes, accidental closures, or power outages. If the test formally expires and a candidate simply abandoned the page, the backend lazily auto-completes and evaluates the session using their last auto-saved answers!

## 💻 Running Locally

> [!WARNING]
> **Neon Database Credentials Required:** This project expects a live PostgreSQL instance for persistent storage.
> Before running the backend, you **MUST** configure your PostgreSQL (Neon) credentials in:
> `backend/src/main/resources/application.properties`
> *(Update `spring.datasource.url`, `spring.datasource.username`, and `spring.datasource.password`).*

### Backend (Spring Boot)
1. Ensure Java 21+ and Maven are installed.
2. In the `/backend` folder, configure your database credentials in `src/main/resources/application.properties`.
3. Run the backend server:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
4. *Note: Server runs on `http://localhost:8080`. Admin token can be found/set in `application.properties`.*

### Frontend (React / Vite)
1. Ensure Node.js is installed.
2. Navigate to the `/frontend` directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web interface at `http://localhost:5173`.

### Health Check
A dedicated health endpoint exists to monitor backend availability, particularly useful for free-tier cloud hosting cold starts.
`GET /health` -> `OK`

## 🌍 Cloud Deployment (Split Environment)

This repository is configured so you can seamlessly deploy the **Frontend to Vercel** and the **Backend to Render** just by selecting this repository on both platforms!

### 1. Render (Backend)
The backend is powered by Spring Boot and uses a `render.yaml` configuration file for 1-click deployments.
* Sign in to Render and click **New > Blueprint**.
* Connect this repository. Render will automatically read the `render.yaml` and configure a Java Web Service.
* In the Render Dashboard for `examflow-backend`, click **Environment** and insert your Neon DB values:
  * `SPRING_DATASOURCE_URL`
  * `SPRING_DATASOURCE_USERNAME`
  * `SPRING_DATASOURCE_PASSWORD`

### 2. Vercel (Frontend)
The frontend uses Vite and a `vercel.json` config file for 1-click deployments.
* Sign in to Vercel and click **Add New > Project**.
* Import this repository.
* Before clicking Deploy, expand the **Environment Variables** section and add:
  * `VITE_API_URL` -> *(Paste the Render backend URL here, e.g. `https://examflow-backend.onrender.com`)*
* Click **Deploy**. Vercel will process the root `package.json` script (`npm run vercel-build`), build the frontend, and auto-configure React Router paths!

## 👥 Usage Flow
- **Admin:** Login to `/admin/login` using the token (default: `admin123`). Create tests, set them to public/private, publish them, and monitor results in real-time.
- **Candidate:** Register or login at `/login`. Public test links add the test to your dashboard automatically. Private tests appear automatically for invited emails.

---
*Built with ❤️ for secure and reliable evaluation.*

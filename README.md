# SPECTER // Supply Chain Threat Intelligence

**"The ghosts in your codebase. Made visible."**

> **[Live Demo: specter-seven.vercel.app](https://specter-seven.vercel.app/)**

Specter is not another static security dashboard. It is an immersive, 3D threat intelligence platform that maps your repository's attack surface in real-time. By visualizing dependency trees, commit history, and runtime environments as spatial nodes, Specter reveals the "ghosts"—malicious code, secrets, and insecure configurations—that standard scanners miss.

---

## 👁 The Intelligence Engine

Specter runs 5 specialized scanners in parallel to generate a holistic threat score (0–100) for any GitHub repository:

| Scanner | Intelligence Focus |
| --- | --- |
| **DepChain** | Maps the dependency tree & surfaces transitive CVEs using OSV.dev telemetry. |
| **GhostCommit** | Analyzes commit history for high-entropy strings, secrets, and malicious injection patterns. |
| **LayerScan** | Parses Dockerfile instructions to detect root-user escalation, unpinned images, and secret baking. |
| **APIBleed** | Maps public API surfaces to identify unauthenticated write-endpoints and missing rate limits. |
| **EnvTrace** | Traces source code for hardcoded credentials and detects insecure environment file commits. |

---

## 🚀 Key Features

* **Immersive 3D HUD:** Powered by `react-three-fiber`. Dependency graphs, attack paths, and secret timelines are rendered in a 3D tactical space, allowing you to spatially understand how an attacker moves through your application.
* **AI-Native Analysis:** Powered by Gemini/OpenRouter, Specter doesn't just list CVEs. It provides an "Intelligence Brief" that translates complex vulnerability data into actionable remediation steps and real-world impact scenarios.
* **Automated Monitoring:** Integrated with [n8n](https://n8n.io) to monitor your GitHub organization for new commits. Receive real-time alerts directly in your Telegram or Slack when a scan detects high-entropy strings or dependency vulnerabilities.
* **Exportable Intel:** Generates high-fidelity PDF intelligence reports containing your vulnerability surface area and top remediation priorities, ready for audit or team review.

---

## 🛠 Tech Stack

Specter is built with a high-performance stack designed for real-time telemetry:

* **Frontend:** Next.js 16 (App Router), Tailwind CSS, Framer Motion (for UI orchestration), and `three.js` / `react-three-fiber` (for the 3D HUD).
* **Intelligence:** OpenRouter (AI analysis), OSV.dev (vulnerability database), and GitHub REST API (telemetry).
* **Backend & Sync:** Supabase (Database + Auth), n8n (Orchestration & Telegram alerts).

---

## 🚀 Setup & Installation

1. **Clone the repository:**
```bash
git clone https://github.com/AnishPrakash/specter.git
cd specter

```


2. **Install dependencies:**
```bash
npm install

```


3. **Configure Environment Variables:**
Create a `.env.local` file at the root:
```env
GITHUB_TOKEN=your_github_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role
OPENROUTER_API_KEY=your_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

```


4. **Launch the System:**
```bash
npm run dev

```



---

## 🛡 Security Philosophy

Specter follows a "Cold Industrial Intelligence" design. We believe that security data is high-density and high-impact; it should not be hidden behind rounded corners, excessive gradients, or generic SaaS aesthetics. By prioritizing spatial data, mono-spacing, and immediate visual hierarchy, Specter provides security teams with the clarity required to stop supply chain attacks before they materialize.

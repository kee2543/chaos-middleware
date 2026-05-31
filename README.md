# 💥 Chaos Middleware

A proxy layer between client and server that injects controlled failures — **latency**, **errors**, and **drops** — to test system resilience.

Built for [QueX](https://github.com/kee2543/QueX) (Virtual Queue Management System).

---

## 🏗️ Architecture

```
┌──────────┐       ┌─────────────────────┐       ┌──────────────┐
│  Client  │──────▶│  Chaos Middleware    │──────▶│  QueX Server │
│ (Browser)│◀──────│     :4000           │◀──────│    :5000     │
└──────────┘       │                     │       └──────────────┘
                   │  ┌───────────────┐  │
                   │  │ Chaos Engine  │  │
                   │  │ • Latency     │  │
                   │  │ • Failures    │  │
                   │  │ • Drops       │  │
                   │  │ • WS Loss     │  │
                   │  └───────────────┘  │
                   └─────────────────────┘
```

Instead of pointing the client directly to the backend, traffic is routed through the middleware. The **Chaos Engine** probabilistically intercepts requests and applies one of the following:

| Chaos Type         | What Happens                                    |
| ------------------ | ----------------------------------------------- |
| **Latency**        | Artificial delay (configurable min/max ms)       |
| **Failure**        | Returns HTTP 500 without reaching the backend    |
| **Drop**           | Destroys the connection (simulates timeout)      |
| **WS Packet Loss** | Drops WebSocket upgrade before handshake         |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A running backend server (e.g., QueX on port 5000)

### Installation

```bash
git clone https://github.com/kee2543/chaos-middleware.git
cd chaos-middleware
npm install
```

### Configuration

Create a `.env` file in the root directory:

```env
PORT=4000
TARGET_URL=http://localhost:5000
```

| Variable     | Description                     | Default                  |
| ------------ | ------------------------------- | ------------------------ |
| `PORT`       | Port the middleware listens on  | `4000`                   |
| `TARGET_URL` | Backend server to proxy to      | `http://localhost:5000`  |

### Run

```bash
npm start
```

You should see:

```
╔════════════════════════════════════════════╗
║                                            ║
║        💥 CHAOS MIDDLEWARE ACTIVE 💥        ║
║                                            ║
╚════════════════════════════════════════════╝
 Listening on:  http://localhost:4000
 Proxying to:   http://localhost:5000
```

---

## 🎛️ Control Dashboard

Open **http://localhost:4000** in your browser to access the Chaos Control Center.

From the dashboard you can:

- **Toggle** chaos injection on/off with one click
- **Adjust** latency range, failure rate, drop rate, and WS packet loss using sliders
- **Monitor** real-time metrics (total requests, failures, drops, delayed)
- **Apply** configuration changes instantly — no restart needed

---

## 📡 Admin API

### Get Current Config

```http
GET /admin/config
```

**Response:**

```json
{
  "enabled": true,
  "latency": { "min": 100, "max": 1000 },
  "failureRate": 0.1,
  "dropRate": 0.05,
  "packetLoss": 0.1
}
```

### Update Config

```http
POST /admin/config
Content-Type: application/json
```

**Body (partial updates supported):**

```json
{
  "enabled": true,
  "latency": { "min": 0, "max": 2000 },
  "failureRate": 0.2,
  "dropRate": 0.1,
  "packetLoss": 0.1
}
```

### Get Metrics

```http
GET /admin/metrics
```

**Response:**

```json
{
  "totalRequests": 142,
  "successfulRequests": 0,
  "failedRequests": 15,
  "droppedRequests": 7,
  "latencyApplied": 120
}
```

---

## ⚙️ Configuration Schema

| Parameter            | Type    | Range     | Description                              |
| -------------------- | ------- | --------- | ---------------------------------------- |
| `enabled`            | boolean | —         | Global toggle for chaos injection         |
| `latency.min`        | number  | ≥ 0       | Minimum artificial delay (ms)             |
| `latency.max`        | number  | ≥ min     | Maximum artificial delay (ms)             |
| `failureRate`        | number  | 0–1       | Probability of returning HTTP 500         |
| `dropRate`           | number  | 0–1       | Probability of dropping the connection    |
| `packetLoss`         | number  | 0–1       | Probability of dropping WS connections    |

### Constraints

- `0 ≤ failureRate ≤ 1`
- `0 ≤ dropRate ≤ 1`
- `0 ≤ packetLoss ≤ 1`
- `latency.min ≤ latency.max`

---

## 🧪 Demo Walkthrough

### 1. Normal Flow (Chaos OFF)

```bash
# Disable chaos
curl -X POST http://localhost:4000/admin/config \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Send a request — passes through cleanly
curl http://localhost:4000/api/queues
```

### 2. Inject Latency

```bash
curl -X POST http://localhost:4000/admin/config \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "latency": {"min": 500, "max": 2000}, "failureRate": 0, "dropRate": 0}'

# This request will be delayed 500–2000ms
curl http://localhost:4000/api/queues
```

### 3. Inject Failures

```bash
curl -X POST http://localhost:4000/admin/config \
  -H "Content-Type: application/json" \
  -d '{"failureRate": 0.5}'

# ~50% of requests will return 500
curl http://localhost:4000/api/queues
```

### 4. Disable Chaos → Normal Again

```bash
curl -X POST http://localhost:4000/admin/config \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

---

## 📁 Project Structure

```
chaos-middleware/
├── index.js          # Core server — proxy, chaos engine, APIs
├── dashboard.html    # Control Center UI
├── .env              # Environment variables
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

---

## 🛠️ Tech Stack

| Technology   | Purpose                          |
| ------------ | -------------------------------- |
| Node.js      | Runtime                          |
| Express.js   | HTTP framework and routing       |
| http-proxy   | Reverse proxy (HTTP + WebSocket) |
| chalk        | Color-coded terminal logging     |
| dotenv       | Environment variable management  |

---

## 📊 Terminal Logging

The middleware uses color-coded logs for easy monitoring:

| Log Tag          | Color   | Meaning                          |
| ---------------- | ------- | -------------------------------- |
| `[FORWARD]`      | 🔵 Blue   | Request forwarded to backend     |
| `[DELAY]`        | 🟡 Yellow | Latency injected                 |
| `[FAIL]`         | 🔴 Red    | 500 error returned               |
| `[DROP]`         | ⬛ BgRed  | Connection destroyed             |
| `[WS-UPGRADE]`   | 🔵 Blue   | WebSocket forwarded              |
| `[WS-DROP]`      | 🟣 Magenta| WebSocket connection dropped     |
| `[CONFIG]`       | 🟢 Green  | Configuration updated            |
| `[Proxy Error]`  | 🔴 Red    | Backend unreachable              |

---

## 📝 License

ISC

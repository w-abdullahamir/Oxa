# Oxa Frontend

Oxa is a **privacy-first, real-time, ephemeral chat application** built with React Native (Expo).  
This repository contains the **frontend (mobile client)** of the Oxa ecosystem.

---

## 🚀 Core Philosophy

Oxa is designed to mimic **real-life conversations**:

- ❌ No message storage (no DB, no backups)
- ❌ No message editing or deletion
- ❌ No offline delivery
- ✅ Messages exist **only in memory (RAM)**
- ✅ End-to-end encrypted communication
- ✅ Peer-to-Peer (WebRTC) first architecture

---

## 📱 Features

- 🔐 Secure authentication (email + OTP)
- 💬 Real-time messaging (P2P + fallback routing)
- 🧠 Ephemeral messages (auto-destroyed)
- 🖼️ Media sharing (images, audio, etc. to be implemented)
- 👥 Dynamic 1-to-1 → room transition
- 🚫 Screenshot & screen recording protection (planned)
- 🔑 Forward secrecy & key rotation (planned)

---

## 🏗️ Tech Stack

- **Framework:** React Native (Expo SDK)
- **Language:** TypeScript / JavaScript
- **State Management:** (e.g., Zustand / Redux — update if needed)
- **Networking:** WebRTC + WebSocket (signaling)
- **Crypto:** End-to-End Encryption (custom / libs)
- **Storage:** In-memory (no persistent storage)

---

## 📂 Project Structure

```

src/
│── components/      # Reusable UI components
│── app/             # App screens (views)
│── services/        # token store
│── hooks/           # Custom hooks (e.g., API, WebRTC, signaling logic)
│── utils/           # Helper functions

````

---

## ⚙️ Setup & Installation

### 1. Clone Repo
```bash
git clone https://github.com/Oxa-Messenger/Oxa-Frontend.git
cd Oxa-Frontend
````

### 2. Install Dependencies

```bash
npm ci
```

### 3. Set Enviroment Variable

Create a `.env` file and set the backend URL:
```bash
EXPO_PUBLIC_OXA_BACKEND_URL=http://<your_ip_address>:10000
```

### 4. Start Development Server

```bash
npm run start  # Open Expo Go
```
#### OR
```bash
npm run android  # Run on Emulator/Device
```

---

## 🔐 Security Principles

* Zero-trust architecture
* Server **never accesses plaintext messages**
* Strong encryption with forward secrecy
* No logs of sensitive data
* Hostile-client assumption

---

## 🔄 Architecture Overview

```
Client ↔ Signaling Server ↔ Client
        ↘ WebRTC P2P ↙
```

* Server is used only for:

  * Authentication
  * Signaling
  * Presence
  * Fallback routing

---

## 🚧 Roadmap

* [ ] P2P messaging (WebRTC)
* [ ] Encryption layer (E2EE)
* [ ] Media transfer optimization
* [ ] Key rotation mechanism
* [ ] Screenshot blocking
* [ ] Performance optimization

# DealFlow360 — Setup & Deployment Guide

## 1. Local Development Environment

### Step A: Clone & Environment Variables
```bash
git clone https://github.com/Sahil073/Team149_odooHackathon2026.git
cd Team149_odooHackathon2026
cp .env.example backend/core-api/.env
```

### Step B: Core API Setup
```bash
cd backend/core-api
npm install
npm run db:push
npm run seed
```

### Step C: Smart Layer Setup
```bash
cd ../smart-layer
python -m venv .venv
# On Windows: .venv\Scripts\activate | On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python train_win_predictor.py
```

### Step D: Frontend Setup
```bash
cd ../../frontend
npm install
```

### Step E: Running Services
In 3 separate terminal sessions (or via root monorepo scripts):
```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:smart-layer

# Terminal 3
npm run dev:frontend
```

---

## 2. Render Cloud Deployment

### Web Service 1: Core API (`dealflow360-backend`)
- **Runtime**: Node
- **Root Directory**: `backend/core-api`
- **Build Command**: `npm install && npm run db:push && npm run build && npm run seed`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `DATABASE_URL`: `postgresql://...`
  - `SMART_LAYER_BASE_URL`: `https://dealflow360-smart-layer.onrender.com`
  - `REDIS_URL`: `redis://...`

### Web Service 2: Smart Layer (`dealflow360-smart-layer`)
- **Runtime**: Python 3.11.9
- **Root Directory**: `backend/smart-layer`
- **Build Command**: `pip install -r requirements.txt && python train_win_predictor.py`
- **Start Command**: `uvicorn gateway:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `PYTHON_VERSION`: `3.11.9`
  - `REDIS_URL`: `redis://...`

### Web Service / Static Site 3: Frontend
- **Runtime**: Static Site (or Node)
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: `https://dealflow360-backend.onrender.com/api`

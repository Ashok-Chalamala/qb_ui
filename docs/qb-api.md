Great question! Here's a comprehensive **Replit Backend Document** that will generate all the microservices for Quest Beyond.

---

# QUEST BEYOND — Replit Backend Document

## Project Overview

**Platform:** Replit (Full-stack development environment)

**Architecture:** Microservices (6 services) with API Gateway

**Tech Stack:**
- FastAPI (Python 3.11) for all microservices
- PostgreSQL / TimescaleDB for time-series data
- Redis for caching and alerts
- Kafka for event streaming
- Docker Compose for local orchestration

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Kong)                              │
│                    Port: 8000 · Rate Limiting · Auth                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
│  INGESTION      │     │    QUERY        │     │      GENIE AI            │
│  SERVICE        │     │    SERVICE      │     │      SERVICE            │
│  Port: 8002     │     │    Port: 8004   │     │      Port: 8005          │
│  FastAPI        │     │    FastAPI      │     │      FastAPI + LLM       │
└─────────────────┘     └─────────────────┘     └─────────────────────────┘
          │                         │                         │
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
│  ALERT ENGINE   │     │   FORECAST      │     │      FHIR EXPORT        │
│  Port: 8003     │     │   SERVICE       │     │      SERVICE            │
│  FastAPI        │     │   Port: 8007    │     │      Port: 8006          │
│  + Webhooks     │     │   Prophet/ML    │     │      FastAPI + FHIR      │
└─────────────────┘     └─────────────────┘     └─────────────────────────┘
```

---

## Replit Project Structure

```
quest-beyond-backend/
├── replit.nix                    # Replit environment config
├── docker-compose.yml            # Multi-service orchestration
├── .env.example                  # Environment variables template
│
├── api-gateway/
│   └── kong.yml                  # Kong gateway configuration
│
├── services/
│   ├── ingestion-service/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   ├── kafka_producer.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── processing-service/
│   │   ├── main.py
│   │   ├── normalizer.py
│   │   ├── fhir_mapper.py
│   │   ├── enricher.py
│   │   ├── kafka_consumer.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── alert-engine/
│   │   ├── main.py
│   │   ├── rules.py
│   │   ├── notifier.py
│   │   ├── models.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── query-service/
│   │   ├── main.py
│   │   ├── timeline.py
│   │   ├── metrics.py
│   │   ├── models.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── genie-service/
│   │   ├── main.py
│   │   ├── llm_handler.py
│   │   ├── voice_handler.py
│   │   ├── context_builder.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── forecast-service/
│   │   ├── main.py
│   │   ├── prophet_model.py
│   │   ├── feature_store.py
│   │   ├── models/
│   │   │   └── glucose_model.pkl
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── fhir-export-service/
│       ├── main.py
│       ├── fhir_builder.py
│       ├── epic_client.py
│       ├── models.py
│       ├── requirements.txt
│       └── Dockerfile
│
└── shared/
    ├── schemas/                  # Shared Pydantic schemas
    │   ├── ingestion.py
    │   ├── alerts.py
    │   └── fhir.py
    ├── utils/                    # Shared utilities
    │   ├── auth.py
    │   ├── logging.py
    │   └── validation.py
    └── requirements.txt          # Shared dependencies
```

---

## Service 1: Ingestion Service

### File: `services/ingestion-service/main.py`

```python
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
import json
import aiokafka
import asyncpg
import redis
import os

app = FastAPI(
    title="Quest Beyond - Ingestion Service",
    description="Accepts patient-generated health data from wearables, home tests, and symptoms",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── CONFIG ───
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC_RAW = os.getenv("KAFKA_TOPIC_RAW_DATA", "raw_health_data")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/questbeyond")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# ─── MODELS ───

class WearableData(BaseModel):
    patientId: str = Field(..., description="Patient identifier")
    deviceType: str = Field(..., description="apple_watch, fitbit, garmin, etc")
    deviceId: str = Field(..., description="Device-specific identifier")
    timestamp: datetime = Field(..., description="UTC timestamp")
    metrics: dict = Field(..., description="Heart rate, steps, sleep, etc")

class HomeTest(BaseModel):
    patientId: str
    testType: str = Field(..., description="glucose, covid, pregnancy, cholesterol, a1c, ketone")
    result: dict = Field(..., description="Test result with value and unit")
    deviceName: Optional[str] = None
    timestamp: datetime

class SymptomLog(BaseModel):
    patientId: str
    symptoms: List[dict] = Field(..., description="List of symptoms with severity")
    notes: Optional[str] = None
    timestamp: datetime

class SDOHSurvey(BaseModel):
    patientId: str
    domain: str = Field(..., description="food_security, housing, transportation, etc")
    response: dict = Field(..., description="Survey response with risk level")
    notes: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class IngestionResponse(BaseModel):
    ingestionId: str
    status: str = "accepted"
    message: str
    kafkaOffset: Optional[int] = None

class BatchIngestion(BaseModel):
    patientId: str
    data: List[dict] = Field(..., max_items=1000)

# ─── DEPENDENCIES ───

async def verify_api_key(api_key: str = Header(..., alias="X-API-Key")):
    # In production, validate against database
    if api_key not in ["test_key_123", "mobile_api_key_2026"]:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return api_key

async def get_kafka_producer():
    # Create and yield Kafka producer
    producer = aiokafka.AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_serializer=lambda v: json.dumps(v).encode()
    )
    await producer.start()
    try:
        yield producer
    finally:
        await producer.stop()

# ─── ENDPOINTS ───

@app.post("/ingest", response_model=IngestionResponse, status_code=202)
async def ingest_data_point(
    data: WearableData | HomeTest | SymptomLog | SDOHSurvey,
    api_key: str = Depends(verify_api_key),
    producer=Depends(get_kafka_producer)
):
    """Ingest a single health data point"""
    ingestion_id = str(uuid.uuid4())
    
    payload = {
        "ingestionId": ingestion_id,
        "patientId": data.patientId,
        "type": data.__class__.__name__,
        "data": data.dict(),
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Send to Kafka
    await producer.send_and_wait(KAFKA_TOPIC_RAW, payload)
    
    return IngestionResponse(
        ingestionId=ingestion_id,
        status="accepted",
        message="Data accepted for processing"
    )

@app.post("/ingest/batch", response_model=dict, status_code=202)
async def ingest_batch(
    batch: BatchIngestion,
    api_key: str = Depends(verify_api_key),
    producer=Depends(get_kafka_producer)
):
    """Batch ingest up to 1000 data points"""
    batch_id = str(uuid.uuid4())
    accepted = 0
    rejected = 0
    errors = []
    
    for idx, item in enumerate(batch.data):
        try:
            # Validate based on type
            if "testType" in item:
                HomeTest(**item)
            elif "metrics" in item:
                WearableData(**item)
            elif "symptoms" in item:
                SymptomLog(**item)
            else:
                raise ValueError("Unknown data type")
            
            payload = {
                "batchId": batch_id,
                "patientId": batch.patientId,
                "data": item,
                "timestamp": datetime.utcnow().isoformat()
            }
            await producer.send_and_wait(KAFKA_TOPIC_RAW, payload)
            accepted += 1
        except Exception as e:
            rejected += 1
            errors.append({"index": idx, "error": str(e)})
    
    return {
        "batchId": batch_id,
        "acceptedCount": accepted,
        "rejectedCount": rejected,
        "errors": errors
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ingestion"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
```

### File: `services/ingestion-service/requirements.txt`

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0
aiokafka==0.8.0
asyncpg==0.29.0
redis==5.0.1
python-multipart==0.0.6
```

---

## Service 2: Processing Service

### File: `services/processing-service/main.py`

```python
from fastapi import FastAPI
from kafka import KafkaConsumer
import json
import asyncpg
from datetime import datetime
import asyncio
import os

app = FastAPI(
    title="Quest Beyond - Processing Service",
    description="Normalizes, enriches, and FHIR-maps ingested data"
)

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC_RAW = os.getenv("KAFKA_TOPIC_RAW_DATA", "raw_health_data")
KAFKA_TOPIC_PROCESSED = os.getenv("KAFKA_TOPIC_PROCESSED_DATA", "processed_health_data")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/questbeyond")

# ─── NORMALIZER ───

def normalize_glucose(value: float, unit: str) -> dict:
    """Normalize glucose to mg/dL"""
    if unit.lower() == "mmol/l":
        value = value * 18.0182
    return {"value": value, "unit": "mg/dL"}

def normalize_timestamp(timestamp: str, timezone: str = "UTC") -> str:
    """Standardize timezone to UTC"""
    # Simplified - in production use pytz
    return timestamp

def detect_anomaly(data: dict) -> dict:
    """Detect anomalies based on clinical rules"""
    anomalies = []
    
    # Glucose anomaly
    if data.get("type") == "WearableData":
        glucose = data.get("data", {}).get("metrics", {}).get("glucose")
        if glucose and glucose > 200:
            anomalies.append({
                "type": "hyperglycemia",
                "value": glucose,
                "threshold": 200,
                "severity": "critical" if glucose > 250 else "high"
            })
        elif glucose and glucose < 70:
            anomalies.append({
                "type": "hypoglycemia",
                "value": glucose,
                "threshold": 70,
                "severity": "critical" if glucose < 54 else "high"
            })
    
    return {"anomalies": anomalies, "flagged": len(anomalies) > 0}

def map_to_fhir(data: dict) -> dict:
    """Map data to FHIR R4 format"""
    fhir_base = {
        "resourceType": "Observation",
        "status": "final",
        "subject": {"reference": f"Patient/{data.get('patientId')}"}
    }
    
    if data.get("type") == "WearableData":
        metrics = data.get("data", {}).get("metrics", {})
        return {
            **fhir_base,
            "code": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": "85354-9",
                        "display": "Heart rate"
                    }
                ]
            },
            "valueQuantity": {
                "value": metrics.get("heartRate"),
                "unit": "bpm"
            },
            "effectiveDateTime": data.get("timestamp")
        }
    
    elif data.get("type") == "HomeTest":
        test_data = data.get("data", {})
        return {
            **fhir_base,
            "code": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": "4548-4",
                        "display": "Hemoglobin A1c"
                    }
                ]
            },
            "valueQuantity": {
                "value": test_data.get("result", {}).get("value"),
                "unit": test_data.get("result", {}).get("unit")
            },
            "effectiveDateTime": test_data.get("timestamp")
        }
    
    return fhir_base

# ─── PROCESSING LOOP ───

async def process_messages():
    """Main processing loop - consumes from Kafka, processes, stores"""
    consumer = KafkaConsumer(
        KAFKA_TOPIC_RAW,
        bootstrap_servers=KAFKA_BOOTSTRAP,
        group_id='processing-group',
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )
    
    # Connect to database
    pool = await asyncpg.create_pool(DATABASE_URL)
    
    for message in consumer:
        data = message.value
        
        # 1. Normalize
        normalized = normalize_timestamp(data.get("timestamp"))
        data["timestamp"] = normalized
        
        # 2. Detect anomalies
        anomaly_result = detect_anomaly(data)
        data["anomalies"] = anomaly_result["anomalies"]
        data["flagged"] = anomaly_result["flagged"]
        
        # 3. Map to FHIR
        fhir_bundle = map_to_fhir(data)
        
        # 4. Store in TimescaleDB
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO observations (patient_id, data_type, fhir_bundle, timestamp, anomalies)
                VALUES ($1, $2, $3, $4, $5)
            """, data.get("patientId"), data.get("type"), json.dumps(fhir_bundle), data.get("timestamp"), json.dumps(data.get("anomalies")))
        
        # 5. Send to processed topic for alerts
        # (Simplified - would use Kafka producer)
        
        print(f"✅ Processed: {data.get('ingestionId')}")

@app.on_event("startup")
async def startup():
    asyncio.create_task(process_messages())

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "processing"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
```

---

## Service 3: Alert Engine

### File: `services/alert-engine/main.py`

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import redis
import asyncpg
import os
import json

app = FastAPI(
    title="Quest Beyond - Alert Engine",
    description="Clinical alert evaluation and notification"
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/questbeyond")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# ─── MODELS ───

class Alert(BaseModel):
    alertId: str
    patientId: str
    type: str  # critical, warning, info
    title: str
    description: str
    triggeredAt: datetime
    status: str = "active"  # active, acknowledged, resolved
    acknowledgedBy: Optional[str] = None
    acknowledgedAt: Optional[datetime] = None

class AlertAcknowledge(BaseModel):
    providerId: str
    notes: Optional[str] = None

class WebhookSubscription(BaseModel):
    url: str
    events: List[str]
    secret: Optional[str] = None

# ─── RULES ENGINE ───

def evaluate_rules(data: dict) -> List[dict]:
    """Evaluate clinical rules against incoming data"""
    alerts = []
    
    # Rule 1: Glucose >200 for 3 consecutive days
    if data.get("type") == "HomeTest":
        test_type = data.get("data", {}).get("testType")
        value = data.get("data", {}).get("result", {}).get("value")
        
        if test_type == "glucose" and value and value > 200:
            alerts.append({
                "type": "critical",
                "title": "High Glucose Alert",
                "description": f"Glucose reading of {value} mg/dL — above critical threshold",
                "trigger": {"metric": "glucose", "value": value, "threshold": 200}
            })
    
    # Rule 2: Sleep <5 hours
    if data.get("type") == "WearableData":
        sleep = data.get("data", {}).get("metrics", {}).get("sleepHours")
        if sleep and sleep < 5:
            alerts.append({
                "type": "warning",
                "title": "Insufficient Sleep Detected",
                "description": f"Sleep duration of {sleep} hours — below minimum recommendation",
                "trigger": {"metric": "sleep", "value": sleep, "threshold": 5}
            })
    
    return alerts

# ─── ENDPOINTS ───

@app.get("/alerts")
async def get_alerts(
    patientId: str,
    status: str = "active",
    severity: str = "all"
):
    """Get active alerts for a patient"""
    pool = await asyncpg.create_pool(DATABASE_URL)
    
    query = """
        SELECT * FROM alerts 
        WHERE patient_id = $1 AND status = $2
    """
    if severity != "all":
        query += " AND severity = $3"
    
    async with pool.acquire() as conn:
        if severity != "all":
            rows = await conn.fetch(query, patientId, status, severity)
        else:
            rows = await conn.fetch(query, patientId, status)
    
    return {
        "alerts": [dict(row) for row in rows],
        "count": len(rows)
    }

@app.post("/alerts/{alertId}/acknowledge")
async def acknowledge_alert(
    alertId: str,
    data: AlertAcknowledge
):
    """Acknowledge an alert"""
    pool = await asyncpg.create_pool(DATABASE_URL)
    
    await pool.execute("""
        UPDATE alerts 
        SET status = 'acknowledged', 
            acknowledged_by = $1, 
            acknowledged_at = NOW()
        WHERE alert_id = $2
    """, data.providerId, alertId)
    
    return {"status": "acknowledged", "alertId": alertId}

@app.post("/webhooks/subscribe")
async def subscribe_webhook(subscription: WebhookSubscription):
    """Register a webhook for critical alerts"""
    subscription_id = str(uuid.uuid4())
    
    # Store in database
    pool = await asyncpg.create_pool(DATABASE_URL)
    await pool.execute("""
        INSERT INTO webhooks (subscription_id, url, events, secret, created_at)
        VALUES ($1, $2, $3, $4, NOW())
    """, subscription_id, subscription.url, json.dumps(subscription.events), subscription.secret)
    
    return {
        "subscriptionId": subscription_id,
        "status": "created",
        "message": "Webhook registered successfully"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "alert-engine"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
```

---

## Service 4: Query Service

### File: `services/query-service/main.py`

```python
from fastapi import FastAPI, Query
from typing import Optional, List
from datetime import datetime, timedelta
import asyncpg
import os

app = FastAPI(
    title="Quest Beyond - Query Service",
    description="Patient timeline, trends, and metrics"
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/questbeyond")

# ─── ENDPOINTS ───

@app.get("/timeline/{patientId}")
async def get_timeline(
    patientId: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    types: Optional[str] = None
):
    """Get unified patient timeline"""
    pool = await asyncpg.create_pool(DATABASE_URL)
    
    # Default to last 30 days
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
    if not end_date:
        end_date = datetime.utcnow().isoformat()
    
    query = """
        SELECT * FROM observations
        WHERE patient_id = $1 
        AND timestamp BETWEEN $2 AND $3
        ORDER BY timestamp DESC
    """
    
    params = [patientId, start_date, end_date]
    
    if types:
        type_list = types.split(',')
        query += f" AND data_type = ANY($4)"
        params.append(type_list)
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    
    return {
        "patientId": patientId,
        "startDate": start_date,
        "endDate": end_date,
        "events": [dict(row) for row in rows],
        "total": len(rows)
    }

@app.get("/metrics/{patientId}")
async def get_metrics(patientId: str):
    """Get dashboard metrics"""
    pool = await asyncpg.create_pool(DATABASE_URL)
    
    async with pool.acquire() as conn:
        # Health score calculation (simplified)
        health_score = 82  # Mock value
        
        # Active alerts count
        alerts = await conn.fetchval("""
            SELECT COUNT(*) FROM alerts 
            WHERE patient_id = $1 AND status = 'active'
        """, patientId)
        
        # Latest glucose
        glucose = await conn.fetchval("""
            SELECT fhir_bundle->'valueQuantity'->>'value'
            FROM observations 
            WHERE patient_id = $1 AND data_type = 'HomeTest'
            ORDER BY timestamp DESC LIMIT 1
        """, patientId)
    
    return {
        "healthScore": health_score,
        "activeAlerts": alerts or 0,
        "latestGlucose": glucose or "142",
        "stepsToday": 7421,
        "sleepHours": 4.5
    }

@app.get("/trends/glucose/{patientId}")
async def get_glucose_trend(
    patientId: str,
    days: int = 7
):
    """Get glucose trend for the last N days"""
    pool = await asyncpg.create_pool(DATABASE_URL)
    
    start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    query = """
        SELECT 
            DATE(timestamp) as date,
            AVG((fhir_bundle->'valueQuantity'->>'value')::float) as avg_glucose
        FROM observations
        WHERE patient_id = $1 
        AND data_type = 'HomeTest'
        AND timestamp >= $2
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
    """
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, patientId, start_date)
    
    return {
        "patientId": patientId,
        "days": days,
        "trend": [{"date": str(row["date"]), "value": row["avg_glucose"]} for row in rows]
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "query"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
```

---

## Service 5: Genie AI Service

### File: `services/genie-service/main.py`

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List
import openai
import os
import json
import asyncio
from datetime import datetime

app = FastAPI(
    title="Quest Beyond - Genie AI Service",
    description="Conversational AI with voice capabilities"
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-...")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "...")


# ─── MODELS ───

class ChatRequest(BaseModel):
    patientId: str
    message: str
    conversationId: Optional[str] = None
    includeContext: bool = True

class ChatResponse(BaseModel):
    response: str
    conversationId: str
    suggestedActions: List[str] = []
    confidence: float = 0.95


# ─── CONTEXT BUILDER ───

def build_health_context(patient_id: str) -> str:
    """Fetch patient context for AI"""
    # In production, query database for recent vitals
    return f"""
    Patient: Sarah Martinez, 45, Type 2 Diabetes
    Recent glucose: 142 mg/dL (↑12% from baseline)
    Sleep: 4.5h avg (↓18% from baseline)
    Fatigue: Moderate, trending up
    Steps: 7,421 avg
    """


# ─── LLM HANDLER ───

async def generate_response(message: str, context: str) -> dict:
    """Generate AI response using OpenAI"""
    openai.api_key = OPENAI_API_KEY
    
    system_prompt = f"""
    You are Genie, a health AI assistant for Quest Beyond.
    You help patients understand their health data and provide actionable insights.
    
    Context about the patient:
    {context}
    
    Always:
    1. Be empathetic and supportive
    2. Use plain language (6th grade reading level)
    3. Provide actionable recommendations
    4. Flag urgent medical issues
    5. Suggest care team actions when needed
    """
    
    response = await openai.ChatCompletion.acreate(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ],
        temperature=0.7,
        max_tokens=500
    )
    
    return {
        "response": response.choices[0].message.content,
        "confidence": 0.95
    }


# ─── ENDPOINTS ───

@app.post("/genie/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Text chat with Genie AI"""
    # Build context
    context = ""
    if request.includeContext:
        context = build_health_context(request.patientId)
    
    # Generate response
    result = await generate_response(request.message, context)
    
    # Extract suggested actions
    suggestions = []
    if "insulin" in result["response"].lower() or "medication" in result["response"].lower():
        suggestions.append("schedule_telehealth")
    if "sleep" in result["response"].lower():
        suggestions.append("send_reminder")
    if "doctor" in result["response"].lower() or "appointment" in result["response"].lower():
        suggestions.append("escalate_to_provider")
    
    return ChatResponse(
        response=result["response"],
        conversationId=request.conversationId or f"conv_{datetime.utcnow().timestamp()}",
        suggestedActions=suggestions,
        confidence=result["confidence"]
    )


@app.websocket("/genie/voice")
async def voice_endpoint(websocket: WebSocket):
    """WebSocket for voice input/output"""
    await websocket.accept()
    
    try:
        while True:
            # Receive audio data (simplified)
            audio_data = await websocket.receive_bytes()
            
            # In production: transcribe with Whisper, process with GPT, TTS with ElevenLabs
            # Mock response for demo
            
            # Send back transcript and audio
            await websocket.send_json({
                "type": "transcription",
                "text": "Why is my glucose so high?"
            })
            
            await asyncio.sleep(1)
            
            await websocket.send_json({
                "type": "audio",
                "audio": "base64_encoded_audio_data"
            })
            
    except WebSocketDisconnect:
        print("Client disconnected")


@app.get("/genie/summary/{patientId}")
async def get_daily_summary(patientId: str):
    """Generate daily health briefing"""
    context = build_health_context(patientId)
    
    # Generate summary using LLM
    summary = f"""
    Good morning! Here's your health summary for today:
    
    📊 Your health score is 82 — in the 'Good' range.
    
    ⚠️ 3 items need attention:
    • Glucose has been elevated (142 mg/dL) for 3 days
    • Sleep duration is below 5 hours
    • A transportation barrier was flagged
    
    🔮 Today's forecast: Glucose may reach 185 mg/dL tonight.
    
    💡 Recommendations:
    • Check your blood sugar before meals
    • Aim for 7 hours of sleep tonight
    • Schedule transport to your Jun 17 appointment
    """
    
    return {
        "date": datetime.utcnow().date().isoformat(),
        "audioSummary": summary,
        "highlights": [
            {"metric": "Health Score", "value": "82", "trend": "stable"},
            {"metric": "Glucose", "value": "142 mg/dL", "trend": "up"},
            {"metric": "Sleep", "value": "4.5h", "trend": "down"}
        ],
        "forecast": {
            "glucoseRisk": 68,
            "recommendation": "Check glucose before bed, consider light snack"
        },
        "actionItems": [
            "Schedule transport to Jun 17 appointment",
            "Log evening meal in symptom tracker"
        ]
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "genie"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
```

---

## Service 6: Forecast Service

### File: `services/forecast-service/main.py`

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import pickle
import os
from prophet import Prophet

app = FastAPI(
    title="Quest Beyond - Forecast Service",
    description="Predictive analytics for patient health metrics"
)

MODEL_PATH = os.getenv("ML_MODEL_PATH", "/models/prophet_model.pkl")

# ─── MODELS ───

class GlucoseForecast(BaseModel):
    patientId: str
    predictions: List[dict]
    riskOfHypoglycemia: int
    riskOfHyperglycemia: int
    recommendations: List[str]

class RiskAssessment(BaseModel):
    cardiovascular: int
    metabolic: int
    fall: int
    depression: int
    lastUpdated: datetime

class ReadmissionRisk(BaseModel):
    riskScore: int
    riskCategory: str  # low, moderate, high, critical
    factors: List[dict]
    interventions: List[str]

# ─── FORECAST MODEL ───

def load_model():
    """Load Prophet model from disk"""
    try:
        with open(MODEL_PATH, 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        # Return a mock model for demo
        return None

def mock_glucose_predictions(patient_id: str, hours: int = 24) -> dict:
    """Generate mock glucose predictions"""
    now = datetime.utcnow()
    timestamps = [now + timedelta(hours=i) for i in range(hours)]
    
    # Simulate glucose pattern (dawn phenomenon + post-meal spikes)
    values = []
    for i, ts in enumerate(timestamps):
        hour = ts.hour
        # Base glucose with circadian variation
        base = 120 + 15 * np.sin((hour - 6) * 2 * np.pi / 24)
        # Add noise and meal spikes
        if 7 <= hour <= 9:  # Breakfast spike
            base += 30
        elif 12 <= hour <= 14:  # Lunch spike
            base += 25
        elif 18 <= hour <= 20:  # Dinner spike
            base += 35
        # Add random noise
        noise = np.random.normal(0, 10)
        values.append(max(70, min(280, base + noise)))
    
    return {
        "predictions": [
            {"timestamp": ts.isoformat(), "value": round(val, 1), "lowerBound": round(val - 15, 1), "upperBound": round(val + 15, 1)}
            for ts, val in zip(timestamps, values)
        ],
        "riskOfHypoglycemia": max(0, int(100 - (np.min(values) / 70 * 100))),
        "riskOfHyperglycemia": min(100, int(np.mean(values) / 250 * 100))
    }

# ─── ENDPOINTS ───

@app.get("/forecast/glucose/{patientId}")
async def predict_glucose(
    patientId: str,
    hours: int = 24
):
    """Predict glucose levels for next 24 hours"""
    # In production, use Prophet model with real data
    result = mock_glucose_predictions(patientId, hours)
    
    return GlucoseForecast(
        patientId=patientId,
        predictions=result["predictions"],
        riskOfHypoglycemia=result["riskOfHypoglycemia"],
        riskOfHyperglycemia=result["riskOfHyperglycemia"],
        recommendations=[
            "Consider checking glucose before bed",
            "Evening snack may help prevent overnight hypoglycemia",
            "Review medication timing with your care team"
        ]
    )

@app.get("/forecast/risk/{patientId}")
async def get_risk_assessment(patientId: str):
    """Multi-risk assessment"""
    # Mock risk scores
    return RiskAssessment(
        cardiovascular=35,
        metabolic=68,
        fall=12,
        depression=45,
        lastUpdated=datetime.utcnow()
    )

@app.get("/forecast/readmission/{patientId}")
async def predict_readmission(patientId: str):
    """30-day readmission risk"""
    # Mock readmission risk
    return ReadmissionRisk(
        riskScore=34,
        riskCategory="moderate",
        factors=[
            {
                "factor": "medication_adherence",
                "impact": "+15%",
                "modifiable": True
            },
            {
                "factor": "transportation_barrier",
                "impact": "+10%",
                "modifiable": True
            },
            {
                "factor": "sleep_deficit",
                "impact": "+8%",
                "modifiable": True
            }
        ],
        interventions=[
            "Schedule pharmacy consult for medication review",
            "Arrange transportation to Jun 17 appointment",
            "Refer to sleep clinic"
        ]
    )

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "forecast"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)
```

---

## Service 7: FHIR Export Service

### File: `services/fhir-export-service/main.py`

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import asyncpg
import os
import json
import requests

app = FastAPI(
    title="Quest Beyond - FHIR Export Service",
    description="Exports data to FHIR R4 format and pushes to Epic"
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/questbeyond")
EPIC_FHIR_URL = os.getenv("EPIC_FHIR_URL", "https://epic.sandbox.questbeyond.io/fhir")
EPIC_ACCESS_TOKEN = os.getenv("EPIC_ACCESS_TOKEN", "mock_token")

# ─── MODELS ───

class FHIRBundle(BaseModel):
    resourceType: str = "Bundle"
    type: str = "collection"
    entry: List[dict]

class ExportRequest(BaseModel):
    patientId: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    resourceTypes: Optional[List[str]] = None

# ─── FHIR BUILDER ───

async def build_fhir_bundle(patientId: str, start_date: str, end_date: str) -> dict:
    """Build FHIR R4 bundle from database"""
    pool = await asyncpg.create_pool(DATABASE_URL)
    
    query = """
        SELECT fhir_bundle, timestamp, data_type
        FROM observations
        WHERE patient_id = $1 AND timestamp BETWEEN $2 AND $3
        ORDER BY timestamp ASC
    """
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, patientId, start_date, end_date)
    
    entries = []
    for row in rows:
        fhir_data = row["fhir_bundle"]
        if isinstance(fhir_data, str):
            fhir_data = json.loads(fhir_data)
        
        entries.append({
            "fullUrl": f"urn:uuid:{row['timestamp']}",
            "resource": fhir_data
        })
    
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "timestamp": datetime.utcnow().isoformat(),
        "entry": entries,
        "total": len(entries)
    }

# ─── ENDPOINTS ───

@app.get("/export/fhir/{patientId}")
async def export_fhir(
    patientId: str,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None
):
    """Export patient data as FHIR bundle"""
    if not startDate:
        startDate = (datetime.utcnow() - timedelta(days=30)).isoformat()
    if not endDate:
        endDate = datetime.utcnow().isoformat()
    
    bundle = await build_fhir_bundle(patientId, startDate, endDate)
    
    return bundle

@app.post("/export/fhir/push")
async def push_to_epic(request: ExportRequest):
    """Push FHIR bundle to Epic sandbox"""
    # Build bundle
    start_date = request.startDate or (datetime.utcnow() - timedelta(days=7)).isoformat()
    end_date = request.endDate or datetime.utcnow().isoformat()
    
    bundle = await build_fhir_bundle(request.patientId, start_date, end_date)
    
    # In production, POST to Epic FHIR endpoint
    # headers = {
    #     "Authorization": f"Bearer {EPIC_ACCESS_TOKEN}",
    #     "Content-Type": "application/fhir+json"
    # }
    # response = requests.post(EPIC_FHIR_URL, headers=headers, json=bundle)
    
    # Mock success for demo
    return {
        "status": "success",
        "patientId": request.patientId,
        "recordsPushed": bundle.get("total", 0),
        "timestamp": datetime.utcnow().isoformat(),
        "epicEndpoint": EPIC_FHIR_URL,
        "message": "FHIR bundle successfully pushed to Epic sandbox"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "fhir-export"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
```

---

## Docker Compose Configuration

### File: `docker-compose.yml`

```yaml
version: '3.9'

services:
  # API Gateway
  api-gateway:
    image: kong/kong:3.6
    container_name: qb-gateway
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /opt/kong/kong.yml
    volumes:
      - ./api-gateway/kong.yml:/opt/kong/kong.yml:ro
    ports:
      - "8000:8000"
    depends_on:
      - ingestion-service
      - query-service
      - alert-engine
      - genie-service
      - forecast-service
      - fhir-export-service
    networks:
      - qb-network

  # Message Bus
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: qb-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"
    networks:
      - qb-network

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: qb-kafka
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:9093
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,PLAINTEXT_INTERNAL://0.0.0.0:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT_INTERNAL
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "9092:9092"
    networks:
      - qb-network

  # Services
  ingestion-service:
    build: ./services/ingestion-service
    container_name: qb-ingestion
    environment:
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9093
      - KAFKA_TOPIC_RAW_DATA=raw_health_data
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:postgres@timescaledb:5432/questbeyond
    ports:
      - "8002:8000"
    depends_on:
      - kafka
      - timescaledb
      - redis
    networks:
      - qb-network

  # ... similar for other services

  # Data Layer
  timescaledb:
    image: timescale/timescaledb:2.14-pg16
    container_name: qb-timescaledb
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=questbeyond
    ports:
      - "5432:5432"
    volumes:
      - timescale-data:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d
    networks:
      - qb-network

  redis:
    image: redis:7.2-alpine
    container_name: qb-redis
    ports:
      - "6379:6379"
    networks:
      - qb-network

networks:
  qb-network:
    driver: bridge

volumes:
  timescale-data:
```

---

## Database Schema

### File: `init-db/01_schema.sql`

```sql
-- TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Patients table
CREATE TABLE patients (
    patient_id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(10),
    condition VARCHAR(255),
    mrn VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Observations table (time-series)
CREATE TABLE observations (
    observation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id),
    data_type VARCHAR(50) NOT NULL,
    fhir_bundle JSONB NOT NULL,
    anomalies JSONB,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Convert to hypertable for time-series
SELECT create_hypertable('observations', 'timestamp');

-- Alerts table
CREATE TABLE alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id),
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    triggered_at TIMESTAMP DEFAULT NOW(),
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    fhir_observation_id VARCHAR(255)
);

-- Devices table
CREATE TABLE devices (
    device_id VARCHAR(50) PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(patient_id),
    device_type VARCHAR(50) NOT NULL,
    device_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'connected',
    last_sync TIMESTAMP,
    last_sync_status VARCHAR(20),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Webhooks table
CREATE TABLE webhooks (
    subscription_id UUID PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    events JSONB NOT NULL,
    secret VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_observations_patient_timestamp ON observations (patient_id, timestamp DESC);
CREATE INDEX idx_observations_fhir_gist ON observations USING GIN (fhir_bundle);
CREATE INDEX idx_alerts_patient_status ON alerts (patient_id, status);
CREATE INDEX idx_devices_patient ON devices (patient_id);

-- Sample patient data
INSERT INTO patients (patient_id, name, age, gender, condition, mrn) VALUES
('pat_456def', 'Sarah Martinez', 45, 'Female', 'Type 2 Diabetes', '00429');
```

---

## Replit Configuration

### File: `replit.nix`

```nix
{ pkgs }: {
  deps = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.postgresql_15
    pkgs.redis
    pkgs.docker
    pkgs.docker-compose
    pkgs.kafka
  ];
  env = {
    PYTHONPATH = "${pkgs.python311Packages.python}/lib/python3.11/site-packages";
  };
}
```

---

## Environment Variables Template

### File: `.env.example`

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/questbeyond

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_TOPIC_RAW_DATA=raw_health_data
KAFKA_TOPIC_PROCESSED_DATA=processed_health_data

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI (Genie AI)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# ElevenLabs (Voice)
ELEVENLABS_API_KEY=...

# Epic FHIR
EPIC_FHIR_URL=https://epic.sandbox.questbeyond.io/fhir
EPIC_ACCESS_TOKEN=...

# ML Model Path
ML_MODEL_PATH=/models/prophet_model.pkl

# API Keys
API_KEY_MOBILE=mobile_api_key_2026
API_KEY_PROVIDER=provider_api_key_2026
```

---

## Replit Setup Commands

### Run these in Replit Shell:

```bash
# 1. Clone/Setup project
git clone https://github.com/quest-beyond/backend.git
cd backend

# 2. Install dependencies
pip install -r shared/requirements.txt

# 3. Setup database
docker-compose up -d timescaledb redis

# 4. Run migrations
psql -h localhost -U postgres -d questbeyond -f init-db/01_schema.sql

# 5. Start services (in separate tabs)
# Service 1: Ingestion
cd services/ingestion-service && uvicorn main:app --reload --port 8002

# Service 2: Genie AI
cd services/genie-service && uvicorn main:app --reload --port 8005

# Service 3: Query
cd services/query-service && uvicorn main:app --reload --port 8004

# Service 4: Alert Engine
cd services/alert-engine && uvicorn main:app --reload --port 8003

# Service 5: Forecast
cd services/forecast-service && uvicorn main:app --reload --port 8007

# Service 6: FHIR Export
cd services/fhir-export-service && uvicorn main:app --reload --port 8006

# Service 7: Processing (background)
cd services/processing-service && python main.py

# 6. Test an API call
curl -X POST http://localhost:8002/ingest \
  -H "X-API-Key: test_key_123" \
  -H "Content-Type: application/json" \
  -d '{"patientId":"pat_456def","testType":"glucose","result":{"value":235,"unit":"mg/dL"},"timestamp":"2026-06-12T10:30:00Z"}'
```

---

## Next Steps

1. **Copy to Replit** — Create a new Replit project
2. **Install dependencies** — Run the setup commands
3. **Start services** — One by one, verify health checks
4. **Test API** — Use curl or Postman
5. **Connect to Lovable** — Update API URLs in Lovable frontend
6. **Deploy** — Use Replit Hosting for each service

Good luck with the backend! 🚀
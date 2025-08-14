import os
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.barbearia_urbana

# Pydantic models
class Service(BaseModel):
    id: str
    name: str
    description: str
    price: float
    duration_minutes: int

class ServiceCreate(BaseModel):
    name: str
    description: str
    price: float
    duration_minutes: int

class Appointment(BaseModel):
    id: str
    service_id: str
    service_name: str
    client_name: str
    client_phone: str
    client_email: str
    date: str
    time: str
    status: str
    created_at: datetime

class AppointmentCreate(BaseModel):
    service_id: str
    client_name: str
    client_phone: str
    client_email: str
    date: str
    time: str

class AvailableSlot(BaseModel):
    time: str
    available: bool

# Initialize default services
async def init_services():
    services_collection = db.services
    existing_services = await services_collection.find().to_list(length=None)
    
    if not existing_services:
        default_services = [
            {
                "id": str(uuid.uuid4()),
                "name": "Corte de Cabelo",
                "description": "Corte moderno e personalizado com acabamento profissional",
                "price": 30.0,
                "duration_minutes": 45
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Barba Completa",
                "description": "Aparar e modelar a barba com técnicas tradicionais",
                "price": 25.0,
                "duration_minutes": 30
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Corte + Barba",
                "description": "Pacote completo com corte de cabelo e barba",
                "price": 50.0,
                "duration_minutes": 60
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Sobrancelha",
                "description": "Modelagem e acabamento das sobrancelhas",
                "price": 15.0,
                "duration_minutes": 15
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Hidratação Capilar",
                "description": "Tratamento hidratante para cabelo e couro cabeludo",
                "price": 40.0,
                "duration_minutes": 50
            }
        ]
        await services_collection.insert_many(default_services)

@app.on_event("startup")
async def startup_event():
    await init_services()

# Services endpoints
@app.get("/api/services", response_model=List[Service])
async def get_services():
    services_collection = db.services
    services = await services_collection.find().to_list(length=None)
    return [Service(**service) for service in services]

@app.post("/api/services", response_model=Service)
async def create_service(service: ServiceCreate):
    services_collection = db.services
    service_id = str(uuid.uuid4())
    service_dict = service.dict()
    service_dict["id"] = service_id
    
    await services_collection.insert_one(service_dict)
    return Service(**service_dict)

@app.get("/api/services/{service_id}", response_model=Service)
async def get_service(service_id: str):
    services_collection = db.services
    service = await services_collection.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    return Service(**service)

@app.put("/api/services/{service_id}", response_model=Service)
async def update_service(service_id: str, service: ServiceCreate):
    services_collection = db.services
    service_dict = service.dict()
    result = await services_collection.replace_one(
        {"id": service_id}, 
        {**service_dict, "id": service_id}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    return Service(**{**service_dict, "id": service_id})

@app.delete("/api/services/{service_id}")
async def delete_service(service_id: str):
    services_collection = db.services
    result = await services_collection.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    return {"message": "Serviço excluído com sucesso"}

# Appointment endpoints
@app.get("/api/appointments", response_model=List[Appointment])
async def get_appointments():
    appointments_collection = db.appointments
    appointments = await appointments_collection.find().to_list(length=None)
    return [Appointment(**appointment) for appointment in appointments]

@app.post("/api/appointments", response_model=Appointment)
async def create_appointment(appointment: AppointmentCreate):
    appointments_collection = db.appointments
    services_collection = db.services
    
    # Get service details
    service = await services_collection.find_one({"id": appointment.service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    # Check if slot is available
    existing_appointment = await appointments_collection.find_one({
        "date": appointment.date,
        "time": appointment.time,
        "status": {"$ne": "cancelled"}
    })
    
    if existing_appointment:
        raise HTTPException(status_code=400, detail="Horário não disponível")
    
    appointment_id = str(uuid.uuid4())
    appointment_dict = appointment.dict()
    appointment_dict.update({
        "id": appointment_id,
        "service_name": service["name"],
        "status": "confirmed",
        "created_at": datetime.utcnow()
    })
    
    await appointments_collection.insert_one(appointment_dict)
    return Appointment(**appointment_dict)

@app.get("/api/available-slots/{date}")
async def get_available_slots(date: str):
    appointments_collection = db.appointments
    
    # Get all appointments for the date
    appointments = await appointments_collection.find({
        "date": date,
        "status": {"$ne": "cancelled"}
    }).to_list(length=None)
    
    # Generate time slots (9 AM to 6 PM, 30-minute intervals)
    slots = []
    start_time = 9  # 9 AM
    end_time = 18   # 6 PM
    
    for hour in range(start_time, end_time):
        for minute in [0, 30]:
            time_str = f"{hour:02d}:{minute:02d}"
            is_available = not any(
                appointment["time"] == time_str 
                for appointment in appointments
            )
            slots.append(AvailableSlot(time=time_str, available=is_available))
    
    return slots

@app.get("/api/appointments/{appointment_id}", response_model=Appointment)
async def get_appointment(appointment_id: str):
    appointments_collection = db.appointments
    appointment = await appointments_collection.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    return Appointment(**appointment)

@app.put("/api/appointments/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: str):
    appointments_collection = db.appointments
    result = await appointments_collection.update_one(
        {"id": appointment_id},
        {"$set": {"status": "cancelled"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    return {"message": "Agendamento cancelado com sucesso"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Barbearia Urbana API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
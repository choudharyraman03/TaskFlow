from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize LLM Chat
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-b8cA8B9D5F37981876')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    timezone: str = "UTC"
    preferences: Dict[str, Any] = Field(default_factory=dict)
    xp_points: int = 0
    karma_level: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    name: str
    email: str
    timezone: str = "UTC"

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    priority: int = 1  # 1-5 scale
    ai_priority: Optional[int] = None
    category: str = "personal"
    tags: List[str] = Field(default_factory=list)
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    estimated_duration: Optional[int] = None  # minutes
    completed: bool = False
    completed_at: Optional[datetime] = None
    context: Optional[str] = None  # location, mood, energy level
    recurring: Optional[Dict[str, Any]] = None
    subtasks: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: int = 1
    category: str = "personal"
    tags: List[str] = Field(default_factory=list)
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    estimated_duration: Optional[int] = None
    context: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    estimated_duration: Optional[int] = None
    completed: Optional[bool] = None
    context: Optional[str] = None

class Habit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    category: str
    frequency: str  # daily, weekly, monthly
    target_count: int = 1
    current_streak: int = 0
    best_streak: int = 0
    total_completions: int = 0
    is_active: bool = True
    reminder_time: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    frequency: str = "daily"
    target_count: int = 1
    reminder_time: Optional[str] = None

class HabitCompletion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    habit_id: str
    completed_date: datetime = Field(default_factory=datetime.utcnow)
    count: int = 1
    notes: Optional[str] = None

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str  # reminder, nudge, achievement, reflection
    related_id: Optional[str] = None  # task_id or habit_id
    scheduled_time: datetime
    sent: bool = False
    opened: bool = False
    action_taken: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str
    related_id: Optional[str] = None
    scheduled_time: datetime

class AIInsight(BaseModel):
    user_id: str
    insight_type: str  # productivity_pattern, next_best_task, habit_suggestion
    content: str
    confidence: float
    generated_at: datetime = Field(default_factory=datetime.utcnow)

# Authentication helper (simplified for MVP)
async def get_current_user(user_id: str = "default_user") -> str:
    return user_id

# LLM Helper Functions
async def get_ai_task_priority(task: Task, user_tasks: List[Task]) -> int:
    """Use AI to determine task priority based on context"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"priority_{task.user_id}",
            system_message="You are an AI productivity assistant. Analyze tasks and suggest optimal priorities (1-5 scale, 5 being highest priority)."
        ).with_model("openai", "gpt-4o-mini")
        
        context = {
            "current_task": {
                "title": task.title,
                "description": task.description,
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "category": task.category,
                "estimated_duration": task.estimated_duration
            },
            "existing_tasks": [
                {
                    "title": t.title,
                    "priority": t.priority,
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                    "category": t.category
                } for t in user_tasks[:10]  # Limit context
            ]
        }
        
        message = UserMessage(
            text=f"Analyze this task and suggest priority (1-5): {json.dumps(context)}. Respond with only a number 1-5."
        )
        
        response = await chat.send_message(message)
        priority = int(response.strip())
        return max(1, min(5, priority))
    except Exception as e:
        logging.error(f"AI priority error: {e}")
        return task.priority

async def get_next_best_task(user_id: str) -> Optional[Dict[str, Any]]:
    """AI-powered next best task recommendation"""
    try:
        tasks = await db.tasks.find({"user_id": user_id, "completed": False}).to_list(50)
        if not tasks:
            return None
            
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"next_task_{user_id}",
            system_message="You are a productivity coach. Recommend the best next task based on urgency, importance, and current context."
        ).with_model("openai", "gpt-4o-mini")
        
        current_time = datetime.utcnow()
        context = {
            "current_time": current_time.isoformat(),
            "tasks": [
                {
                    "id": task["id"],
                    "title": task["title"],
                    "priority": task.get("priority", 1),
                    "due_date": task.get("due_date"),
                    "category": task.get("category"),
                    "estimated_duration": task.get("estimated_duration")
                } for task in tasks
            ]
        }
        
        message = UserMessage(
            text=f"Given these tasks, recommend the best next task to work on right now. Consider urgency, importance, and time available. Respond with the task ID and a brief reason: {json.dumps(context)}"
        )
        
        response = await chat.send_message(message)
        return {"recommendation": response, "timestamp": current_time}
    except Exception as e:
        logging.error(f"Next best task error: {e}")
        return None

# User Routes
@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    user = User(**user_data.dict())
    await db.users.insert_one(user.dict())
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# Task Routes
@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, user_id: str = Depends(get_current_user)):
    # Get user's existing tasks for AI context
    user_tasks = await db.tasks.find({"user_id": user_id}).to_list(100)
    existing_tasks = [Task(**task) for task in user_tasks]
    
    task = Task(user_id=user_id, **task_data.dict())
    
    # Get AI priority
    task.ai_priority = await get_ai_task_priority(task, existing_tasks)
    
    await db.tasks.insert_one(task.dict())
    return task

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(user_id: str = Depends(get_current_user), completed: Optional[bool] = None):
    query = {"user_id": user_id}
    if completed is not None:
        query["completed"] = completed
    
    tasks = await db.tasks.find(query).sort("created_at", -1).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.get("/tasks/next-best")
async def get_next_best_task_recommendation(user_id: str = Depends(get_current_user)):
    logging.info(f"Getting next best task for user: {user_id}")
    recommendation = await get_next_best_task(user_id)
    logging.info(f"Recommendation result: {recommendation}")
    if not recommendation:
        return {"message": "No tasks available for recommendation"}
    return recommendation

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, user_id: str = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": user_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate, user_id: str = Depends(get_current_user)):
    update_data = {k: v for k, v in task_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # If marking as completed, add completion time and XP
    if task_update.completed:
        update_data["completed_at"] = datetime.utcnow()
        # Award XP points
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"xp_points": 10}}
        )
    
    result = await db.tasks.update_one(
        {"id": task_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_task = await db.tasks.find_one({"id": task_id, "user_id": user_id})
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user_id: str = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

# Habit Routes
@api_router.post("/habits", response_model=Habit)
async def create_habit(habit_data: HabitCreate, user_id: str = Depends(get_current_user)):
    habit = Habit(user_id=user_id, **habit_data.dict())
    await db.habits.insert_one(habit.dict())
    return habit

@api_router.get("/habits", response_model=List[Habit])
async def get_habits(user_id: str = Depends(get_current_user)):
    habits = await db.habits.find({"user_id": user_id, "is_active": True}).to_list(100)
    return [Habit(**habit) for habit in habits]

@api_router.post("/habits/{habit_id}/complete")
async def complete_habit(habit_id: str, user_id: str = Depends(get_current_user)):
    # Record completion
    completion = HabitCompletion(user_id=user_id, habit_id=habit_id)
    await db.habit_completions.insert_one(completion.dict())
    
    # Update habit stats
    habit = await db.habits.find_one({"id": habit_id, "user_id": user_id})
    if habit:
        new_streak = habit.get("current_streak", 0) + 1
        await db.habits.update_one(
            {"id": habit_id, "user_id": user_id},
            {
                "$set": {"current_streak": new_streak},
                "$max": {"best_streak": new_streak},
                "$inc": {"total_completions": 1}
            }
        )
        
        # Award XP for habit completion
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"xp_points": 5}}
        )
    
    return {"message": "Habit completed successfully", "streak": new_streak}

# Notification Routes
@api_router.post("/notifications", response_model=Notification)
async def create_notification(notification_data: NotificationCreate, user_id: str = Depends(get_current_user)):
    notification = Notification(user_id=user_id, **notification_data.dict())
    await db.notifications.insert_one(notification.dict())
    return notification

@api_router.get("/notifications")
async def get_notifications(user_id: str = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(50).to_list(50)
    return [Notification(**notif) for notif in notifications]

# Analytics Routes
@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(user_id: str = Depends(get_current_user)):
    # Get task completion stats
    total_tasks = await db.tasks.count_documents({"user_id": user_id})
    completed_tasks = await db.tasks.count_documents({"user_id": user_id, "completed": True})
    
    # Get habit completion stats for this week
    week_start = datetime.utcnow() - timedelta(days=7)
    habit_completions = await db.habit_completions.count_documents({
        "user_id": user_id,
        "completed_date": {"$gte": week_start}
    })
    
    # Get user stats
    user = await db.users.find_one({"id": user_id})
    xp_points = user.get("xp_points", 0) if user else 0
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "completion_rate": completed_tasks / total_tasks if total_tasks > 0 else 0,
        "habit_completions_this_week": habit_completions,
        "xp_points": xp_points,
        "karma_level": xp_points // 100 + 1
    }

# AI Routes
@api_router.get("/ai/insights")
async def get_ai_insights(user_id: str = Depends(get_current_user)):
    """Get AI-powered productivity insights"""
    try:
        # Get user's task patterns
        completed_tasks = await db.tasks.find({
            "user_id": user_id,
            "completed": True,
            "completed_at": {"$gte": datetime.utcnow() - timedelta(days=30)}
        }).to_list(100)
        
        if len(completed_tasks) < 3:
            return {"insights": ["Complete more tasks to get personalized insights!"]}
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insights_{user_id}",
            system_message="You are a productivity coach. Analyze task completion patterns and provide actionable insights."
        ).with_model("openai", "gpt-4o-mini")
        
        task_data = {
            "completed_tasks": [
                {
                    "title": task["title"],
                    "category": task.get("category"),
                    "completed_at": task.get("completed_at"),
                    "priority": task.get("priority")
                } for task in completed_tasks
            ]
        }
        
        message = UserMessage(
            text=f"Analyze these completed tasks and provide 3 actionable productivity insights: {json.dumps(task_data)}"
        )
        
        response = await chat.send_message(message)
        
        # Store insight
        insight = AIInsight(
            user_id=user_id,
            insight_type="productivity_pattern",
            content=response,
            confidence=0.8
        )
        await db.ai_insights.insert_one(insight.dict())
        
        return {"insights": [response]}
    except Exception as e:
        logging.error(f"AI insights error: {e}")
        return {"insights": ["Unable to generate insights at this time"]}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
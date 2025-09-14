from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
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
import qrcode
import io
import base64
from PIL import Image

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

# Enhanced User Model with Coins
class UserSettings(BaseModel):
    notifications: Dict[str, bool] = Field(default_factory=lambda: {
        "task_reminders": True,
        "habit_nudges": True,
        "social_updates": True,
        "ai_insights": True,
        "friend_activities": True,
        "leaderboard_updates": False
    })
    privacy: Dict[str, str] = Field(default_factory=lambda: {
        "profile_visibility": "friends",  # public, friends, private
        "task_sharing": "friends",
        "stats_visibility": "friends",
        "friend_requests": "everyone"
    })
    appearance: Dict[str, Any] = Field(default_factory=lambda: {
        "dark_mode": False,
        "language": "en",
        "region": "US",
        "time_format": "12h"
    })

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    name: str
    email: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None  # base64 encoded
    timezone: str = "UTC"
    xp_points: int = 0
    karma_level: int = 1
    coins: int = 0  # New: Coin balance
    total_tasks_completed: int = 0
    current_streak: int = 0
    best_streak: int = 0
    friends: List[str] = Field(default_factory=list)  # user IDs
    friend_requests_sent: List[str] = Field(default_factory=list)
    friend_requests_received: List[str] = Field(default_factory=list)
    settings: UserSettings = Field(default_factory=UserSettings)
    qr_code: Optional[str] = None  # base64 encoded QR code
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)

# Coins & Store Models
class StoreItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price_coins: int  # Price in coins
    price_inr: float  # Equivalent INR value (price_coins / 4)
    category: str  # electronics, books, food, etc.
    image_url: Optional[str] = None
    stock_quantity: int = 100
    is_available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Purchase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    item_id: str
    item_name: str
    coins_spent: int
    inr_value: float
    status: str = "pending"  # pending, completed, cancelled
    delivery_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class CoinTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: int  # Positive for earned, negative for spent
    transaction_type: str  # task_completion, habit_completion, purchase, bonus
    description: str
    related_id: Optional[str] = None  # task_id, habit_id, purchase_id
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Daily Tasks Models
class DailyTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    category: str = "daily"
    estimated_duration: Optional[int] = None  # minutes
    priority: int = 3
    is_active: bool = True
    order: int = 1  # Order in the daily list (1-6)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DailyTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    estimated_duration: Optional[int] = None
    priority: int = 3
    order: Optional[int] = None

class DailyTaskCompletion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    daily_task_id: str
    completed_date: datetime = Field(default_factory=datetime.utcnow)
    coins_earned: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    name: str
    email: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    timezone: str = "UTC"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    profile_picture: Optional[str] = None

class UserSettings(BaseModel):
    notifications: Optional[Dict[str, bool]] = None
    privacy: Optional[Dict[str, str]] = None
    appearance: Optional[Dict[str, Any]] = None

# Enhanced Task Model with Social Features
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
    context: Optional[str] = None
    recurring: Optional[Dict[str, Any]] = None
    subtasks: List[Dict[str, Any]] = Field(default_factory=list)
    shared_with_friends: bool = False
    privacy_level: str = "private"  # private, friends, public
    likes: List[str] = Field(default_factory=list)  # user IDs who liked
    comments: List[Dict[str, Any]] = Field(default_factory=list)
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
    shared_with_friends: bool = False
    privacy_level: str = "private"

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
    shared_with_friends: Optional[bool] = None
    privacy_level: Optional[str] = None

# Social Models
class FriendRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user_id: str
    to_user_id: str
    message: Optional[str] = None
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SocialActivity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    activity_type: str  # task_completed, habit_completed, achievement_unlocked, streak_milestone
    title: str
    description: str
    data: Dict[str, Any] = Field(default_factory=dict)
    visible_to: List[str] = Field(default_factory=list)  # user IDs
    likes: List[str] = Field(default_factory=list)
    comments: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Leaderboard(BaseModel):
    period: str  # daily, weekly, monthly
    users: List[Dict[str, Any]]
    generated_at: datetime = Field(default_factory=datetime.utcnow)

# Enhanced Habit Model
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
    shared_with_friends: bool = False
    privacy_level: str = "private"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    frequency: str = "daily"
    target_count: int = 1
    reminder_time: Optional[str] = None
    shared_with_friends: bool = False
    privacy_level: str = "private"

class HabitCompletion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    habit_id: str
    completed_date: datetime = Field(default_factory=datetime.utcnow)
    count: int = 1
    notes: Optional[str] = None

# Existing models remain the same...
class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str  # reminder, nudge, achievement, reflection, social
    related_id: Optional[str] = None  # task_id, habit_id, friend_id
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

# QR Code Generation
def generate_qr_code(user_id: str) -> str:
    """Generate QR code for user and return as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(f"taskflow://add-friend/{user_id}")
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return img_str

# Social Helper Functions
async def create_social_activity(user_id: str, activity_type: str, title: str, description: str, data: Dict = None):
    """Create a social activity post"""
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            return
            
        activity = SocialActivity(
            user_id=user_id,
            activity_type=activity_type,
            title=title,
            description=description,
            data=data or {},
            visible_to=user.get("friends", [])
        )
        
        await db.social_activities.insert_one(activity.dict())
        
        # Send notifications to friends
        for friend_id in user.get("friends", []):
            friend = await db.users.find_one({"id": friend_id})
            if friend and friend.get("settings", {}).get("notifications", {}).get("friend_activities", True):
                notification = Notification(
                    user_id=friend_id,
                    title=f"{user['name']} completed a task!",
                    message=title,
                    type="social",
                    related_id=user_id,
                    scheduled_time=datetime.utcnow()
                )
                await db.notifications.insert_one(notification.dict())
    except Exception as e:
        logging.error(f"Error creating social activity: {e}")

async def update_user_stats(user_id: str, task_completed: bool = False, habit_completed: bool = False, big_task: bool = False):
    """Update user statistics and check for achievements"""
    try:
        update_data = {"last_active": datetime.utcnow()}
        coins_earned = 0
        
        if task_completed:
            coins_earned = 4 if big_task else 1
            update_data["$inc"] = {
                "total_tasks_completed": 1, 
                "xp_points": 10,
                "coins": coins_earned
            }
            
            # Record coin transaction
            transaction = CoinTransaction(
                user_id=user_id,
                amount=coins_earned,
                transaction_type="task_completion",
                description=f"Earned {coins_earned} coins for completing {'big' if big_task else 'normal'} task"
            )
            await db.coin_transactions.insert_one(transaction.dict())
            
        elif habit_completed:
            coins_earned = 1
            update_data["$inc"] = {"xp_points": 5, "coins": coins_earned}
            
            # Record coin transaction
            transaction = CoinTransaction(
                user_id=user_id,
                amount=coins_earned,
                transaction_type="habit_completion",
                description="Earned 1 coin for completing habit"
            )
            await db.coin_transactions.insert_one(transaction.dict())
            
        await db.users.update_one({"id": user_id}, {"$set": update_data} if "$inc" not in update_data else update_data)
        
        # Check for achievements
        user = await db.users.find_one({"id": user_id})
        if user:
            total_tasks = user.get("total_tasks_completed", 0)
            if task_completed and total_tasks in [1, 10, 50, 100]:
                await create_social_activity(
                    user_id,
                    "achievement_unlocked",
                    f"🏆 Achievement Unlocked!",
                    f"Completed {total_tasks} tasks!",
                    {"achievement": f"{total_tasks}_tasks_completed"}
                )
                
                # Bonus coins for achievements
                bonus_coins = total_tasks // 10
                if bonus_coins > 0:
                    await db.users.update_one({"id": user_id}, {"$inc": {"coins": bonus_coins}})
                    bonus_transaction = CoinTransaction(
                        user_id=user_id,
                        amount=bonus_coins,
                        transaction_type="bonus",
                        description=f"Achievement bonus: {bonus_coins} coins"
                    )
                    await db.coin_transactions.insert_one(bonus_transaction.dict())
                    
    except Exception as e:
        logging.error(f"Error updating user stats: {e}")

# Initialize Store Items
async def initialize_store_items():
    """Initialize the store with sample items"""
    try:
        existing_items = await db.store_items.count_documents({})
        if existing_items == 0:
            sample_items = [
                StoreItem(
                    name="Amazon Gift Card ₹100",
                    description="Redeem this for shopping on Amazon India",
                    price_coins=400,  # 400 coins = ₹100
                    price_inr=100.0,
                    category="gift_cards"
                ),
                StoreItem(
                    name="Smartphone Case",
                    description="Protective case for your smartphone",
                    price_coins=120,  # 120 coins = ₹30
                    price_inr=30.0,
                    category="electronics"
                ),
                StoreItem(
                    name="Notebook Set",
                    description="Premium quality notebooks for writing",
                    price_coins=80,  # 80 coins = ₹20
                    price_inr=20.0,
                    category="stationery"
                ),
                StoreItem(
                    name="Coffee Voucher",
                    description="Free coffee at popular cafes",
                    price_coins=200,  # 200 coins = ₹50
                    price_inr=50.0,
                    category="food"
                ),
                StoreItem(
                    name="Book: Productivity Hacks",
                    description="Best-selling book on productivity and time management",
                    price_coins=240,  # 240 coins = ₹60
                    price_inr=60.0,
                    category="books"
                ),
                StoreItem(
                    name="Power Bank 10000mAh",
                    description="Portable power bank for your devices",
                    price_coins=600,  # 600 coins = ₹150
                    price_inr=150.0,
                    category="electronics"
                ),
                StoreItem(
                    name="Fitness Tracker",
                    description="Track your daily fitness activities",
                    price_coins=800,  # 800 coins = ₹200
                    price_inr=200.0,
                    category="fitness"
                ),
                StoreItem(
                    name="Headphones",
                    description="High-quality wireless headphones",
                    price_coins=1200,  # 1200 coins = ₹300
                    price_inr=300.0,
                    category="electronics"
                )
            ]
            
            for item in sample_items:
                await db.store_items.insert_one(item.dict())
            
            logging.info("Store initialized with sample items")
            
    except Exception as e:
        logging.error(f"Error initializing store: {e}")

# Coins & Store Routes
@api_router.get("/store/items")
async def get_store_items(category: Optional[str] = None):
    """Get all available store items"""
    try:
        query = {"is_available": True}
        if category:
            query["category"] = category
            
        items = await db.store_items.find(query).sort("price_coins", 1).to_list(100)
        return [StoreItem(**item) for item in items]
        
    except Exception as e:
        logging.error(f"Error fetching store items: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch store items")

@api_router.get("/store/categories")
async def get_store_categories():
    """Get all available store categories"""
    try:
        categories = await db.store_items.distinct("category", {"is_available": True})
        return {"categories": categories}
        
    except Exception as e:
        logging.error(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch categories")

@api_router.post("/store/purchase/{item_id}")
async def purchase_item(
    item_id: str, 
    delivery_address: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Purchase an item from the store"""
    try:
        # Get item details
        item = await db.store_items.find_one({"id": item_id, "is_available": True})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found or unavailable")
        
        # Get user's coin balance
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_coins = user.get("coins", 0)
        if user_coins < item["price_coins"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient coins. You have {user_coins} coins, need {item['price_coins']}"
            )
        
        # Create purchase record
        purchase = Purchase(
            user_id=user_id,
            item_id=item_id,
            item_name=item["name"],
            coins_spent=item["price_coins"],
            inr_value=item["price_inr"],
            delivery_address=delivery_address,
            status="completed"
        )
        
        # Deduct coins from user
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"coins": -item["price_coins"]}}
        )
        
        # Record coin transaction
        transaction = CoinTransaction(
            user_id=user_id,
            amount=-item["price_coins"],
            transaction_type="purchase",
            description=f"Purchased {item['name']}",
            related_id=purchase.id
        )
        
        # Save purchase and transaction
        await db.purchases.insert_one(purchase.dict())
        await db.coin_transactions.insert_one(transaction.dict())
        
        # Create social activity
        await create_social_activity(
            user_id,
            "achievement_unlocked",
            f"🛍️ Made a purchase!",
            f"Bought {item['name']} for {item['price_coins']} coins",
            {"purchase_id": purchase.id, "item_name": item["name"]}
        )
        
        return {
            "purchase_id": purchase.id,
            "message": f"Successfully purchased {item['name']}!",
            "coins_spent": item["price_coins"],
            "remaining_coins": user_coins - item["price_coins"]
        }
        
    except Exception as e:
        logging.error(f"Error processing purchase: {e}")
        raise HTTPException(status_code=500, detail="Failed to process purchase")

@api_router.get("/coins/transactions")
async def get_coin_transactions(user_id: str = Depends(get_current_user)):
    """Get user's coin transaction history"""
    try:
        transactions = await db.coin_transactions.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(50).to_list(50)
        
        return [CoinTransaction(**transaction) for transaction in transactions]
        
    except Exception as e:
        logging.error(f"Error fetching transactions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch transactions")

@api_router.get("/coins/balance")
async def get_coin_balance(user_id: str = Depends(get_current_user)):
    """Get user's current coin balance"""
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "coins": user.get("coins", 0),
            "inr_value": user.get("coins", 0) / 4  # 4 coins = 1 INR
        }
        
    except Exception as e:
        logging.error(f"Error fetching coin balance: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch coin balance")

# Daily Tasks Routes
@api_router.post("/daily-tasks", response_model=DailyTask)
async def create_daily_task(task_data: DailyTaskCreate, user_id: str = Depends(get_current_user)):
    """Create a new daily task"""
    try:
        # Check if user already has 6 daily tasks
        existing_count = await db.daily_tasks.count_documents({
            "user_id": user_id, 
            "is_active": True
        })
        
        if existing_count >= 6:
            raise HTTPException(
                status_code=400, 
                detail="You can only have up to 6 daily tasks"
            )
        
        # Set order if not provided
        if task_data.order is None:
            task_data.order = existing_count + 1
        
        daily_task = DailyTask(user_id=user_id, **task_data.dict())
        await db.daily_tasks.insert_one(daily_task.dict())
        
        return daily_task
        
    except Exception as e:
        logging.error(f"Error creating daily task: {e}")
        raise HTTPException(status_code=500, detail="Failed to create daily task")

@api_router.get("/daily-tasks", response_model=List[DailyTask])
async def get_daily_tasks(user_id: str = Depends(get_current_user)):
    """Get user's daily tasks"""
    try:
        tasks = await db.daily_tasks.find({
            "user_id": user_id, 
            "is_active": True
        }).sort("order", 1).to_list(6)
        
        return [DailyTask(**task) for task in tasks]
        
    except Exception as e:
        logging.error(f"Error fetching daily tasks: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch daily tasks")

@api_router.post("/daily-tasks/{task_id}/complete")
async def complete_daily_task(task_id: str, user_id: str = Depends(get_current_user)):
    """Complete a daily task and earn coins"""
    try:
        # Check if task exists
        daily_task = await db.daily_tasks.find_one({
            "id": task_id, 
            "user_id": user_id, 
            "is_active": True
        })
        
        if not daily_task:
            raise HTTPException(status_code=404, detail="Daily task not found")
        
        # Check if already completed today
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        existing_completion = await db.daily_task_completions.find_one({
            "user_id": user_id,
            "daily_task_id": task_id,
            "completed_date": {"$gte": today}
        })
        
        if existing_completion:
            raise HTTPException(status_code=400, detail="Task already completed today")
        
        # Record completion
        completion = DailyTaskCompletion(
            user_id=user_id,
            daily_task_id=task_id,
            coins_earned=1
        )
        
        await db.daily_task_completions.insert_one(completion.dict())
        
        # Update user stats and coins
        await update_user_stats(user_id, task_completed=True, big_task=False)
        
        return {
            "message": "Daily task completed!",
            "coins_earned": 1,
            "task_name": daily_task["title"]
        }
        
    except Exception as e:
        logging.error(f"Error completing daily task: {e}")
        raise HTTPException(status_code=500, detail="Failed to complete daily task")

@api_router.put("/daily-tasks/{task_id}", response_model=DailyTask)
async def update_daily_task(
    task_id: str, 
    task_update: DailyTaskCreate, 
    user_id: str = Depends(get_current_user)
):
    """Update a daily task"""
    try:
        update_data = {k: v for k, v in task_update.dict().items() if v is not None}
        
        result = await db.daily_tasks.update_one(
            {"id": task_id, "user_id": user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Daily task not found")
        
        updated_task = await db.daily_tasks.find_one({"id": task_id, "user_id": user_id})
        return DailyTask(**updated_task)
        
    except Exception as e:
        logging.error(f"Error updating daily task: {e}")
        raise HTTPException(status_code=500, detail="Failed to update daily task")

@api_router.delete("/daily-tasks/{task_id}")
async def delete_daily_task(task_id: str, user_id: str = Depends(get_current_user)):
    """Delete a daily task"""
    try:
        result = await db.daily_tasks.update_one(
            {"id": task_id, "user_id": user_id},
            {"$set": {"is_active": False}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Daily task not found")
        
        return {"message": "Daily task deleted successfully"}
        
    except Exception as e:
        logging.error(f"Error deleting daily task: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete daily task")

@api_router.get("/daily-tasks/completions/today")
async def get_today_completions(user_id: str = Depends(get_current_user)):
    """Get today's daily task completions"""
    try:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        completions = await db.daily_task_completions.find({
            "user_id": user_id,
            "completed_date": {"$gte": today, "$lt": tomorrow}
        }).to_list(10)
        
        completed_task_ids = [comp["daily_task_id"] for comp in completions]
        
        return {
            "completed_today": len(completed_task_ids),
            "completed_task_ids": completed_task_ids,
            "total_coins_earned": sum(comp.get("coins_earned", 1) for comp in completions)
        }
        
    except Exception as e:
        logging.error(f"Error fetching today's completions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch completions")

# LLM Helper Functions (existing functions remain the same...)
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
                    "due_date": task.get("due_date").isoformat() if task.get("due_date") else None,
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

# Enhanced User Routes
@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(**user_data.dict())
    user.qr_code = generate_qr_code(user.id)
    
    await db.users.insert_one(user.dict())
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate):
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"id": user_id})
    return User(**updated_user)

@api_router.put("/users/{user_id}/settings")
async def update_user_settings(user_id: str, settings: UserSettings):
    update_data = {"settings": settings.dict()}
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Settings updated successfully"}

# Social Features Routes
@api_router.post("/friends/request")
async def send_friend_request(to_user_id: str, message: Optional[str] = None, user_id: str = Depends(get_current_user)):
    # Check if users exist
    user = await db.users.find_one({"id": user_id})
    target_user = await db.users.find_one({"id": to_user_id})
    
    if not user or not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if to_user_id in user.get("friends", []):
        raise HTTPException(status_code=400, detail="Already friends")
    
    # Check if request already exists
    existing_request = await db.friend_requests.find_one({
        "from_user_id": user_id,
        "to_user_id": to_user_id,
        "status": "pending"
    })
    
    if existing_request:
        raise HTTPException(status_code=400, detail="Friend request already sent")
    
    friend_request = FriendRequest(
        from_user_id=user_id,
        to_user_id=to_user_id,
        message=message or f"{user['name']} wants to connect with you!"
    )
    
    await db.friend_requests.insert_one(friend_request.dict())
    
    # Add to user's sent requests
    await db.users.update_one(
        {"id": user_id},
        {"$addToSet": {"friend_requests_sent": to_user_id}}
    )
    
    # Add to target user's received requests
    await db.users.update_one(
        {"id": to_user_id},
        {"$addToSet": {"friend_requests_received": user_id}}
    )
    
    # Send notification
    notification = Notification(
        user_id=to_user_id,
        title="New Friend Request",
        message=f"{user['name']} wants to connect with you!",
        type="social",
        related_id=user_id,
        scheduled_time=datetime.utcnow()
    )
    await db.notifications.insert_one(notification.dict())
    
    return {"message": "Friend request sent successfully"}

@api_router.post("/friends/respond/{request_id}")
async def respond_friend_request(request_id: str, accept: bool, user_id: str = Depends(get_current_user)):
    friend_request = await db.friend_requests.find_one({"id": request_id})
    
    if not friend_request or friend_request["to_user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if friend_request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    new_status = "accepted" if accept else "rejected"
    
    await db.friend_requests.update_one(
        {"id": request_id},
        {"$set": {"status": new_status}}
    )
    
    if accept:
        # Add each user to the other's friends list
        await db.users.update_one(
            {"id": friend_request["from_user_id"]},
            {"$addToSet": {"friends": user_id}}
        )
        await db.users.update_one(
            {"id": user_id},
            {"$addToSet": {"friends": friend_request["from_user_id"]}}
        )
    
    # Remove from pending lists
    await db.users.update_one(
        {"id": friend_request["from_user_id"]},
        {"$pull": {"friend_requests_sent": user_id}}
    )
    await db.users.update_one(
        {"id": user_id},
        {"$pull": {"friend_requests_received": friend_request["from_user_id"]}}
    )
    
    return {"message": f"Friend request {new_status}"}

@api_router.get("/friends")
async def get_friends(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    friends_data = []
    for friend_id in user.get("friends", []):
        friend = await db.users.find_one({"id": friend_id})
        if friend:
            friends_data.append({
                "id": friend["id"],
                "username": friend["username"],
                "name": friend["name"],
                "profile_picture": friend.get("profile_picture"),
                "xp_points": friend.get("xp_points", 0),
                "current_streak": friend.get("current_streak", 0),
                "last_active": friend.get("last_active")
            })
    
    return friends_data

@api_router.get("/friends/search")
async def search_users(query: str, user_id: str = Depends(get_current_user)):
    # Search by username or name
    users = await db.users.find({
        "$or": [
            {"username": {"$regex": query, "$options": "i"}},
            {"name": {"$regex": query, "$options": "i"}}
        ],
        "id": {"$ne": user_id}
    }).limit(20).to_list(20)
    
    return [
        {
            "id": user["id"],
            "username": user["username"],
            "name": user["name"],
            "profile_picture": user.get("profile_picture"),
            "bio": user.get("bio")
        } for user in users
    ]

@api_router.get("/friends/requests")
async def get_friend_requests(user_id: str = Depends(get_current_user)):
    requests = await db.friend_requests.find({
        "to_user_id": user_id,
        "status": "pending"
    }).to_list(50)
    
    requests_data = []
    for req in requests:
        sender = await db.users.find_one({"id": req["from_user_id"]})
        if sender:
            requests_data.append({
                "id": req["id"],
                "from_user": {
                    "id": sender["id"],
                    "username": sender["username"],
                    "name": sender["name"],
                    "profile_picture": sender.get("profile_picture")
                },
                "message": req.get("message"),
                "created_at": req["created_at"]
            })
    
    return requests_data

# Leaderboard Routes
@api_router.get("/leaderboard/{period}")
async def get_leaderboard(period: str, user_id: str = Depends(get_current_user)):
    if period not in ["daily", "weekly", "monthly"]:
        raise HTTPException(status_code=400, detail="Invalid period")
    
    # Get current user's friends
    user = await db.users.find_one({"id": user_id})
    friends = user.get("friends", []) if user else []
    user_list = friends + [user_id]
    
    # Calculate date range
    now = datetime.utcnow()
    if period == "daily":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "weekly":
        start_date = now - timedelta(days=7)
    else:  # monthly
        start_date = now - timedelta(days=30)
    
    # Get task completions for the period
    leaderboard_data = []
    for uid in user_list:
        tasks_completed = await db.tasks.count_documents({
            "user_id": uid,
            "completed": True,
            "completed_at": {"$gte": start_date}
        })
        
        user_data = await db.users.find_one({"id": uid})
        if user_data:
            leaderboard_data.append({
                "user_id": uid,
                "username": user_data["username"],
                "name": user_data["name"],
                "profile_picture": user_data.get("profile_picture"),
                "tasks_completed": tasks_completed,
                "xp_points": user_data.get("xp_points", 0),
                "current_streak": user_data.get("current_streak", 0)
            })
    
    # Sort by tasks completed, then by XP
    leaderboard_data.sort(key=lambda x: (x["tasks_completed"], x["xp_points"]), reverse=True)
    
    return {
        "period": period,
        "leaderboard": leaderboard_data,
        "generated_at": now
    }

# Social Activity Feed
@api_router.get("/social/feed")
async def get_social_feed(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    friends = user.get("friends", []) if user else []
    
    # Get activities from friends
    activities = await db.social_activities.find({
        "user_id": {"$in": friends},
        "visible_to": user_id
    }).sort("created_at", -1).limit(50).to_list(50)
    
    activities_data = []
    for activity in activities:
        user_data = await db.users.find_one({"id": activity["user_id"]})
        if user_data:
            activities_data.append({
                **activity,
                "user": {
                    "id": user_data["id"],
                    "username": user_data["username"],
                    "name": user_data["name"],
                    "profile_picture": user_data.get("profile_picture")
                }
            })
    
    return activities_data

# Enhanced Task Routes (existing routes remain the same, with social features added)
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
    
    # If marking as completed, add completion time and handle rewards
    if task_update.completed:
        update_data["completed_at"] = datetime.utcnow()
        
        # Get task details to determine if it's a big task
        task = await db.tasks.find_one({"id": task_id, "user_id": user_id})
        if task:
            # Determine if it's a big task based on estimated duration or description length
            is_big_task = (
                task.get("estimated_duration", 0) >= 120 or  # 2+ hours
                len(task.get("description", "")) > 100 or  # Long description
                task.get("priority", 1) >= 4  # High priority
            )
            
            # Update user stats with appropriate coin reward
            await update_user_stats(user_id, task_completed=True, big_task=is_big_task)
        
        # Get task details for social activity
        if task and task.get("shared_with_friends"):
            await create_social_activity(
                user_id,
                "task_completed",
                f"✅ {task['title']}",
                f"Completed a {task.get('category', 'personal')} task",
                {"task_id": task_id, "category": task.get("category")}
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

# Enhanced Habit Routes
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
        
        # Award XP and update stats
        await update_user_stats(user_id, habit_completed=True)
        
        # Create social activity for milestone streaks
        if habit.get("shared_with_friends") and new_streak > 0 and new_streak % 7 == 0:
            await create_social_activity(
                user_id,
                "streak_milestone",
                f"🔥 {new_streak}-day streak!",
                f"Maintained a {new_streak}-day streak for {habit['name']}",
                {"habit_id": habit_id, "streak": new_streak, "habit_name": habit["name"]}
            )
    
    return {"message": "Habit completed successfully", "streak": new_streak}

# Notification Routes (existing)
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

# Analytics Routes (existing)
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
    
    # Get daily task completions for today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_task_completions = await db.daily_task_completions.count_documents({
        "user_id": user_id,
        "completed_date": {"$gte": today}
    })
    
    # Get user stats
    user = await db.users.find_one({"id": user_id})
    xp_points = user.get("xp_points", 0) if user else 0
    coins = user.get("coins", 0) if user else 0
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "completion_rate": completed_tasks / total_tasks if total_tasks > 0 else 0,
        "habit_completions_this_week": habit_completions,
        "daily_tasks_completed_today": daily_task_completions,
        "xp_points": xp_points,
        "coins": coins,
        "inr_value": coins / 4,  # 4 coins = 1 INR
        "karma_level": xp_points // 100 + 1,
        "current_streak": user.get("current_streak", 0) if user else 0,
        "friends_count": len(user.get("friends", [])) if user else 0
    }

# Task Crusher Models
class TaskCrusherRequest(BaseModel):
    main_task: str
    description: Optional[str] = None
    category: str = "personal"
    estimated_duration: Optional[int] = None
    difficulty_level: str = "medium"  # easy, medium, hard, expert

class SubTaskSuggestion(BaseModel):
    title: str
    description: str
    estimated_duration: int  # minutes
    priority: int
    order: int
    dependencies: List[str] = Field(default_factory=list)

class TaskCrusherResponse(BaseModel):
    main_task: str
    suggested_subtasks: List[SubTaskSuggestion]
    total_estimated_duration: int
    completion_strategy: str
    ai_confidence: float

class TaskGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    main_task_title: str
    main_task_description: Optional[str] = None
    category: str
    total_subtasks: int
    completed_subtasks: int = 0
    progress_percentage: float = 0.0
    subtask_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    is_active: bool = True

# Task Crusher AI Function
async def crush_task_with_ai(task_request: TaskCrusherRequest) -> TaskCrusherResponse:
    """Use AI to break down a complex task into manageable subtasks"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"task_crusher_{uuid.uuid4()}",
            system_message="""You are TaskCrusher, an AI productivity expert that breaks down complex tasks into manageable subtasks. 
            Your goal is to create a logical, step-by-step breakdown that makes big projects feel achievable.
            
            Guidelines:
            - Break tasks into 3-8 subtasks (optimal range for cognitive load)
            - Each subtask should be completable in 15-90 minutes
            - Order subtasks logically with dependencies
            - Provide realistic time estimates
            - Include preparatory and wrap-up steps
            - Make subtasks specific and actionable
            - Consider difficulty level for complexity adjustment
            
            Response format: JSON with subtasks array, each containing title, description, estimated_duration (minutes), priority (1-5), order (1-N), and dependencies (array of subtask titles that must be done first)."""
        ).with_model("openai", "gpt-4o-mini")
        
        context = {
            "main_task": task_request.main_task,
            "description": task_request.description or "",
            "category": task_request.category,
            "estimated_duration": task_request.estimated_duration,
            "difficulty_level": task_request.difficulty_level
        }
        
        message = UserMessage(
            text=f"""Break down this complex task into manageable subtasks:

Task: {task_request.main_task}
Description: {task_request.description or 'Not provided'}
Category: {task_request.category}
Difficulty: {task_request.difficulty_level}
Estimated Duration: {task_request.estimated_duration or 'Not specified'} minutes

Provide a JSON response with the following structure:
{{
    "subtasks": [
        {{
            "title": "Clear, actionable subtask title",
            "description": "Detailed description of what needs to be done",
            "estimated_duration": 30,
            "priority": 3,
            "order": 1,
            "dependencies": []
        }}
    ],
    "completion_strategy": "Brief strategy for tackling this project effectively",
    "total_estimated_duration": 180
}}

Make sure subtasks are logical, ordered, and actionable."""
        )
        
        response = await chat.send_message(message)
        
        # Parse AI response
        try:
            ai_data = json.loads(response)
            subtasks = []
            
            for i, subtask_data in enumerate(ai_data.get("subtasks", [])):
                subtask = SubTaskSuggestion(
                    title=subtask_data.get("title", f"Subtask {i+1}"),
                    description=subtask_data.get("description", ""),
                    estimated_duration=subtask_data.get("estimated_duration", 30),
                    priority=subtask_data.get("priority", 3),
                    order=subtask_data.get("order", i+1),
                    dependencies=subtask_data.get("dependencies", [])
                )
                subtasks.append(subtask)
            
            return TaskCrusherResponse(
                main_task=task_request.main_task,
                suggested_subtasks=subtasks,
                total_estimated_duration=ai_data.get("total_estimated_duration", sum(s.estimated_duration for s in subtasks)),
                completion_strategy=ai_data.get("completion_strategy", "Complete subtasks in the suggested order for optimal results."),
                ai_confidence=0.85
            )
            
        except json.JSONDecodeError:
            # Fallback if AI doesn't return valid JSON
            return TaskCrusherResponse(
                main_task=task_request.main_task,
                suggested_subtasks=[
                    SubTaskSuggestion(
                        title="Research and Planning",
                        description="Gather information and create a detailed plan",
                        estimated_duration=45,
                        priority=4,
                        order=1
                    ),
                    SubTaskSuggestion(
                        title="Initial Setup",
                        description="Set up necessary tools and environment",
                        estimated_duration=30,
                        priority=3,
                        order=2
                    ),
                    SubTaskSuggestion(
                        title="Core Implementation",
                        description="Work on the main components of the task",
                        estimated_duration=90,
                        priority=5,
                        order=3
                    ),
                    SubTaskSuggestion(
                        title="Review and Finalize",
                        description="Review work and make final adjustments",
                        estimated_duration=30,
                        priority=3,
                        order=4
                    )
                ],
                total_estimated_duration=195,
                completion_strategy="Follow the structured approach from planning to implementation to review.",
                ai_confidence=0.7
            )
            
    except Exception as e:
        logging.error(f"Task crusher AI error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate task breakdown")

# Task Crusher Routes
@api_router.post("/task-crusher/analyze", response_model=TaskCrusherResponse)
async def analyze_complex_task(task_request: TaskCrusherRequest, user_id: str = Depends(get_current_user)):
    """Analyze a complex task and suggest subtasks breakdown"""
    return await crush_task_with_ai(task_request)

@api_router.post("/task-crusher/create-group")
async def create_task_group(
    crusher_response: TaskCrusherResponse, 
    user_id: str = Depends(get_current_user)
):
    """Create a task group with all suggested subtasks"""
    try:
        # Create the task group
        task_group = TaskGroup(
            user_id=user_id,
            main_task_title=crusher_response.main_task,
            main_task_description=f"AI-generated breakdown: {crusher_response.completion_strategy}",
            category="personal",  # Could be enhanced to use original category
            total_subtasks=len(crusher_response.suggested_subtasks)
        )
        
        # Create all subtasks
        created_subtask_ids = []
        for subtask_suggestion in crusher_response.suggested_subtasks:
            subtask = Task(
                user_id=user_id,
                title=subtask_suggestion.title,
                description=subtask_suggestion.description,
                priority=subtask_suggestion.priority,
                category=task_group.category,
                estimated_duration=subtask_suggestion.estimated_duration,
                tags=["task-crusher", f"group-{task_group.id}"],
                shared_with_friends=False
            )
            
            await db.tasks.insert_one(subtask.dict())
            created_subtask_ids.append(subtask.id)
        
        # Update task group with subtask IDs
        task_group.subtask_ids = created_subtask_ids
        
        # Save task group
        await db.task_groups.insert_one(task_group.dict())
        
        # Create social activity
        await create_social_activity(
            user_id,
            "task_completed",
            f"🎯 Crushed a complex task!",
            f"Broke down '{crusher_response.main_task}' into {len(crusher_response.suggested_subtasks)} manageable subtasks",
            {
                "task_group_id": task_group.id,
                "subtasks_count": len(crusher_response.suggested_subtasks),
                "category": "productivity"
            }
        )
        
        return {
            "message": "Task group created successfully",
            "task_group_id": task_group.id,
            "subtasks_created": len(created_subtask_ids),
            "subtask_ids": created_subtask_ids
        }
        
    except Exception as e:
        logging.error(f"Error creating task group: {e}")
        raise HTTPException(status_code=500, detail="Failed to create task group")

@api_router.get("/task-crusher/groups")
async def get_task_groups(user_id: str = Depends(get_current_user)):
    """Get all task groups for the user"""
    try:
        groups = await db.task_groups.find({"user_id": user_id, "is_active": True}).sort("created_at", -1).to_list(100)
        
        # Enhance with current progress
        enhanced_groups = []
        for group in groups:
            # Get current subtask completion status
            completed_count = await db.tasks.count_documents({
                "id": {"$in": group["subtask_ids"]},
                "completed": True
            })
            
            group["completed_subtasks"] = completed_count
            group["progress_percentage"] = (completed_count / group["total_subtasks"]) * 100 if group["total_subtasks"] > 0 else 0
            
            # Update in database
            await db.task_groups.update_one(
                {"id": group["id"]},
                {"$set": {
                    "completed_subtasks": completed_count,
                    "progress_percentage": group["progress_percentage"]
                }}
            )
            
            enhanced_groups.append(TaskGroup(**group))
        
        return enhanced_groups
        
    except Exception as e:
        logging.error(f"Error fetching task groups: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch task groups")

@api_router.get("/task-crusher/groups/{group_id}/subtasks")
async def get_group_subtasks(group_id: str, user_id: str = Depends(get_current_user)):
    """Get all subtasks for a specific task group"""
    try:
        group = await db.task_groups.find_one({"id": group_id, "user_id": user_id})
        if not group:
            raise HTTPException(status_code=404, detail="Task group not found")
        
        # Get all subtasks for this group
        subtasks = await db.tasks.find({
            "id": {"$in": group["subtask_ids"]}
        }).sort("created_at", 1).to_list(100)
        
        return [Task(**task) for task in subtasks]
        
    except Exception as e:
        logging.error(f"Error fetching group subtasks: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch group subtasks")

@api_router.delete("/task-crusher/groups/{group_id}")
async def delete_task_group(group_id: str, user_id: str = Depends(get_current_user)):
    """Delete a task group and optionally its subtasks"""
    try:
        group = await db.task_groups.find_one({"id": group_id, "user_id": user_id})
        if not group:
            raise HTTPException(status_code=404, detail="Task group not found")
        
        # Mark group as inactive instead of deleting
        await db.task_groups.update_one(
            {"id": group_id},
            {"$set": {"is_active": False}}
        )
        
        return {"message": "Task group deleted successfully"}
        
    except Exception as e:
        logging.error(f"Error deleting task group: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete task group")

# AI Routes (existing)
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

@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    await initialize_store_items()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
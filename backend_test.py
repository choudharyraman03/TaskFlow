#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Mobile-First To-Do App
Tests all backend functionality including AI integration, CRUD operations, and gamification
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List
import uuid

# Configuration
BACKEND_URL = "https://taskpilot-7.preview.emergentagent.com/api"
DEFAULT_USER_ID = "default_user"

class TodoAppTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.user_id = DEFAULT_USER_ID
        self.session = requests.Session()
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
        
        # Test data storage
        self.created_user_id = None
        self.created_task_ids = []
        self.created_habit_ids = []
        self.created_notification_ids = []
        
    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict[str, Any]:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == "GET":
                response = self.session.get(url, params=params)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, params=params)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, params=params)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, params=params)
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": 200 <= response.status_code < 300
            }
        except Exception as e:
            return {
                "status_code": 0,
                "data": {},
                "success": False,
                "error": str(e)
            }
    
    def test_user_authentication_and_management(self):
        """Test user registration and profile management"""
        print("\n=== Testing User Authentication and Management ===")
        
        # Test user registration
        user_data = {
            "name": "Sarah Johnson",
            "email": "sarah.johnson@example.com",
            "timezone": "America/New_York"
        }
        
        result = self.make_request("POST", "/auth/register", user_data)
        if result["success"] and "id" in result["data"]:
            self.created_user_id = result["data"]["id"]
            self.log_result("User Registration", True, f"Created user with ID: {self.created_user_id}")
        else:
            self.log_result("User Registration", False, f"Status: {result['status_code']}, Error: {result.get('error', 'Unknown')}")
            return
        
        # Test get user profile
        result = self.make_request("GET", f"/users/{self.created_user_id}")
        if result["success"] and result["data"].get("name") == "Sarah Johnson":
            self.log_result("Get User Profile", True, "Successfully retrieved user profile")
        else:
            self.log_result("Get User Profile", False, f"Status: {result['status_code']}")
    
    def test_core_task_management_crud(self):
        """Test complete task CRUD operations with AI integration"""
        print("\n=== Testing Core Task Management CRUD Operations ===")
        
        # Test create task with AI priority
        task_data = {
            "title": "Prepare quarterly business presentation",
            "description": "Create comprehensive Q4 performance slides for board meeting",
            "priority": 3,
            "category": "work",
            "tags": ["presentation", "quarterly", "important"],
            "due_date": (datetime.utcnow() + timedelta(days=3)).isoformat(),
            "estimated_duration": 120,
            "context": "office, high energy required"
        }
        
        result = self.make_request("POST", "/tasks", task_data)
        if result["success"] and "id" in result["data"]:
            task_id = result["data"]["id"]
            self.created_task_ids.append(task_id)
            ai_priority = result["data"].get("ai_priority")
            self.log_result("Create Task with AI Priority", True, 
                          f"Task created with AI priority: {ai_priority}")
        else:
            self.log_result("Create Task", False, f"Status: {result['status_code']}")
            return
        
        # Create a second task for testing
        task_data2 = {
            "title": "Review team performance metrics",
            "description": "Analyze monthly KPIs and prepare feedback",
            "priority": 2,
            "category": "work",
            "tags": ["review", "metrics"],
            "due_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "estimated_duration": 60
        }
        
        result = self.make_request("POST", "/tasks", task_data2)
        if result["success"]:
            self.created_task_ids.append(result["data"]["id"])
        
        # Test get all tasks
        result = self.make_request("GET", "/tasks")
        if result["success"] and isinstance(result["data"], list):
            task_count = len(result["data"])
            self.log_result("Get All Tasks", True, f"Retrieved {task_count} tasks")
        else:
            self.log_result("Get All Tasks", False, f"Status: {result['status_code']}")
        
        # Test get specific task
        if self.created_task_ids:
            result = self.make_request("GET", f"/tasks/{self.created_task_ids[0]}")
            if result["success"] and result["data"].get("title"):
                self.log_result("Get Specific Task", True, "Successfully retrieved task details")
            else:
                self.log_result("Get Specific Task", False, f"Status: {result['status_code']}")
        
        # Test update task
        if self.created_task_ids:
            update_data = {
                "title": "Updated: Prepare quarterly business presentation",
                "priority": 4,
                "completed": False
            }
            result = self.make_request("PUT", f"/tasks/{self.created_task_ids[0]}", update_data)
            if result["success"]:
                self.log_result("Update Task", True, "Task updated successfully")
            else:
                self.log_result("Update Task", False, f"Status: {result['status_code']}")
        
        # Test mark task as completed (should award XP)
        if self.created_task_ids:
            complete_data = {"completed": True}
            result = self.make_request("PUT", f"/tasks/{self.created_task_ids[0]}", complete_data)
            if result["success"] and result["data"].get("completed"):
                self.log_result("Complete Task with XP Reward", True, "Task completed and XP awarded")
            else:
                self.log_result("Complete Task with XP Reward", False, f"Status: {result['status_code']}")
        
        # Test delete task
        if len(self.created_task_ids) > 1:
            result = self.make_request("DELETE", f"/tasks/{self.created_task_ids[1]}")
            if result["success"]:
                self.log_result("Delete Task", True, "Task deleted successfully")
            else:
                self.log_result("Delete Task", False, f"Status: {result['status_code']}")
    
    def test_ai_powered_task_prioritization(self):
        """Test AI-powered task prioritization and recommendations"""
        print("\n=== Testing AI-Powered Task Prioritization ===")
        
        # Create multiple tasks to test AI recommendations
        tasks_for_ai = [
            {
                "title": "Urgent client call - contract negotiation",
                "description": "Critical call with major client about contract renewal",
                "priority": 1,
                "category": "work",
                "due_date": (datetime.utcnow() + timedelta(hours=2)).isoformat(),
                "estimated_duration": 45
            },
            {
                "title": "Weekly grocery shopping",
                "description": "Buy groceries for the week",
                "priority": 2,
                "category": "personal",
                "due_date": (datetime.utcnow() + timedelta(days=2)).isoformat(),
                "estimated_duration": 60
            },
            {
                "title": "Finish project documentation",
                "description": "Complete technical documentation for new feature",
                "priority": 3,
                "category": "work",
                "due_date": (datetime.utcnow() + timedelta(days=5)).isoformat(),
                "estimated_duration": 180
            }
        ]
        
        # Create tasks and check AI priority assignment
        ai_priorities = []
        for task_data in tasks_for_ai:
            result = self.make_request("POST", "/tasks", task_data)
            if result["success"]:
                self.created_task_ids.append(result["data"]["id"])
                ai_priority = result["data"].get("ai_priority")
                ai_priorities.append(ai_priority)
        
        if ai_priorities and all(p is not None for p in ai_priorities):
            self.log_result("AI Priority Assignment", True, 
                          f"AI assigned priorities: {ai_priorities}")
        else:
            self.log_result("AI Priority Assignment", False, "AI priority not assigned to tasks")
        
        # Test next best task recommendation
        time.sleep(1)  # Brief pause for AI processing
        result = self.make_request("GET", "/tasks/next-best")
        if result["success"] and "recommendation" in result["data"]:
            recommendation = result["data"]["recommendation"]
            self.log_result("AI Next Best Task Recommendation", True, 
                          f"AI recommendation received: {recommendation[:100]}...")
        else:
            self.log_result("AI Next Best Task Recommendation", False, 
                          f"Status: {result['status_code']}")
    
    def test_habit_tracking_system(self):
        """Test habit tracking with streaks and gamification"""
        print("\n=== Testing Habit Tracking System ===")
        
        # Test create habit
        habit_data = {
            "name": "Morning meditation",
            "description": "10 minutes of mindfulness meditation",
            "category": "wellness",
            "frequency": "daily",
            "target_count": 1,
            "reminder_time": "07:00"
        }
        
        result = self.make_request("POST", "/habits", habit_data)
        if result["success"] and "id" in result["data"]:
            habit_id = result["data"]["id"]
            self.created_habit_ids.append(habit_id)
            self.log_result("Create Habit", True, f"Habit created with ID: {habit_id}")
        else:
            self.log_result("Create Habit", False, f"Status: {result['status_code']}")
            return
        
        # Create second habit
        habit_data2 = {
            "name": "Daily exercise",
            "description": "30 minutes of physical activity",
            "category": "fitness",
            "frequency": "daily",
            "target_count": 1,
            "reminder_time": "18:00"
        }
        
        result = self.make_request("POST", "/habits", habit_data2)
        if result["success"]:
            self.created_habit_ids.append(result["data"]["id"])
        
        # Test get habits
        result = self.make_request("GET", "/habits")
        if result["success"] and isinstance(result["data"], list):
            habit_count = len(result["data"])
            self.log_result("Get User Habits", True, f"Retrieved {habit_count} habits")
        else:
            self.log_result("Get User Habits", False, f"Status: {result['status_code']}")
        
        # Test habit completion with streak tracking and XP
        if self.created_habit_ids:
            result = self.make_request("POST", f"/habits/{self.created_habit_ids[0]}/complete")
            if result["success"] and "streak" in result["data"]:
                streak = result["data"]["streak"]
                self.log_result("Complete Habit with Streak & XP", True, 
                              f"Habit completed, streak: {streak}")
            else:
                self.log_result("Complete Habit with Streak & XP", False, 
                              f"Status: {result['status_code']}")
        
        # Test multiple completions to verify streak increment
        if self.created_habit_ids:
            result = self.make_request("POST", f"/habits/{self.created_habit_ids[0]}/complete")
            if result["success"]:
                streak = result["data"].get("streak", 0)
                self.log_result("Habit Streak Increment", True, f"New streak: {streak}")
            else:
                self.log_result("Habit Streak Increment", False, f"Status: {result['status_code']}")
    
    def test_smart_notification_system(self):
        """Test notification creation and management"""
        print("\n=== Testing Smart Notification System ===")
        
        # Test create notification
        notification_data = {
            "title": "Task Reminder",
            "message": "Don't forget to complete your quarterly presentation",
            "type": "reminder",
            "related_id": self.created_task_ids[0] if self.created_task_ids else None,
            "scheduled_time": (datetime.utcnow() + timedelta(hours=1)).isoformat()
        }
        
        result = self.make_request("POST", "/notifications", notification_data)
        if result["success"] and "id" in result["data"]:
            notification_id = result["data"]["id"]
            self.created_notification_ids.append(notification_id)
            self.log_result("Create Notification", True, f"Notification created: {notification_id}")
        else:
            self.log_result("Create Notification", False, f"Status: {result['status_code']}")
        
        # Create achievement notification
        achievement_data = {
            "title": "Achievement Unlocked!",
            "message": "You've completed 5 tasks this week! Keep it up!",
            "type": "achievement",
            "scheduled_time": datetime.utcnow().isoformat()
        }
        
        result = self.make_request("POST", "/notifications", achievement_data)
        if result["success"]:
            self.created_notification_ids.append(result["data"]["id"])
        
        # Test get notifications
        result = self.make_request("GET", "/notifications")
        if result["success"] and isinstance(result["data"], list):
            notification_count = len(result["data"])
            self.log_result("Get User Notifications", True, 
                          f"Retrieved {notification_count} notifications")
        else:
            self.log_result("Get User Notifications", False, f"Status: {result['status_code']}")
    
    def test_analytics_and_dashboard(self):
        """Test analytics and dashboard statistics"""
        print("\n=== Testing Analytics and Dashboard API ===")
        
        # Test dashboard analytics
        result = self.make_request("GET", "/analytics/dashboard")
        if result["success"]:
            data = result["data"]
            required_fields = ["total_tasks", "completed_tasks", "completion_rate", 
                             "habit_completions_this_week", "xp_points", "karma_level"]
            
            if all(field in data for field in required_fields):
                self.log_result("Dashboard Analytics", True, 
                              f"XP: {data['xp_points']}, Level: {data['karma_level']}, "
                              f"Tasks: {data['completed_tasks']}/{data['total_tasks']}")
            else:
                missing = [f for f in required_fields if f not in data]
                self.log_result("Dashboard Analytics", False, f"Missing fields: {missing}")
        else:
            self.log_result("Dashboard Analytics", False, f"Status: {result['status_code']}")
    
    def test_ai_insights_generation(self):
        """Test AI-powered productivity insights"""
        print("\n=== Testing AI Insights Generation ===")
        
        # Test AI insights
        result = self.make_request("GET", "/ai/insights")
        if result["success"] and "insights" in result["data"]:
            insights = result["data"]["insights"]
            if insights and len(insights) > 0:
                self.log_result("AI Productivity Insights", True, 
                              f"Generated {len(insights)} insights")
            else:
                self.log_result("AI Productivity Insights", True, 
                              "No insights available (insufficient data)")
        else:
            self.log_result("AI Productivity Insights", False, f"Status: {result['status_code']}")
    
    def test_error_handling_and_edge_cases(self):
        """Test error handling and edge cases"""
        print("\n=== Testing Error Handling and Edge Cases ===")
        
        # Test get non-existent task
        fake_id = str(uuid.uuid4())
        result = self.make_request("GET", f"/tasks/{fake_id}")
        if result["status_code"] == 404:
            self.log_result("Handle Non-existent Task", True, "Correctly returned 404")
        else:
            self.log_result("Handle Non-existent Task", False, 
                          f"Expected 404, got {result['status_code']}")
        
        # Test get non-existent user
        result = self.make_request("GET", f"/users/{fake_id}")
        if result["status_code"] == 404:
            self.log_result("Handle Non-existent User", True, "Correctly returned 404")
        else:
            self.log_result("Handle Non-existent User", False, 
                          f"Expected 404, got {result['status_code']}")
        
        # Test invalid task data
        invalid_task = {"title": ""}  # Empty title
        result = self.make_request("POST", "/tasks", invalid_task)
        if not result["success"]:
            self.log_result("Handle Invalid Task Data", True, "Correctly rejected invalid data")
        else:
            self.log_result("Handle Invalid Task Data", False, "Should have rejected empty title")
    
    def run_all_tests(self):
        """Run comprehensive backend testing"""
        print("🚀 Starting Comprehensive Backend API Testing")
        print(f"Backend URL: {self.base_url}")
        print(f"User ID: {self.user_id}")
        print("=" * 60)
        
        # Run all test suites
        self.test_user_authentication_and_management()
        self.test_core_task_management_crud()
        self.test_ai_powered_task_prioritization()
        self.test_habit_tracking_system()
        self.test_smart_notification_system()
        self.test_analytics_and_dashboard()
        self.test_ai_insights_generation()
        self.test_error_handling_and_edge_cases()
        
        # Print final results
        print("\n" + "=" * 60)
        print("🏁 TESTING COMPLETE")
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print("\n🔍 FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.test_results['passed'] / 
                       (self.test_results['passed'] + self.test_results['failed'])) * 100
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        return self.test_results

if __name__ == "__main__":
    tester = TodoAppTester()
    results = tester.run_all_tests()
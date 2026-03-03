from pydantic import BaseModel, Field
from typing import List, Optional

class RegisterRequest(BaseModel):
    name: str
    email: str = Field(..., pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(..., min_length=6)

class SaveTasksRequest(BaseModel):
    user_email: str
    day: str
    tasks: list

class TaskSchema(BaseModel):
    id: str
    text: str
    type: str
    startTime: Optional[int] = None
    endTime: Optional[int] = None
    duration: Optional[int] = None
    priority: Optional[int] = None
    eventMode: Optional[str] = None
    unplaced: Optional[bool] = False

class PlanRequest(BaseModel):
    tasks: List[TaskSchema]
    pomodoro_work: int
    pomodoro_break: int
    pomodoro_cycles: int = 4
    pomodoro_long_break: int = 15
    is_today: bool

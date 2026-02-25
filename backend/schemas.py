from pydantic import BaseModel
from typing import List, Optional

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SaveTasksRequest(BaseModel):
    user_name: str
    day: int
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
    is_today: bool

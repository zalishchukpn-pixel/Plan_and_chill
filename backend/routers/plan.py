from fastapi import APIRouter
from schemas import PlanRequest
from utils import algorithm, Day, Routine, Event, mins_to_time

router = APIRouter()

@router.post("/plan")
async def create_plan(request: PlanRequest):
    current_day = Day(date="today")
    for task in request.tasks:
        if task.type == 'routine' or (task.type == 'event' and task.eventMode == 'manual'):
            r = Routine(task.text, task.startTime or 0, task.endTime or 0)
            r.id = task.id
            current_day.add_event(r)
        else:
            e = Event(task.text, task.priority or 5, task.duration or 60)
            e.id = task.id
            e.original_time = e.time_to_spend
            current_day.add_event(e)

    pomodoro_tuple = (request.pomodoro_work, request.pomodoro_break)
    raw_schedule = algorithm(pomodoro_tuple, current_day, request.is_today)

    final_schedule = []
    for item in raw_schedule:
        item["startTime"] = mins_to_time(item["startTime"])
        item["endTime"] = mins_to_time(item["endTime"])
        final_schedule.append(item)

    final_schedule.sort(key=lambda x: x.get('startTime', '99:99'))
    return {"schedule": final_schedule}

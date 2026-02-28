from datetime import datetime

class Event:
    def __init__(self, name, priority, time_to_spend):
        self.name = name
        self.priority = priority
        actual_time = max(30, int(time_to_spend))
        self.time_to_spend = round_to_5(actual_time)

class Routine:
    def __init__(self, name, time_start, time_finish, frequency=None):
        self.name = name
        self.time_start = time_start
        self.time_finish = time_finish
        self.frequency = frequency

class Day:
    def __init__(self, date):
        self.date = date
        self.priority_queue = []
        self.fixed_schedule = []

    def add_event(self, data):
        if isinstance(data, Event):
            self.priority_queue.append(data)
            return {"status": "added_to_queue"}
        if isinstance(data, Routine):
            for a in self.fixed_schedule:
                if (a.time_start < data.time_start < a.time_finish or
                        data.time_start < a.time_start < data.time_finish):
                    return 'Накладка в розкладі.'
            self.fixed_schedule.append(data)
            return {"status": "added_to_calendar"}
        raise TypeError("Wrong data type")


def round_to_5(minutes):
    return round(minutes / 5) * 5

def get_current_time_minutes():
    now = datetime.now()
    return now.hour * 60 + now.minute

def algorithm(pomodoro, day: Day, is_today: bool):
    work, w_break = pomodoro
    schedule = sorted(day.fixed_schedule, key=lambda x: x.time_start)
    events = sorted(day.priority_queue, key=lambda x: x.priority)
    current_time = get_current_time_minutes() if is_today else 480
    result_schedule = []

    for r in schedule:
        result_schedule.append({
            "id": getattr(r, 'id', f"routine-{r.time_start}"),
            "text": r.name,
            "type": "routine",
            "startTime": r.time_start,
            "endTime": r.time_finish
        })

    for ev in events:
        time_left = getattr(ev, 'time_to_spend', 60)
        while time_left > 0 and current_time < 1440:
            conflict = False
            for r in schedule:
                if r.time_start <= current_time < r.time_finish:
                    current_time = r.time_finish
                    conflict = True
                    break
            if conflict:
                continue
            next_routine = next((r for r in schedule if r.time_start >= current_time), None)
            available_time = (next_routine.time_start - current_time) if next_routine else (1440 - current_time)
            if available_time < work:
                if next_routine:
                    current_time = next_routine.time_finish
                    continue
                else:
                    break
            time_to_work = min(work, time_left)
            result_schedule.append({
                "id": f"auto-{current_time}",
                "text": ev.name + (" (Помодоро)" if getattr(ev, 'original_time', time_left) > work else ""),
                "type": "event",
                "isAuto": True,
                "startTime": current_time,
                "endTime": current_time + time_to_work
            })
            time_left -= time_to_work
            current_time += time_to_work + w_break

    return result_schedule

def mins_to_time(mins):
    h = (mins // 60) % 24
    m = mins % 60
    return f"{h:02d}:{m:02d}"

from fastapi import FastAPI

# app = FastAPI()
# @app.get('/')
# def




import json
from datetime import datetime

class Event:
    def __init__(self, name, priority, time_to_spend):
        self.name=name
        self.priority=priority

        actual_time = max(30, int(time_to_spend))
        self.time_to_spend = round_to_5(actual_time)
    def __str__(self):
        return f"{self.name}, {self.priority} priority with {self.time_to_spend/60} hours to complete"

class Routine:
    def __init__(self, name, time_start, time_finish, frequency=None): #якшо none, то без повторень
        self.name=name
        self.time_start= time_start
        self.time_finish=time_finish
        self.frequency = frequency #з яким інтервалом часу повторюється

class Day:
    def __init__(self, date):
        self.date=date
        self.priority_queue = []
        self.fixed_schedule = []
    @property
    def event_lst(self):
        return self._event_lst
    @event_lst.setter
    def event_lst(self, event_lst):
        self._event_lst=event_lst

    def add_event(self, data):
        if isinstance(data, Event):
            self.priority_queue.append(data)
            return {"status": "added_to_queue", "item": str(data)}

        elif isinstance(data, Routine):
            for a in self.priority_queue:
                if a.time_start < data.time_start < a.time_finish or data.time_start < a.time_start < data.time_finish:
                    return 'Неможливо додати подію: накладка в розкладі.'
                self.fixed_schedule.append(data)
            return {"status": "added_to_calendar", "item": data.name}

def round_to_5(minutes):
    return round(minutes / 5) * 5

def get_current_time_minutes():
    now = datetime.now()
    return now.hour * 60 + now.minute #переводить суто в хвилини

def algorithm(pomodoro, day: Day, is_today: bool):#якщо is_today, то ми враховуємо скільки часу минуло
    work, w_break=pomodoro # кортеж, перший елемент це час роботи в хвилинах, другий це час відпочинку
    schedule=sorted(day.fixed_schedule, key=lambda x: x.time_start)
    events=sorted(day.priority_queue, key=lambda x: (x.priority,x.time_to_spend)) #якщо справа термінова і швидка, беремо спершу її
    if is_today:
        pass
    else:
        for i,a in enumerate(schedule[:-1]):
            if schedule[i+1].time_start - a.time_finish >= work+w_break and

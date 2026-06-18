"""
RespondOncePreprocessor — deterministic anti-duplicate guard.

Each Band agent normally reacts to every message that mentions it. In the 9-agent
fan-out/fan-in flow that causes duplicates (a reviewer re-posts when re-mentioned,
Master decides twice, etc.). This preprocessor enforces ONE reply per agent per
room: the agent responds to the first message that warrants a reply, then ignores
all further messages in that room.

Since every demo uses a FRESH room (new_demo.py), "once per room" == "once per
demo" — exactly what we want for a clean, readable transcript.
"""

from band.preprocessing import DefaultPreprocessor


class RespondOncePreprocessor(DefaultPreprocessor):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._responded_rooms: set[str] = set()

    async def process(self, ctx, event, agent_id):
        result = await super().process(ctx, event, agent_id)
        if result is None:
            return None  # not a message that needs a reply
        room_id = getattr(event, "room_id", None)
        if room_id is None:
            return result
        if room_id in self._responded_rooms:
            return None  # already replied once in this room → stay quiet
        self._responded_rooms.add(room_id)
        return result

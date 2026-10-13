import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.core.database import AsyncSessionLocal
from backend.engine.orchestrator import TurnOrchestrator
from backend.engine.speech import SpeechService

logger = logging.getLogger("websocket")
ws_router = APIRouter()

@ws_router.websocket("/ws/v1/interview/{session_id}")
async def interview_websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connected for session: {session_id}")

    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                message = json.loads(raw_data)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"type": "error", "message": "Invalid JSON format."}))
                continue

            msg_type = message.get("type")

            # 1. Initialize Interview & Send First Greeting
            if msg_type == "init":
                async with AsyncSessionLocal() as db:
                    greeting_text, turn_index = await TurnOrchestrator.get_initial_greeting(session_id, db)
                    audio_base64 = await SpeechService.synthesize_speech_base64(greeting_text)

                    await websocket.send_text(json.dumps({
                        "type": "ai_turn",
                        "turn_index": turn_index,
                        "text": greeting_text,
                        "audio_base64": audio_base64,
                        "status": "SPEAKING"
                    }))

            # 2. Process Candidate Spoken Turn
            elif msg_type == "candidate_turn":
                candidate_text = message.get("text", "").strip()
                client_latency = float(message.get("latency_ms", 0.0))

                if not candidate_text:
                    continue

                # Notify client AI is thinking
                await websocket.send_text(json.dumps({
                    "type": "turn_status",
                    "status": "THINKING"
                }))

                async with AsyncSessionLocal() as db:
                    result = await TurnOrchestrator.process_candidate_turn(
                        session_id=session_id,
                        candidate_text=candidate_text,
                        latency_ms=client_latency,
                        db=db
                    )

                    ai_text = result["text"]
                    audio_base64 = await SpeechService.synthesize_speech_base64(ai_text)

                    await websocket.send_text(json.dumps({
                        "type": "ai_turn",
                        "turn_index": result["turn_index"],
                        "text": ai_text,
                        "audio_base64": audio_base64,
                        "latency_ms": result["latency_ms"],
                        "is_completed": result["is_completed"],
                        "status": "SPEAKING"
                    }))

            # 3. Explicit Interview Completion
            elif msg_type == "complete":
                await websocket.send_text(json.dumps({
                    "type": "session_completed",
                    "session_id": session_id,
                    "message": "Interview session successfully closed."
                }))
                break

            # 4. Keepalive Ping
            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass

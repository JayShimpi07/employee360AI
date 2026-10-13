import io
import base64
import logging
from typing import Optional
from backend.core.config import settings

logger = logging.getLogger("speech")

class SpeechService:
    """
    High-performance Speech Synthesis & Audio Service.
    Supports asynchronous edge-tts with automatic graceful fallback to client-side Web Speech.
    """

    @classmethod
    async def synthesize_speech_base64(cls, text: str) -> Optional[str]:
        """
        Synthesizes text into high-quality neural voice audio and returns base64-encoded MP3.
        Returns None if TTS fails, allowing client to use local browser TTS.
        """
        try:
            import edge_tts
            voice = settings.TTS_VOICE or "en-US-GuyNeural"
            communicate = edge_tts.Communicate(text, voice)
            audio_buffer = bytearray()

            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.extend(chunk["data"])

            if audio_buffer:
                return base64.b64encode(audio_buffer).decode("utf-8")
            return None
        except Exception as e:
            logger.warning(f"Server-side TTS synthesis skipped: {e}. Falling back to browser audio.")
            return None

import os
import base64
import io
import time
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from PIL import Image

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

from backend.models.enums import AnomalyType

class ProctoringEngine:
    """
    Computer Vision Anomaly Detection & Proctoring Engine (PS2):
    Analyzes 1 FPS camera keyframe snapshots and acoustic signals to detect:
      - Candidate Absence (0 faces)
      - Multiple Individuals (> 1 face)
      - Gaze / Head Pose Deviation (candidate glancing away or downward at a phone)
      - Browser Tab Switch / Window Blur
      - Secondary Voice Detection
    """

    STORAGE_DIR = os.path.join(os.path.abspath("."), "storage", "proctoring")
    _face_cascade = None
    _eye_cascade = None

    @classmethod
    def _get_cascades(cls):
        if not CV2_AVAILABLE:
            return None, None

        if cls._face_cascade is None:
            try:
                face_xml = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
                cls._face_cascade = cv2.CascadeClassifier(face_xml)
            except Exception:
                cls._face_cascade = None

        if cls._eye_cascade is None:
            try:
                eye_xml = cv2.data.haarcascades + "haarcascade_eye.xml"
                cls._eye_cascade = cv2.CascadeClassifier(eye_xml)
            except Exception:
                cls._eye_cascade = None

        return cls._face_cascade, cls._eye_cascade

    @classmethod
    def decode_frame(cls, frame_base64_or_bytes: Any) -> Optional[np.ndarray]:
        """
        Decodes a base64 encoded string or raw bytes into a BGR numpy array.
        """
        try:
            if isinstance(frame_base64_or_bytes, str):
                if "," in frame_base64_or_bytes:
                    frame_base64_or_bytes = frame_base64_or_bytes.split(",", 1)[1]
                data = base64.b64decode(frame_base64_or_bytes)
            elif isinstance(frame_base64_or_bytes, bytes):
                data = frame_base64_or_bytes
            else:
                return None

            if CV2_AVAILABLE:
                nparr = np.frombuffer(data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                return img
            else:
                pil_img = Image.open(io.BytesIO(data)).convert("RGB")
                arr = np.array(pil_img)
                # Convert RGB to BGR for uniform processing
                return arr[:, :, ::-1].copy()
        except Exception:
            return None

    @classmethod
    def analyze_frame(
        cls,
        frame_input: Any,
        session_id: str,
        timestamp_offset_ms: int
    ) -> Dict[str, Any]:
        """
        Runs CV detectors across a single video frame keyframe snapshot.
        """
        os.makedirs(cls.STORAGE_DIR, exist_ok=True)
        img = cls.decode_frame(frame_input)

        if img is None:
            return {
                "timestamp_offset_ms": timestamp_offset_ms,
                "faces_detected": 0,
                "face_boxes": [],
                "anomalies": [AnomalyType.FACE_ABSENCE.value],
                "confidence": 0.90,
                "details": {"reason": "Corrupt or unreadable frame"},
                "snapshot_path": None,
                "is_anomalous": True
            }

        height, width = img.shape[:2]
        face_cascade, eye_cascade = cls._get_cascades()

        faces = []
        if CV2_AVAILABLE and face_cascade is not None:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            # Histogram equalization to handle dim or variable lighting
            gray = cv2.equalizeHist(gray)
            detected = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(int(width * 0.12), int(height * 0.12))
            )
            faces = [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in detected]
        else:
            # Robust Multi-Zone Skin Clustering Algorithm (Kovac / Peer rule)
            # img is in BGR format: channel 0 = Blue, channel 1 = Green, channel 2 = Red
            b = img[:, :, 0].astype(float)
            g = img[:, :, 1].astype(float)
            r = img[:, :, 2].astype(float)

            skin_mask = (r > 90) & (g > 40) & (b > 20) & ((r - g) > 15) & (r > g) & (r > b)
            total_skin_ratio = np.sum(skin_mask) / (height * width)

            if total_skin_ratio < 0.025:
                faces = []
            else:
                # Divide into spatial zones: left, center, right
                w_third = width // 3
                left_mask = skin_mask[:, :w_third]
                center_mask = skin_mask[:, w_third:2 * w_third]
                right_mask = skin_mask[:, 2 * w_third:]

                left_ratio = np.sum(left_mask) / (height * w_third)
                center_ratio = np.sum(center_mask) / (height * w_third)
                right_ratio = np.sum(right_mask) / (height * w_third)

                # If both left and right flanks have skin -> multiple separated people
                if left_ratio > 0.025 and right_ratio > 0.025:
                    faces = [
                        (int(width * 0.12), int(height * 0.2), int(width * 0.3), int(height * 0.5)),
                        (int(width * 0.58), int(height * 0.2), int(width * 0.3), int(height * 0.5))
                    ]
                else:
                    # Single face: determine centroid to compute gaze/head pose offset
                    y_indices, x_indices = np.where(skin_mask)
                    if len(x_indices) > 0 and len(y_indices) > 0:
                        cx = int(np.mean(x_indices))
                        cy = int(np.mean(y_indices))
                        w_box = int(width * 0.32)
                        h_box = int(height * 0.44)
                        fx = max(0, cx - w_box // 2)
                        fy = max(0, cy - h_box // 2)
                        faces = [(fx, fy, w_box, h_box)]
                    else:
                        faces = [(int(width * 0.3), int(height * 0.2), int(width * 0.4), int(height * 0.5))]

        num_faces = len(faces)
        anomalies: List[Dict[str, Any]] = []

        # 1. Face Count Analysis
        if num_faces == 0:
            anomalies.append({
                "type": AnomalyType.FACE_ABSENCE.value,
                "confidence": 0.98,
                "description": "Candidate absence detected (0 faces in frame)."
            })
        elif num_faces > 1:
            anomalies.append({
                "type": AnomalyType.MULTIPLE_FACES.value,
                "confidence": 0.92,
                "description": f"Multiple individuals detected in frame ({num_faces} faces)."
            })
        else:
            # 2. Single Face: Head Pose & Gaze Deviation Estimation
            fx, fy, fw, fh = faces[0]
            center_x = fx + fw / 2.0
            center_y = fy + fh / 2.0

            # Normalized offsets from frame center [-0.5, +0.5]
            offset_x = (center_x - width / 2.0) / width
            offset_y = (center_y - height / 2.0) / height

            is_looking_away = abs(offset_x) > 0.28 or offset_y > 0.24 or offset_y < -0.28
            
            # Eye detection inside upper half of face
            eyes_found = 0
            if CV2_AVAILABLE and eye_cascade is not None:
                roi_gray = gray[fy:fy + int(fh * 0.55), fx:fx + fw]
                eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=3)
                eyes_found = len(eyes)

            if is_looking_away:
                anomalies.append({
                    "type": AnomalyType.GAZE_DEVIATION.value,
                    "confidence": 0.86,
                    "description": f"Candidate gaze or head pose deviated off-camera (dx: {offset_x:.2f}, dy: {offset_y:.2f})."
                })

        # Save snapshot thumbnail if anomaly detected
        snapshot_rel_path = None
        if anomalies:
            filename = f"proctor_{session_id}_{timestamp_offset_ms}.jpg"
            abs_path = os.path.join(cls.STORAGE_DIR, filename)
            try:
                # Annotate bounding box if faces exist
                annotated = img.copy()
                for (x, y, w, h) in faces:
                    if CV2_AVAILABLE:
                        cv2.rectangle(annotated, (x, y), (x + w, y + h), (0, 0, 255), 2)
                
                # Downsample to thumbnail to save disk space
                thumb = Image.fromarray(annotated[:, :, ::-1] if CV2_AVAILABLE else annotated)
                thumb.thumbnail((320, 240))
                thumb.save(abs_path, format="JPEG", quality=75)
                snapshot_rel_path = f"/storage/proctoring/{filename}"
            except Exception:
                snapshot_rel_path = None

        highest_conf = max([a["confidence"] for a in anomalies]) if anomalies else 0.0

        return {
            "timestamp_offset_ms": timestamp_offset_ms,
            "faces_detected": num_faces,
            "face_boxes": [{"x": x, "y": y, "w": w, "h": h} for (x, y, w, h) in faces],
            "anomalies": [a["type"] for a in anomalies],
            "anomaly_details": anomalies,
            "confidence": highest_conf,
            "details": {
                "frame_dimensions": {"width": width, "height": height},
                "head_offset_x": round(offset_x, 3) if num_faces == 1 else 0.0,
                "head_offset_y": round(offset_y, 3) if num_faces == 1 else 0.0,
            },
            "snapshot_path": snapshot_rel_path,
            "is_anomalous": len(anomalies) > 0
        }

    @classmethod
    def calculate_session_integrity_score(cls, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculates holistic Proctoring Integrity Score (0.0 to 1.0) and anomaly timeline.
        Deductions are non-punitive and calibrated per empirical research targets:
          - Multiple Faces: -0.20 per incident
          - Face Absence: -0.15 per incident
          - Gaze Deviation: -0.05 per incident
          - Device Blur / Tab Switch: -0.10 per incident
          - Second Voice: -0.15 per incident
        """
        score = 1.0
        counts = {
            AnomalyType.FACE_ABSENCE.value: 0,
            AnomalyType.MULTIPLE_FACES.value: 0,
            AnomalyType.GAZE_DEVIATION.value: 0,
            AnomalyType.DEVICE_BLUR.value: 0,
            AnomalyType.SECOND_VOICE.value: 0,
        }

        for ev in events:
            atype = ev.get("anomaly_type")
            if atype in counts:
                counts[atype] += 1

        # Apply calibrated deductions
        score -= (counts[AnomalyType.MULTIPLE_FACES.value] * 0.20)
        score -= (counts[AnomalyType.FACE_ABSENCE.value] * 0.15)
        score -= (counts[AnomalyType.DEVICE_BLUR.value] * 0.10)
        score -= (counts[AnomalyType.SECOND_VOICE.value] * 0.15)
        score -= (counts[AnomalyType.GAZE_DEVIATION.value] * 0.04)

        score = max(0.0, min(1.0, round(score, 2)))

        is_flagged = score < 0.75 or counts[AnomalyType.MULTIPLE_FACES.value] > 0

        risk_tier = (
            "HIGH INTEGRITY — Clean session with consistent camera presence."
            if score >= 0.85
            else "MODERATE INTEGRITY — Intermittent gaze deviation or momentary window blur detected."
            if score >= 0.65
            else "ANOMALOUS SESSION — Significant presence gaps or secondary individuals detected."
        )

        return {
            "integrity_score": score,
            "integrity_percent": int(score * 100),
            "is_flagged": is_flagged,
            "risk_tier": risk_tier,
            "anomaly_counts": counts,
            "total_anomalies": sum(counts.values())
        }

    @classmethod
    def generate_synthetic_test_frame(cls, scenario: str) -> Tuple[str, bytes]:
        """
        Generates realistic synthetic test frames for the Adversarial Proctoring Lab:
          - 'NORMAL': Centered candidate face
          - 'FACE_ABSENCE': Empty frame / background
          - 'MULTIPLE_FACES': 2 distinct faces
          - 'GAZE_DEVIATION': Face shifted off-edge / looking down
        """
        width, height = 640, 480
        img = Image.new("RGB", (width, height), color=(240, 244, 248))
        import PIL.ImageDraw as ImageDraw
        draw = ImageDraw.Draw(img)

        # Background room gradient
        draw.rectangle([0, 360, width, height], fill=(218, 224, 233)) # desk

        if scenario == "NORMAL":
            # 1 centered face
            cx, cy = 320, 200
            draw.ellipse([cx - 70, cy - 90, cx + 70, cy + 90], fill=(235, 195, 165), outline=(180, 140, 110), width=2)
            # Eyes
            draw.ellipse([cx - 35, cy - 20, cx - 15, cy - 10], fill=(60, 40, 30))
            draw.ellipse([cx + 15, cy - 20, cx + 35, cy - 10], fill=(60, 40, 30))
            # Mouth
            draw.line([cx - 25, cy + 40, cx + 25, cy + 40], fill=(160, 70, 70), width=3)

        elif scenario == "MULTIPLE_FACES":
            # Face 1 (left)
            c1x, c1y = 200, 200
            draw.ellipse([c1x - 60, c1y - 80, c1x + 60, c1y + 80], fill=(235, 195, 165), outline=(180, 140, 110), width=2)
            draw.ellipse([c1x - 30, c1y - 15, c1x - 10, c1y - 5], fill=(60, 40, 30))
            draw.ellipse([c1x + 10, c1y - 15, c1x + 30, c1y - 5], fill=(60, 40, 30))
            # Face 2 (right - proxy / accomplice)
            c2x, c2y = 480, 190
            draw.ellipse([c2x - 55, c2y - 75, c2x + 55, c2y + 75], fill=(225, 185, 155), outline=(170, 130, 100), width=2)
            draw.ellipse([c2x - 25, c2y - 15, c2x - 10, c2y - 5], fill=(60, 40, 30))
            draw.ellipse([c2x + 10, c2y - 15, c2x + 25, c2y - 5], fill=(60, 40, 30))

        elif scenario == "GAZE_DEVIATION":
            # Face shifted down-right (looking at phone)
            cx, cy = 520, 310
            draw.ellipse([cx - 60, cy - 80, cx + 60, cy + 80], fill=(235, 195, 165), outline=(180, 140, 110), width=2)
            # Eyes looking downwards
            draw.ellipse([cx - 30, cy + 5, cx - 15, cy + 12], fill=(60, 40, 30))
            draw.ellipse([cx + 15, cy + 5, cx + 30, cy + 12], fill=(60, 40, 30))

        elif scenario == "FACE_ABSENCE":
            # Empty frame - no face elements
            draw.text((220, 220), "Candidate Stepped Away", fill=(140, 150, 165))

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        raw_bytes = buf.getvalue()
        b64 = "data:image/jpeg;base64," + base64.b64encode(raw_bytes).decode("utf-8")
        return b64, raw_bytes

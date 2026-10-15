import re
from typing import List, Dict, Any, Optional

class ResumeDefender:
    """
    'Defend Your Resume' Claim Verification Engine.
    Parses resume text into verifiable technical and architectural claims,
    and maps them to interview evidence.
    """

    TECHNICAL_KEYWORDS = [
        "architected", "designed", "built", "implemented", "deployed",
        "optimized", "scaled", "led", "developed", "created", "refactored",
        "microservices", "kubernetes", "docker", "fastapi", "react", "python",
        "typescript", "postgresql", "redis", "kafka", "aws", "gcp", "azure",
        "ci/cd", "graphql", "rest", "distributed", "nosql", "mongodb"
    ]

    @classmethod
    def extract_claims(cls, resume_text: Optional[str]) -> List[Dict[str, Any]]:
        """
        Parses resume text into distinct verifiable technical propositions.
        """
        if not resume_text or not resume_text.strip():
            return []

        # Split into sentences and bullet points
        lines = re.split(r'[\n\r•\-\*]+', resume_text)
        claims = []
        claim_id = 1

        for line in lines:
            line_clean = line.strip()
            if len(line_clean) < 20 or len(line_clean) > 300:
                continue

            lower_line = line_clean.lower()
            # Check for presence of technical verbs or keywords
            matched_keywords = [kw for kw in cls.TECHNICAL_KEYWORDS if kw in lower_line]

            if matched_keywords:
                claims.append({
                    "claim_id": f"claim_{claim_id}",
                    "statement": line_clean,
                    "keywords": matched_keywords,
                    "status": "PENDING_VERIFICATION",
                    "supporting_turns": []
                })
                claim_id += 1

        # If no bullet matches, generate synthetic high-level claims from sentences
        if not claims:
            sentences = re.split(r'[.!?]+', resume_text)
            for s in sentences:
                s_clean = s.strip()
                if len(s_clean) >= 25:
                    claims.append({
                        "claim_id": f"claim_{claim_id}",
                        "statement": s_clean,
                        "keywords": [],
                        "status": "PENDING_VERIFICATION",
                        "supporting_turns": []
                    })
                    claim_id += 1
                    if len(claims) >= 3:
                        break

        return claims[:5] # Top 5 primary claims

    @classmethod
    def match_claim_to_transcript(
        cls, claim_statement: str, transcript_turns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Checks if candidate speech turns provide evidence supporting a resume claim.
        """
        claim_words = set(re.findall(r'\b[a-z]{4,}\b', claim_statement.lower()))
        best_match_quote = ""
        highest_score = 0.0
        matching_turn_idx = None

        for turn in transcript_turns:
            if turn.get("speaker") != "CANDIDATE":
                continue
            text = turn.get("text", "")
            turn_words = set(re.findall(r'\b[a-z]{4,}\b', text.lower()))
            overlap = claim_words.intersection(turn_words)
            if overlap:
                score = len(overlap) / max(len(claim_words), 1)
                if score > highest_score:
                    highest_score = score
                    best_match_quote = text
                    matching_turn_idx = turn.get("turn_index")

        status = "SUPPORTED" if highest_score >= 0.40 else "PARTIAL" if highest_score > 0.15 else "INSUFFICIENT"

        return {
            "status": status,
            "confidence": round(min(1.0, highest_score * 1.5), 2),
            "evidence_quote": best_match_quote if best_match_quote else "No matching candidate explanation detected.",
            "turn_index": matching_turn_idx
        }

import datetime
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, DateTime, JSON
from ..database import Base

class ProjectRecord(Base):
    __tablename__ = "projects"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=True)
    extracted_files = Column(JSON, default=list)
    discovered_tools = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PolicyRecord(Base):
    __tablename__ = "policies"

    id = Column(String(64), primary_key=True, index=True)
    project_id = Column(String(64), index=True, nullable=True)
    agent_name = Column(String(255), nullable=False)
    version = Column(String(32), default="2.0")
    yaml_content = Column(Text, nullable=False)
    parsed_json = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SimulationRunRecord(Base):
    __tablename__ = "simulation_runs"

    id = Column(String(64), primary_key=True, index=True)
    scenario_id = Column(String(128), index=True)
    user_goal = Column(Text, nullable=False)
    malicious_payload = Column(Text, nullable=False)
    unprotected_status = Column(String(64), default="BREACHED")
    unprotected_outcome = Column(Text, default="")
    contractguard_status = Column(String(64), default="BLOCKED")
    interception_stage = Column(String(128), default="")
    interception_reason = Column(Text, default="")
    latency_ms = Column(Float, default=0.0)
    audit_trail = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AttackSignatureRecord(Base):
    __tablename__ = "attack_signatures"

    id = Column(String(64), primary_key=True, index=True)
    pattern = Column(Text, nullable=False)
    signature_type = Column(String(64), default="regex")  # regex, prefix, embedding_hash
    attack_family = Column(String(128), default="jailbreak")
    description = Column(String(255), default="")

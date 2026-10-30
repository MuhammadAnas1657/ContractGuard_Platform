import datetime
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, DateTime, JSON
from ..database import Base

class UserRecord(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="Developer")
    role = Column(String(64), default="developer")  # developer, judge, admin
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ProjectRecord(Base):
    __tablename__ = "projects"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=True)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=True)
    extracted_files = Column(JSON, default=list)
    discovered_tools = Column(JSON, default=list)
    policy_yaml = Column(Text, nullable=True)
    policy_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PolicyRecord(Base):
    __tablename__ = "policies"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=True)
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
    user_id = Column(String(64), index=True, nullable=True)
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
    signature_type = Column(String(64), default="regex")  # regex, prefix, embedding_hash, vector, dataset
    attack_family = Column(String(128), default="jailbreak")
    description = Column(String(255), default="")
    severity = Column(String(32), default="HIGH")
    source_dataset = Column(String(128), default="Curated")

class ApiKeyRecord(Base):
    __tablename__ = "api_keys"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    project_id = Column(String(64), index=True, nullable=True)
    key_name = Column(String(255), default="Production Gateway Key")
    key_prefix = Column(String(32), nullable=False)  # Displayed to user e.g. cgx_live_ab12...
    key_hash = Column(String(255), nullable=False)   # SHA-256 hash for secure verification
    key_type = Column(String(32), default="gateway", nullable=False)  # "ingress" | "egress" | "gateway"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

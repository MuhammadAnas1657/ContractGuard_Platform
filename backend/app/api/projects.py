import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models.db_models import ProjectRecord
from ..models.schemas import DiscoveredToolsResponse, ToolDefinitionSchema
from ..core.zip_extractor import ZipToolExtractor

router = APIRouter(prefix="/project", tags=["Projects & Ingestion"])

@router.post("/upload-zip", response_model=DiscoveredToolsResponse)
async def upload_agent_zip(
    file: UploadFile = File(...),
    project_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Zero-Trust Developer Ingestion:
    Upload an agent .zip file to sandboxed AST parser. Extracts tools without running code.
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip archives are supported.")

    content = await file.read()
    extracted_files, tools, _ = ZipToolExtractor.extract_tools_from_zip(content)

    proj_id = f"proj_{uuid.uuid4().hex[:8]}"
    name = project_name or file.filename.replace(".zip", "")

    # Save record to database
    record = ProjectRecord(
        id=proj_id,
        name=name,
        filename=file.filename,
        extracted_files=extracted_files,
        discovered_tools=tools
    )
    db.add(record)
    db.commit()

    return DiscoveredToolsResponse(
        project_id=proj_id,
        filename=file.filename,
        extracted_files=extracted_files,
        tools=[ToolDefinitionSchema(**t) for t in tools]
    )

@router.post("/tools/discover", response_model=DiscoveredToolsResponse)
def discover_preset_tools(template: str = "customer_support"):
    """Returns sample agent tools without needing to upload a zip file."""
    tools = ZipToolExtractor.get_preset_template(template)
    return DiscoveredToolsResponse(
        project_id=f"preset_{template}",
        filename=f"{template}.py",
        extracted_files=[f"{template}.py"],
        tools=[ToolDefinitionSchema(**t) for t in tools]
    )

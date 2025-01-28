from pydantic import BaseModel, Field, validator
from typing import List, Optional

class ChatRequest(BaseModel):
    model: str
    message: str
    temperature: float = Field(default=0.7, ge=0, le=1)
    
    @validator('temperature')
    def validate_temperature(cls, v):
        if not 0 <= v <= 1:
            raise ValueError("Temperature must be between 0 and 1")
        return v

class DiscussRequest(BaseModel):
    topic: str
    models: List[str]
    temperature: float = Field(default=0.7, ge=0, le=1)
    
    @validator('models')
    def validate_models(cls, v):
        if not v:
            raise ValueError("At least one model must be selected")
        if len(v) > 3:
            raise ValueError("Maximum 3 models allowed")
        return v 
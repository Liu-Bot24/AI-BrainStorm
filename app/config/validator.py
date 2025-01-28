from typing import List, Dict
import os
from pydantic import BaseSettings, HttpUrl

class ModelConfig(BaseSettings):
    name: str
    endpoint: HttpUrl
    key: str

class AppConfig(BaseSettings):
    models: Dict[str, ModelConfig]
    
    class Config:
        env_file = ".env"

def validate_environment() -> List[str]:
    errors = []
    required_vars = [
        "GLM_4_FLASH_KEY",
        "DEEPSEEK_CHAT_KEY",
        "4.0ULTRA_KEY",
        "EP_20241224143242_HVLWZ_KEY",
        "QWEN_TURBO_1101_KEY"
    ]
    
    for var in required_vars:
        if not os.getenv(var):
            errors.append(f"Missing required environment variable: {var}")
    
    return errors 
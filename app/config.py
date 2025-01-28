import os
from dotenv import load_dotenv
from typing import Dict, Any, Optional
import logging
import logging.handlers
from fastapi import FastAPI, Request

# 配置日志
file_handler = logging.handlers.RotatingFileHandler(
    'app.log',
    maxBytes=1024 * 1024,  # 1MB
    backupCount=5,
    encoding='utf-8'
)

console_handler = logging.StreamHandler()

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[file_handler, console_handler]
)

logger = logging.getLogger(__name__)

# 加载 .env 文件
load_dotenv()

def get_env_or_raise(key: str, default: Optional[str] = None) -> str:
    value = os.getenv(key, default)
    if not value and default is None:
        raise ValueError(f"Missing required environment variable: {key}")
    return value

def get_model_key(model_id: str) -> Optional[str]:
    """获取模型API密钥，处理不同的命名格式"""
    env_key = f"{model_id.replace('-', '_').upper()}_KEY"
    return os.getenv(env_key)

def load_models() -> Dict[str, Dict[str, Any]]:
    """动态加载模型配置"""
    models = {}
    available_models = os.getenv('AVAILABLE_MODELS', '').split(',')
    
    for model_id in available_models:
        if not model_id:
            continue
            
        env_prefix = model_id.replace('-', '_').upper()
        
        model_config = {
            'name': os.getenv(f'{env_prefix}_NAME'),
            'endpoint': os.getenv(f'{env_prefix}_ENDPOINT'),
            'key': os.getenv(f'{env_prefix}_KEY'),
        }
        
        # 只添加配置完整的模型
        if all([model_config['name'], model_config['endpoint'], model_config['key']]):
            models[model_id] = model_config
    
    return models

MODELS = load_models()

def validate_config():
    """验证模型配置"""
    if not MODELS:
        logger.error("No valid model configurations found")
        return
        
    for model_id, config in MODELS.items():
        logger.info(f"Validating config for model: {model_id}")
        logger.info(f"Endpoint: {config.get('endpoint')}")
        logger.info(f"Key length: {len(config.get('key', ''))} chars")

validate_config()

app = FastAPI()

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Hello World"}

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response
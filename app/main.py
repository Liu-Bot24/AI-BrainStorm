from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
import logging
from dotenv import load_dotenv
from .routers import chat
import os

# 确保在应用启动时加载环境变量
load_dotenv()

# 打印环境变量检查
print("Environment variables loaded:")
for key in ['GLM_4_FLASH_KEY', 'DEEPSEEK_CHAT_KEY', '4.0ULTRA_KEY', 'EP_20241224143242_HVLWZ_KEY', 'QWEN_TURBO_1101_KEY']:
    value = os.getenv(key)
    if value:
        print(f"{key}: {'*' * len(value)} (length: {len(value)})")
    else:
        print(f"{key}: Not found")

app = FastAPI()
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件和模板配置
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# 路由注册
app.include_router(chat.router, prefix="/api")

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request}) 
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from ..services.chat_service import ChatService
from ..config import MODELS  # 直接导入配置
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging
import asyncio
from fastapi import FastAPI
import httpx
import json

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

logger = logging.getLogger(__name__)

@router.post("/chat")
@limiter.limit("10/minute")
async def chat(request: Request):
    chat_service = ChatService()
    try:
        data = await request.json()
        return StreamingResponse(
            chat_service.stream_response(data),
            media_type="text/event-stream"
        )
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)

@router.post("/discuss")
@limiter.limit("5/minute")
async def discuss(request: Request):
    logger.info("Received discuss request")
    chat_service = ChatService()
    try:
        data = await request.json()
        logger.info(f"Request data: {data}")
        result = await chat_service.process_discussion(data)
        logger.info("Discussion completed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in discuss endpoint: {str(e)}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=400)

@router.post("/model-api/{model_id}")
@limiter.limit("10/minute")
async def model_api(model_id: str, request: Request):
    try:
        model_config = MODELS.get(model_id)
        if not model_config:
            return JSONResponse({"error": "Model not found"}, status_code=404)
            
        data = await request.json()
        
        if isinstance(data, dict):
            if 'stream' not in data:
                data['stream'] = True
        
        headers = {
            'Authorization': f'Bearer {model_config["key"]}',
            'Content-Type': 'application/json'
        }
        
        logger.info(f"Making request to {model_config['endpoint']} for model {model_id}")
        
        client = httpx.AsyncClient()
        
        async def generate():
            try:
                async with client.stream(
                    'POST',
                    model_config['endpoint'],
                    json=data,
                    headers=headers,
                    timeout=30.0
                ) as response:
                    
                    if response.status_code >= 400:
                        error_text = await response.aread()
                        logger.error(f"API request failed: {response.status_code} - {error_text}")
                        yield f"data: {json.dumps({'error': str(error_text)})}\n\n"
                        return
                    
                    async for line in response.aiter_lines():
                        if line.startswith('data: '):
                            yield f"{line}\n\n"
            except Exception as e:
                logger.error(f"Error in generate: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            finally:
                await client.aclose()
        
        return StreamingResponse(
            generate(),
            media_type='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        )
            
    except Exception as e:
        logger.error(f"Error in model API proxy: {str(e)}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=400) 

import httpx
import asyncio
from typing import Dict, List, Any, AsyncGenerator
from ..config import MODELS

class ChatService:
    async def process_chat(self, data: Dict) -> str:
        model_id = data.get("model")
        message = data.get("message")
        temperature = float(data.get("temperature", 0.7))
        
        if not 0 <= temperature <= 1:
            raise ValueError("Temperature must be between 0 and 1")
            
        if not model_id or not message:
            raise ValueError("Missing required fields: model and message")
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await self._make_api_request(
                client, model_id, message, temperature
            )
            return self._extract_content(response)
    
    async def process_discussion(self, data: Dict) -> List[Dict[str, Any]]:
        topic = data.get("topic")
        models = data.get("models", [])
        temperature = float(data.get("temperature", 0.7))
        
        if not topic or not models:
            raise ValueError("Missing required fields: topic and models")
            
        if len(models) > 3:
            raise ValueError("Maximum 3 models allowed for discussion")
            
        messages = []
        for round_num in range(1, 4):
            round_messages = []
            for model_id in models:
                prompt = self._build_prompt(topic, round_num, len(round_messages), messages)
                response = await self.process_chat({
                    "model": model_id,
                    "message": prompt,
                    "temperature": temperature
                })
                
                message = {
                    "model": MODELS[model_id]["name"],
                    "content": response,
                    "round": round_num
                }
                round_messages.append(message)
                messages.append(message)
                
            await asyncio.sleep(1)
            
        return messages

    async def _make_api_request(self, client: httpx.AsyncClient, model_id: str, 
                               message: str, temperature: float) -> Dict:
        model_config = MODELS.get(model_id)
        if not model_config:
            raise ValueError(f"Model {model_id} not found")
            
        if not model_config.get('key'):
            raise ValueError(f"API key not configured for model {model_id}")
            
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {model_config['key']}" if model_id != "glm-4-flash" else model_config['key']
        }
        
        response = await client.post(
            model_config["endpoint"],
            json={
                "model": model_id,
                "messages": [{"role": "user", "content": message}],
                "temperature": temperature,
                "max_tokens": 1000
            },
            headers=headers
        )
        response.raise_for_status()
        return response.json()

    def _extract_content(self, response: Dict) -> str:
        if "choices" in response and response["choices"]:
            message = response["choices"][0].get("message", {})
            content = message.get("content", "")
            if content:
                return content
        raise ValueError("Invalid or empty response from API")
        
    def _build_prompt(self, topic: str, round: int, index: int, messages: list) -> str:
        if round == 1:
            if index == 0:
                return f'你正在参加一个关于"{topic}"的头脑风暴。作为第一个发言者，请用简洁的语言表达你的观点，字数控制在500字以内。'
            
            current_round_messages = "\n\n".join([
                f"{msg['model']}: {msg['content']}" 
                for msg in messages 
                if msg['round'] == round
            ])
            
            return f'''你正在参加一个关于"{topic}"的头脑风暴。在你之前，有以下发言：

{current_round_messages}

请针对上一位发言者的观点进行回应（可以是支持、补充或有不同看法），然后再补充你的新观点。要求：
1. 字数控制在500字以内
2. 要明确表示对上一个发言的回应
3. 使用自然的语言和段落，不要使用特殊格式
4. 注意语言的连贯性，表现出你在认真倾听他人'''
        
        # 获取上一轮该模型的发言
        previous_round_message = next(
            (msg['content'] for msg in messages 
             if msg['round'] == round - 1 and 
             msg['model'] == messages[-1]['model']), 
            ""
        )
        
        current_round_messages = "\n".join([
            f"{msg['model']}: {msg['content']}" 
            for msg in messages 
            if msg['round'] == round
        ])
        
        return f'''在"{topic}"这个话题的第{round}轮讨论中，你之前在上一轮说过：

{previous_round_message}

本轮其他人的发言：
{current_round_messages}

请结合上一轮的讨论和本轮前面的发言：
1. 简单总结一下你之前的观点
2. 对本轮前一位发言者的观点进行回应
3. 提出新的见解或对之前观点进行完善
4. 字数控制在500字以内
5. 使用自然的语言和段落，不要使用特殊格式''' 

    async def stream_response(self, data: Dict) -> AsyncGenerator[str, None]:
        model_id = data.get("model")
        message = data.get("message")
        temperature = float(data.get("temperature", 0.7))
        
        if not 0 <= temperature <= 1:
            raise ValueError("Temperature must be between 0 and 1")
            
        if not model_id or not message:
            raise ValueError("Missing required fields: model and message")
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await self._make_api_request(
                client, model_id, message, temperature
            )
            
            content = self._extract_content(response)
            words = content.split()
            
            # 模拟流式输出，按词输出
            for word in words:
                yield word + ' '
                await asyncio.sleep(0.05)  # 控制输出速度 
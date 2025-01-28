# AI-BrainStorm
一个支持多个 AI 模型参与讨论的头脑风暴项目。系统支持多轮讨论，每个 AI 模型可以基于其他模型的观点进行深入探讨和回应。

## 功能特点

- 支持多个 AI 模型同时参与讨论
- 支持多轮对话
- 实时流式响应
- 可调节模型温度
- 支持讨论总结生成

## 配置环境变量
   - 复制 `.env.example` 为 `.env`
   - 填入你的 API Keys 和端点信息

   ```env
   # Available Models (comma-separated list)
   AVAILABLE_MODELS=glm-4-flash,deepseek-chat,4.0ultra,ep-20241224143242-hvlwz,qwen-turbo-1101
   
   # Model Configurations
   # GLM-4-Flash
   GLM_4_FLASH_NAME=GLM-4-Flash
   GLM_4_FLASH_ENDPOINT=your_endpoint_here
   GLM_4_FLASH_KEY=your_key_here
   
   # DeepSeek
   DEEPSEEK_CHAT_NAME=DeepSeek-V3
   DEEPSEEK_CHAT_ENDPOINT=your_endpoint_here
   DEEPSEEK_CHAT_KEY=your_key_here
   
   # 4.0 Ultra
   4.0ULTRA_NAME=4.0Ultra
   4.0ULTRA_ENDPOINT=your_endpoint_here
   4.0ULTRA_KEY=your_key_here
   
   # EP-20241224143242-HVLWZ
   EP_20241224143242_HVLWZ_NAME=Doubao-pro-256k
   EP_20241224143242_HVLWZ_ENDPOINT=your_endpoint_here
   EP_20241224143242_HVLWZ_KEY=your_key_here
   
   # Qwen-Turbo-1101
   QWEN_TURBO_1101_NAME=qwen-turbo-1101
   QWEN_TURBO_1101_ENDPOINT=your_endpoint_here
   QWEN_TURBO_1101_KEY=your_key_here 
   ```

## 启动服务
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## 添加/替换模型

要添加或替换模型，需要：

1. 在 `.env` 文件中：
   - 在 `AVAILABLE_MODELS` 中添加新模型的 ID
   - 添加新模型的配置（NAME、ENDPOINT、KEY）

2. 在 `static/js/main.js` 中的 `MODELS` 对象中添加新模型：
   ```javascript
   const MODELS = {
       'your-model-id': {
           name: 'Your Model Display Name'
       },
       // ... 其他模型
   };
   ```

## 示例
![1.jpg](https://pic.liu-qi.cn/i/2025/01/28/6798af248aa16.jpg)
![2.jpg](https://pic.liu-qi.cn/i/2025/01/28/6798af2cd610b.jpg)
![3.jpg](https://pic.liu-qi.cn/i/2025/01/28/6798af311cb68.jpg)
![4.jpg](https://pic.liu-qi.cn/i/2025/01/28/6798af33e9a04.jpg)
![5.jpg](https://pic.liu-qi.cn/i/2025/01/28/6798af3675b55.jpg)
![6.jpg](https://pic.liu-qi.cn/i/2025/01/28/6798af39d13f7.jpg)
![7.jpg](https://pic.liu-qi.cn/i/2025/01/28/6798af3ca8921.jpg)
![8.jpg](https://pic.liu-qi.cn/i/2025/01/28/6798af400cd5a.jpg)



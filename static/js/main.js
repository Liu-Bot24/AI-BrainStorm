const MODELS = {
    'glm-4-flash': {
        name: 'GLM-4-Flash'
    },
    'deepseek-chat': {
        name: 'DeepSeek-V3'
    },
    '4.0Ultra': {
        name: 'Spark-4.0-Ultra'
    },
    'ep-20241224143242-hvlwz': {
        name: 'Doubao-pro-256k'
    },
    'qwen-turbo-1101': {
        name: 'qwen-turbo-1101'
    }
};

const SYSTEM_PROMPT = `# 场景说明

你正在参加一场头脑风暴会议。这是一个由多个AI模型参与的集体讨论，每个参与者都会针对同一个主题发表自己的见解和想法。作为参与者之一，你将与其他AI模型一起，通过不同视角的交流和思考，共同探讨主题的各个方面。`;

class AIDiscussion {
    constructor() {
        this.selectedModels = [];
        this.modelTemperatures = {};
        this.summaryTemperature = 0.7;
        this.isLoading = false;
        this.currentRound = 1;
        this.initializeComponents();
    }

    initializeComponents() {
        console.log('Initializing components...');
        try {
            this.initializeModelButtons();
            this.initializeRoundControls();
            this.initializeSummaryModelSelection();
            this.setupEventListeners();
            console.log('Components initialized successfully');
        } catch (error) {
            console.error('Error initializing components:', error);
        }
    }

    initializeModelButtons() {
        const modelSelection = document.getElementById('modelSelection');
        if (!modelSelection) {
            console.error('Model selection container not found');
            return;
        }
        
        console.log('Initializing model buttons...');
        console.log('Available models:', Object.keys(MODELS));
        
        try {
            Object.entries(MODELS).forEach(([id, model]) => {
                console.log(`Creating button for model: ${model.name}`);
                const card = document.createElement('div');
                card.className = 'relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md';
                card.dataset.id = id;
                
                card.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-medium">${model.name}</span>
                        <span class="order-badge hidden">
                            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm"></span>
                        </span>
                    </div>
                    <div class="temperature-control ${this.selectedModels.includes(id) ? '' : 'hidden'}">
                        <label class="block text-sm text-gray-600 mb-1">Temperature</label>
                        <input type="range" 
                            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
                            min="0" max="1" step="0.1" value="0.7"
                            data-model="${id}">
                        <div class="text-xs text-gray-500 mt-1">当前值：<span>0.7</span></div>
                    </div>
                    <div class="mt-2 text-sm text-gray-500 model-hint">点击选择</div>
                `;
                
                const tempControl = card.querySelector('.temperature-control');
                const tempSlider = tempControl.querySelector('input');
                const tempValue = tempControl.querySelector('span');
                
                tempSlider.addEventListener('input', (e) => {
                    tempValue.textContent = parseFloat(e.target.value).toFixed(1);
                    this.modelTemperatures[id] = parseFloat(e.target.value);
                });
                
                card.addEventListener('click', (e) => {
                    if (e.target.type === 'range') return;
                    this.toggleModel(card, id);
                });
                
                modelSelection.appendChild(card);
                console.log(`Model ${model.name} button created successfully`);
            });
        } catch (error) {
            console.error('Error initializing model buttons:', error);
        }
    }

    initializeRoundControls() {
        const decreaseBtn = document.getElementById('decreaseRounds');
        const increaseBtn = document.getElementById('increaseRounds');
        const roundsInput = document.getElementById('rounds');

        decreaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(roundsInput.value);
            if (currentValue > 1) {
                roundsInput.value = currentValue - 1;
            }
        });

        increaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(roundsInput.value);
            if (currentValue < 10) {
                roundsInput.value = currentValue + 1;
            }
        });
    }

    toggleModel(card, id) {
        if (this.isLoading) return;
        
        const orderBadge = card.querySelector('.order-badge');
        const index = this.selectedModels.indexOf(id);
        
        if (index === -1) {
            this.selectedModels.push(id);
            card.classList.add('border-blue-500', 'bg-blue-50');
            this.modelTemperatures[id] = 0.7;
            card.querySelector('.temperature-control').classList.remove('hidden');
        } else {
            this.selectedModels = this.selectedModels.filter(m => m !== id);
            card.classList.remove('border-blue-500', 'bg-blue-50');
            delete this.modelTemperatures[id];
            card.querySelector('.temperature-control').classList.add('hidden');
        }
        
        this.updateModelOrder();
        this.updateSelectedModelsDisplay();
    }

    updateModelOrder() {
        const cards = document.querySelectorAll('#modelSelection > div');
        cards.forEach(card => {
            const id = card.dataset.id;
            const badge = card.querySelector('.order-badge');
            const index = this.selectedModels.indexOf(id);
            
            if (index !== -1) {
                badge.querySelector('span').textContent = index + 1;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    }

    updateSelectedModelsDisplay() {
        const container = document.getElementById('selectedModels');
        if (this.selectedModels.length === 0) {
            container.innerHTML = '<div class="text-gray-500">尚未选择任何模型</div>';
            return;
        }
        
        container.innerHTML = this.selectedModels.map((id, index) => `
            <div class="flex items-center gap-2 mb-2">
                <span class="font-medium">${index + 1}.</span>
                <span>${MODELS[id].name}</span>
            </div>
        `).join('');
    }

    async startDiscussion() {
        try {
            console.log('Starting discussion...');
            const topic = document.getElementById('topic').value.trim();
            const rounds = parseInt(document.getElementById('rounds').value);
            
            console.log('Input values:', {
                topic,
                rounds,
                selectedModels: this.selectedModels
            });
            
            if (!this.validateInput(topic, rounds)) {
                console.log('Validation failed');
                return;
            }
            
            this.setLoading(true, 'discussion');
            console.log('Loading state set to true');
            
            this.clearDiscussion();
            console.log('Discussion cleared');
            
            for (let round = 1; round <= rounds; round++) {
                console.log(`Starting round ${round}`);
                const roundHeader = document.createElement('div');
                roundHeader.className = 'text-sm font-medium text-gray-600 mb-4';
                roundHeader.textContent = `第 ${round} 轮讨论`;
                document.getElementById('discussion').appendChild(roundHeader);
                
                for (const modelId of this.selectedModels) {
                    console.log(`Getting response from model ${modelId}`);
                    try {
                        await this.getModelResponse(topic, round, modelId);
                        console.log(`Response received from model ${modelId}`);
                    } catch (error) {
                        console.error(`Error getting response from model ${modelId}:`, error);
                        throw error;
                    }
                }
            }
            
            console.log('Discussion completed successfully');
            this.showToast('讨论完成！', 'success');
        } catch (error) {
            console.error('Discussion error:', error);
            this.showToast(error.message || '讨论过程出错，请重试');
        } finally {
            this.setLoading(false, 'discussion');
            console.log('Loading state set to false');
        }
    }

    async getModelResponse(topic, round, modelId) {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;
        
        const temperature = this.modelTemperatures[modelId];
        const messageDiv = this.createMessageElement(MODELS[modelId].name, round);
        document.getElementById('discussion').appendChild(messageDiv);
        
        try {
            const messages = [
                {
                    role: "system",
                    content: SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: this.buildPrompt(topic, round, modelId)
                }
            ];

            const data = {
                model: modelId,
                messages: messages,
                temperature: this.modelTemperatures[modelId] || 0.7,
                stream: true
            };

            const response = await fetch(`/api/model-api/${modelId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';
            const thinkingIndicator = messageDiv.querySelector('.thinking-indicator');

            try {
                while (true) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        if (line === 'data: [DONE]') break;
                        
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                
                                // 处理不同模型的响应格式
                                let text = '';
                                if (modelId === 'deepseek-chat') {
                                    text = data.choices[0].delta.content || '';
                                } else if (modelId === 'ep-20241224143242-hvlwz' || modelId === '4.0Ultra') {
                                    // Spark 和 Doubao 模型
                                    if (data.choices && data.choices[0].delta) {
                                        text = data.choices[0].delta.content || '';
                                    }
                                } else if (modelId === 'qwen-turbo-1101') {
                                    // Qwen 模型的格式处理
                                    text = data.choices[0].delta.content || '';
                                } else if (modelId === 'glm-4-flash') {
                                    // GLM 模型的格式处理
                                    text = data.choices[0].delta.content || '';
                                }
                                
                                if (text) {
                                    content += text;
                                    const contentDiv = messageDiv.querySelector('.content');
                                    if (contentDiv) {
                                        contentDiv.innerHTML = this.formatText(content);
                                    }
                                }
                            } catch (parseError) {
                                console.warn('Error parsing SSE message:', parseError);
                            }
                        }
                    }
                }
                
                thinkingIndicator?.remove();
            } catch (streamError) {
                console.error(`Stream reading error for model ${modelId}:`, streamError);
                
                if (!content || content.length < 50) {
                    throw streamError;
                }
                
                console.warn('Stream interrupted but content received, keeping partial response');
                thinkingIndicator?.remove();
            }
        } catch (error) {
            console.error(`Error with model ${modelId}:`, error);
            
            const contentDiv = messageDiv.querySelector('.content');
            if (contentDiv) {
                contentDiv.innerHTML = `
                    <div class="text-red-500">
                        ${MODELS[modelId].name} 响应失败，请稍后再试。
                        <button onclick="window.aiDiscussion.retryResponse('${topic}', ${round}, '${modelId}')" 
                                class="ml-2 px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-sm">
                            重试
                        </button>
                    </div>
                `;
            }
            const thinkingIndicator = messageDiv.querySelector('.thinking-indicator');
            thinkingIndicator?.remove();
            
            throw error;
        }
    }

    async retryResponse(topic, round, modelId) {
        try {
            const oldMessage = Array.from(document.querySelectorAll('.message'))
                .find(msg => 
                    msg.querySelector('.model-badge').textContent === MODELS[modelId].name && 
                    parseInt(msg.dataset.round) === round
                );
            
            if (oldMessage) {
                oldMessage.remove();
            }
            
            await this.getModelResponse(topic, round, modelId);
        } catch (error) {
            console.error('Retry failed:', error);
            this.showToast(`重试失败: ${error.message}`);
        }
    }

    buildPrompt(topic, round, modelId) {
        const discussion = document.getElementById('discussion');
        const messages = Array.from(discussion.querySelectorAll('.message'))
            .map(msg => ({
                model: msg.querySelector('.model').textContent,
                content: msg.querySelector('.content').textContent,
                round: parseInt(msg.dataset.round)
            }));

        // 获取当前轮次中，这个模型在发言顺序中的位置
        const currentModelIndex = this.selectedModels.indexOf(modelId);
        const previousModelId = currentModelIndex > 0 ? this.selectedModels[currentModelIndex - 1] : null;
        
        // 如果是第一轮第一个发言
        if (round === 1 && currentModelIndex === 0) {
            return `请就"${topic}"这个主题发表你的观点。要求：
1. 从一个独特的视角切入
2. 论述要深入且有见地
3. 语言要生动自然
4. 回答限制在600字以内`;
        }
        
        // 如果是其他轮次的第一个发言
        if (currentModelIndex === 0) {
            const previousRoundMessages = messages.filter(m => m.round === round - 1);
            return `这是第${round}轮讨论的开始。请你仔细阅读前面所有的讨论内容，然后就"${topic}"这个主题发表新的见解。要求：
1. 必须提出一个前面所有发言中都没有提到过的全新视角或观点
2. 要对前面的讨论进行总结和提炼，并以此为基础提出你的新观点
3. 论述要深入且有见地
4. 语言要生动自然
5. 回答限制在600字以内

前面的讨论内容：
${previousRoundMessages.map(m => `${m.model}：${m.content}`).join('\n\n')}`;
        }
        
        // 获取当前轮次中前一个模型的发言
        const previousSpeakerMessage = messages.find(m => 
            m.round === round && 
            m.model.includes(MODELS[previousModelId].name)
        );
        
        if (!previousSpeakerMessage) {
            throw new Error(`找不到 ${MODELS[previousModelId].name} 在第 ${round} 轮的发言`);
        }
        
        // 如果是回应前一个发言者
        return `这是第${round}轮讨论。请你回应${previousSpeakerMessage.model}刚才关于"${topic}"的观点，并发表你的见解。要求：
1. 必须明确指出你认同或不认同前一位发言者的哪些具体观点，并说明理由
2. 必须提出至少一个前一位发言者没有提到过的新视角或观点
3. 要在前一位发言者的观点基础上进行延伸或转化
4. 论述要深入且有见地
5. 语言要生动自然
6. 回答限制在600字以内

前一位发言者(${previousSpeakerMessage.model})的观点：
${previousSpeakerMessage.content}`;
    }

    createMessageElement(modelName, round) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bg-white p-6 rounded-lg shadow-sm max-w-4xl';
        messageDiv.dataset.round = round;
        
        messageDiv.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <span class="model font-medium text-gray-700 px-3 py-1 bg-gray-100 rounded-full">${modelName}</span>
                <span class="text-sm text-gray-500">第 ${round} 轮</span>
            </div>
            <div class="content prose prose-sm max-w-none text-gray-800 leading-relaxed"></div>
            <div class="thinking-indicator text-sm text-gray-500 mt-2 flex items-center">
                <div class="dot-flashing mr-2"></div>
                思考中...
            </div>
        `;
        
        return messageDiv;
    }

    formatText(text) {
        text = text
            .replace(/---/g, '\n\n---\n\n')
            .replace(/- ([^\n]+)/g, '-_SPACE_$1')
            .replace(/ +/g, '\n')
            .replace(/-_SPACE_/g, '- ')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\n+/, '')
            .replace(/\n+$/, '');

        if (typeof marked === 'undefined') {
            console.warn('Marked library not loaded, using basic text formatting');
            return text
                .split('\n')
                .map(line => {
                    if (line.trim() === '---') {
                        return '<hr class="my-8 border-t border-gray-300">';
                    }
                    return `<div class="my-1">${line}</div>`;
                })
                .join('');
        }
        
        const html = marked.parse(text, {
            breaks: true,
            gfm: true
        });
        
        return html
            .replace(/<h1>/g, '<h1 class="text-2xl font-bold my-4">')
            .replace(/<h2>/g, '<h2 class="text-xl font-bold my-3">')
            .replace(/<h3>/g, '<h3 class="text-lg font-bold my-2">')
            .replace(/<p>/g, '<p class="my-4">')
            .replace(/<ul>/g, '<ul class="list-disc pl-5 my-4">')
            .replace(/<ol>/g, '<ol class="list-decimal pl-5 my-4">')
            .replace(/<li>/g, '<li class="my-2">')
            .replace(/<hr>/g, '<hr class="my-8 border-t border-gray-300">')
            .replace(/>([^<]+)</g, (match, text) => {
                text = text
                    .replace(/- ([^\n]+)/g, '-_SPACE_$1')
                    .replace(/ +/g, '<br>')
                    .replace(/-_SPACE_/g, '- ');
                return '>' + text + '<';
            });
    }

    async generateSummary() {
        if (!this.summaryModel) {
            this.showToast('请选择总结模型');
            return;
        }
        
        const discussion = document.getElementById('discussion');
        if (!discussion.children.length) {
            this.showToast('没有讨论内容可以总结');
            return;
        }
        
        this.setLoading(true, 'summary');
        
        try {
            const messages = [];
            discussion.querySelectorAll('.message').forEach(msg => {
                messages.push({
                    model: msg.querySelector('.model').textContent,
                    content: msg.querySelector('.content').textContent,
                    round: parseInt(msg.dataset.round)
                });
            });

            const topic = document.getElementById('topic').value.trim();
            const summaryPrompt = `请对以下关于"${topic}"的讨论进行总结。

讨论概述

请概括讨论的主题和整体走向。
每个要点必须另起一行。说明讨论过程中提出的新方向和角度。最后说明各方观点的共识和分歧。

---

核心观点

请列出每位参与者的核心观点。
每个参与者的观点必须另起一行，使用破折号开头。注意观点之间的逻辑关联，突出每个参与者的独特见解。

---

总结启示

对整个讨论进行总结，提炼讨论的价值和启发，指出可能的延伸思考方向。
每个要点必须另起一行。

格式要求：
1. 标题后必须换行
2. 分隔线前后必须空行
3. 每个观点和要点必须另起一行
4. 不要使用任何形式的编号或标记（破折号除外）
5. 重要观点使用"「」"标注
6. 严格遵守换行要求

讨论内容：
${messages.map(m => `${m.model} (第${m.round}轮):\n${m.content}`).join('\n\n')}`;
            
            const summaryDiv = document.getElementById('summary');
            const summaryContent = document.getElementById('summaryContent');
            summaryContent.textContent = '正在生成总结...';
            summaryDiv.classList.remove('hidden');
            
            const temperature = this.summaryTemperature || 0.7;
            
            const response = await fetch(`/api/model-api/${this.summaryModel}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.summaryModel,
                    messages: [{
                        role: 'user',
                        content: summaryPrompt
                    }],
                    temperature: this.summaryTemperature || 0.7,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';

            try {
                while (true) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        if (line === 'data: [DONE]') break;
                        
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                
                                // 处理不同模型的响应格式
                                let text = '';
                                if (this.summaryModel === 'deepseek-chat') {
                                    text = data.choices[0].delta.content || '';
                                } else if (this.summaryModel === 'ep-20241224143242-hvlwz' || this.summaryModel === '4.0Ultra') {
                                    // Spark 和 Doubao 模型
                                    if (data.choices && data.choices[0].delta) {
                                        text = data.choices[0].delta.content || '';
                                    }
                                } else if (this.summaryModel === 'qwen-turbo-1101') {
                                    // Qwen 模型的格式处理
                                    text = data.choices[0].delta.content || '';
                                } else if (this.summaryModel === 'glm-4-flash') {
                                    // GLM 模型的格式处理
                                    text = data.choices[0].delta.content || '';
                                }
                                
                                if (text) {
                                    content += text;
                                    if (summaryContent) {
                                        summaryContent.innerHTML = this.formatText(content);
                                    }
                                }
                            } catch (parseError) {
                                console.warn('Error parsing SSE message:', parseError);
                            }
                        }
                    }
                }
            } catch (streamError) {
                console.error(`Stream reading error for summary:`, streamError);
                throw streamError;
            }
        } catch (error) {
            console.error('Summary error:', error);
            this.showToast('生成总结失败，请重试');
        } finally {
            this.setLoading(false, 'summary');
        }
    }

    validateInput(topic, rounds) {
        if (!topic) {
            this.showToast('请输入讨论主题');
            return false;
        }
        
        if (this.selectedModels.length === 0) {
            this.showToast('请选择至少一个模型');
            return false;
        }
        
        if (rounds < 1 || rounds > 10) {
            this.showToast('讨论轮次必须在1-10轮之间');
            return false;
        }
        
        return true;
    }

    clearDiscussion() {
        const discussion = document.getElementById('discussion');
        const summary = document.getElementById('summary');
        discussion.innerHTML = '';
        summary.classList.add('hidden');
        document.getElementById('summaryContent').textContent = '';
    }

    setLoading(loading, type = 'discussion') {
        this.isLoading = loading;
        const startBtn = document.getElementById('startBtn');
        const summaryBtn = document.getElementById('summaryBtn');
        const topic = document.getElementById('topic');
        const temperature = document.getElementById('temperature');
        const rounds = document.getElementById('rounds');
        const modelButtons = document.querySelectorAll('#modelSelection > div');
        
        [startBtn, summaryBtn, topic, temperature, rounds].forEach(el => {
            if (el) el.disabled = loading;
        });
        
        modelButtons.forEach(btn => {
            btn.style.pointerEvents = loading ? 'none' : 'auto';
            btn.style.opacity = loading ? '0.5' : '1';
        });
        
        if (loading) {
            if (type === 'discussion') {
                startBtn.innerHTML = '<div class="flex items-center"><div class="dot-flashing mr-2"></div>讨论中...</div>';
            } else {
                summaryBtn.innerHTML = '<div class="flex items-center justify-center"><div class="dot-flashing mr-2"></div>总结中...</div>';
            }
        } else {
            startBtn.innerHTML = '<span class="text-lg">开始讨论</span>';
            summaryBtn.innerHTML = '<span class="text-lg">生成总结</span>';
        }
    }

    showToast(message, type = 'error') {
        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "center",
            style: {
                background: type === 'error' ? '#ef4444' : '#22c55e',
                borderRadius: '8px',
                padding: '12px 24px',
            }
        }).showToast();
    }

    initializeSummaryModelSelection() {
        const select = document.getElementById('summaryModelSelection');
        if (!select) {
            console.error('Summary model selection not found');
            return;
        }
        
        console.log('Initializing summary model selection...');
        
        try {
            Object.entries(MODELS).forEach(([id, model]) => {
                console.log(`Adding option for model: ${model.name}`);
                const option = document.createElement('option');
                option.value = id;
                option.textContent = model.name;
                select.appendChild(option);
            });
            
            select.addEventListener('change', (e) => {
                this.summaryModel = e.target.value;
                console.log('Summary model selected:', this.summaryModel);
            });
        } catch (error) {
            console.error('Error initializing summary model selection:', error);
        }
    }

    setupEventListeners() {
        const startBtn = document.getElementById('startBtn');
        const summaryBtn = document.getElementById('summaryBtn');
        
        if (startBtn) {
            console.log('Start button found');
            startBtn.addEventListener('click', async () => {
                console.log('Start button clicked');
                await this.startDiscussion();
            });
        } else {
            console.error('Start button not found');
        }
        
        if (summaryBtn) {
            console.log('Summary button found');
            summaryBtn.addEventListener('click', async () => {
                console.log('Summary button clicked');
                await this.generateSummary();
            });
        } else {
            console.error('Summary button not found');
        }
        
        const summaryTempSlider = document.getElementById('summaryTemperature');
        const summaryTempValue = document.getElementById('summaryTempValue');
        
        if (summaryTempSlider && summaryTempValue) {
            summaryTempSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value).toFixed(1);
                summaryTempValue.textContent = value;
                this.summaryTemperature = parseFloat(value);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new AIDiscussion();
    window.aiDiscussion = app;
});

// 获取可用模型列表
async function fetchModels() {
    try {
        const response = await fetch('/api/models');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const models = await response.json();
        const modelSelect = document.getElementById('model-select');
        modelSelect.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching models:', error);
    }
} 
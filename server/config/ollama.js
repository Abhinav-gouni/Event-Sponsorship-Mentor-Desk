export default {
  endpoint: process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434',
  model: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
};

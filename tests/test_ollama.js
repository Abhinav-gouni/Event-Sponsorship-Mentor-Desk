import axios from 'axios';

async function testOllama() {
  try {
    const res = await axios.post('http://127.0.0.1:11434/api/generate', {
      model: 'llama3.2:3b',
      prompt: 'Respond with valid JSON: {"status": "operational", "message": "Ollama is ready"}',
      stream: false,
      format: 'json'
    }, { timeout: 15000 });
    console.log('Ollama raw output:', res.data.response);
  } catch (err) {
    console.error('Ollama connection test error:', err.message);
  }
}

testOllama();

#!/usr/bin/env node

// Test script to verify streaming works correctly with SDKMessage format

const API_URL = 'http://localhost:3000/api/messages/stream';

async function testStreaming() {
  console.log('Testing streaming API with SDKMessage format...\n');

  const requestBody = {
    message: 'Hello, can you help me test the streaming functionality?',
    cwd: '/tmp/test-streaming',
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedChunks = [];
    let sessionId = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          if (jsonStr.trim()) {
            try {
              const data = JSON.parse(jsonStr);
              console.log('Received event:', data.type);

              if (data.type === 'chunk') {
                receivedChunks.push(data.content);
                
                // Log SDKMessage details
                const sdkMessage = data.content;
                console.log(`  SDKMessage type: ${sdkMessage.type}`);
                
                if (sdkMessage.type === 'assistant' && sdkMessage.message) {
                  console.log(`  Assistant message with ${sdkMessage.message.content.length} content blocks`);
                  sdkMessage.message.content.forEach((block, i) => {
                    if (block.type === 'text') {
                      console.log(`    Block ${i}: text - "${block.text.substring(0, 50)}..."`);
                    } else {
                      console.log(`    Block ${i}: ${block.type}`);
                    }
                  });
                } else if (sdkMessage.type === 'result') {
                  console.log(`  Result: ${sdkMessage.result}`);
                  if (sdkMessage.session_id) {
                    console.log(`  Session ID: ${sdkMessage.session_id}`);
                  }
                }
              } else if (data.type === 'complete') {
                sessionId = data.sessionId;
                console.log(`\nStreaming complete. Session ID: ${sessionId}`);
                console.log(`Total chunks received: ${receivedChunks.length}`);
                
                // Verify we received the expected SDKMessage types
                const messageTypes = receivedChunks.map(c => c.type);
                console.log(`\nReceived SDKMessage types: ${messageTypes.join(', ')}`);
                
                if (messageTypes.includes('assistant') && messageTypes.includes('result')) {
                  console.log('\n✅ Test passed: Received expected SDKMessage types');
                } else {
                  console.error('\n❌ Test failed: Did not receive expected SDKMessage types');
                }
              } else if (data.type === 'error') {
                console.error('Error:', data.error);
              }
            } catch (e) {
              console.error('Failed to parse event data:', e);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
console.log('Make sure the development server is running (npm run dev)');
console.log('Then this test will send a request to the streaming API\n');

testStreaming();
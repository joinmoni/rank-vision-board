// Test script for the AI API route
const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing /api/ai route...');
    
    const response = await fetch('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        goals: ['Run a marathon', 'Travel to Japan', 'Learn to cook']
      })
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    
    if (data.imageUrl) {
      console.log('✅ Success! Image URL received (length:', data.imageUrl.length, 'chars)');
      console.log('Goals:', data.goals);
      console.log('Image URL preview (first 100 chars):', data.imageUrl.substring(0, 100));
    } else if (data.error) {
      console.log('❌ Error:', data.error);
      if (data.details) {
        console.log('Details:', data.details);
      }
      if (data.suggestion) {
        console.log('Suggestion:', data.suggestion);
      }
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testAPI();


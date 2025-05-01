// File: test.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Check command line arguments
if (process.argv.length < 4) {
  console.error('Usage: node test.js <video_file_path> <campaign_id> [scenario]');
  console.error('Available scenarios: Random_Fail, Timeout');
  process.exit(1);
}

const videoPath = process.argv[2];
const campaignId = process.argv[3];
const scenario = process.argv[4] || 'Success'; // Default scenario is Success

// Validate file exists
if (!fs.existsSync(videoPath)) {
  console.error(`Error: File "${videoPath}" does not exist`);
  process.exit(1);
}

// Validate scenario
const validScenarios = ['Success', 'Random_Fail', 'Timeout'];
if (!validScenarios.includes(scenario)) {
  console.error(`Error: Invalid scenario "${scenario}"`);
  console.error('Available scenarios: Success, Random_Fail, Timeout');
  process.exit(1);
}

console.log(`Testing with video: ${videoPath}`);
console.log(`Campaign ID: ${campaignId}`);
console.log(`Scenario: ${scenario}`);
console.log('Sending request to server...');

async function testDistributeEndpoint() {
  try {
    // Create form data
    const form = new FormData();
    form.append('video', fs.createReadStream(videoPath));
    form.append('campaignId', campaignId);
    form.append('scenario', scenario);

    // Send request to server
    const response = await axios.post('http://localhost:3000/api/distribute', form, {
      headers: {
        ...form.getHeaders()
      }
    });

    // Log the response
    console.log('\nResponse:');
    console.log('--------------------------------------------------');
    console.log(`Timestamp: ${response.data.timestamp}`);
    console.log(`Overall Status: ${response.data.overallStatus}`);
    console.log('\nService Results:');
    
    // Display each service result
    response.data.services.forEach((service, index) => {
      console.log(`\n[${index + 1}] ${service.service}:`);
      console.log(`   Status: ${service.status}`);
      console.log(`   Response Time: ${service.responseTime}ms`);
      
      if (service.status === 'success') {
        console.log(`   Response: ${JSON.stringify(service.response, null, 2)}`);
      } else {
        console.log(`   Error: ${service.error}`);
      }
    });
    
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
  }
}

testDistributeEndpoint(); 
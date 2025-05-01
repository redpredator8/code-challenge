\/ To Test it \/
open two terminals
1 - npm run dev
2 - node test.js sample.mp4 Campaign_ID [scenario]

Available test scenarios:
- Success (default / empty): All services succeed
- Random_Fail: One service will randomly fail
- Timeout: One service will time out after 60 seconds




# Node.js Express Challenge: Parallel Video Distribution Service

## Challenge Details

### Objective
Fork this project and share your github link with the implementation please

Build an API endpoint that:
1. Receives a video file and campaign ID
2. Distributes this video to multiple services in parallel
3. Waits for all responses (with appropriate timeout handling)
4. Returns a consolidated report of all services' statuses and responses
5. Use typescript

### API Specifications

#### Your Endpoint to Implement
- **Endpoint:** `/api/distribute`
- **Method:** POST
- **Request Format:**
  - Content-Type: multipart/form-data
  - Body:
    - `video`: File (required)
    - `campaignId`: String (required)

#### Available Services
The following services are available for integration:

1. **Service 1**
   - Endpoint: `api.postclips.com/api/code-challenge/service-1`
   - Processing time: 5 seconds

2. **Service 2**
   - Endpoint: `api.postclips.com/api/code-challenge/service-2`
   - Processing time: 15 seconds

3. **Service 3**
   - Endpoint: `api.postclips.com/api/code-challenge/service-3`
   - Processing time: 45 seconds

#### Request Format for Services
Each service expects:
- **Method:** POST
- **Content-Type:** multipart/form-data
- **Body:**
  - `video`: File (required)
  - `campaignId`: String (required)

#### Service Response Format (Success)
```json
{
  "success": true,
  "message": "Service X completed successfully",
  "campaignId": "CAMPAIGN_X",
  "videoName": "uploaded-video.mp4",
  "service": "service-X"
}
```

#### Service Error Responses

- **400**: If video is missing
- **500**: For internal server errors

Expected Output from Your Endpoint
Your endpoint should return a consolidated report in the following format:

```json
{
  "timestamp": "2025-04-24T15:30:45Z",
  "overallStatus": "partialSuccess",
  "services": [
    {
      "service": "service-1",
      "status": "success",
      "responseTime": 5123,
      "response": {
        "success": true,
        "message": "Service 1 completed successfully",
        "campaignId": "CAMPAIGN_X",
        "videoName": "uploaded-video.mp4",
        "service": "service-1"
      }
    },
    {
      "service": "service-2",
      "status": "success",
      "responseTime": 15345,
      "response": {
        "success": true,
        "message": "Service 2 completed successfully",
        "campaignId": "CAMPAIGN_X",
        "videoName": "uploaded-video.mp4",
        "service": "service-2"
      }
    },
    {
      "service": "service-3",
      "status": "error",
      "responseTime": 60000,
      "error": "Request timed out after 60 seconds"
    }
  ]
}
```

#### Implementation Requirements

- Implement proper timeout handling (suggest 60 seconds per service)
- Process all services concurrently
- Handle partial failures appropriately
- Ensure the endpoint responds even if some services fail
- Include appropriate error handling and logging
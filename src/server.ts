// File: src/server.ts
import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const SERVICE_TIMEOUT = 60000; // 60 seconds timeout

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Middleware to parse JSON bodies
app.use(express.json());

// Define routes
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Welcome to the TypeScript Node.js server!' });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});

// Mock service function for testing
async function mockServiceCall(serviceName: string, filePath: string, campaignId: string, scenario: string) {
    const startTime = Date.now();
    
    // Determine delay based on service name
    let delay = 5000; // default 5 seconds
    if (serviceName === 'service-2') {
        delay = 15000;
    } else if (serviceName === 'service-3') {
        delay = 45000;
    }

    // For the Timeout scenario, service-2 will time out
    if (scenario === 'Timeout' && serviceName === 'service-2') {
        return new Promise<any>(resolve => {
            setTimeout(() => {
                resolve({
                    service: serviceName,
                    status: 'error',
                    responseTime: SERVICE_TIMEOUT,
                    error: `Request timed out after ${SERVICE_TIMEOUT / 1000} seconds`
                });
            }, SERVICE_TIMEOUT);
        });
    }
    
    // For the Random_Fail scenario, randomly choose one service to fail
    if (scenario === 'Random_Fail') {
        // Check if this service should fail
        // Use the service name as random seed to ensure consistent behavior per service
        const shouldFail = Math.abs(hashCode(serviceName)) % 3 === 0;
        
        if (shouldFail) {
            return new Promise<any>(resolve => {
                setTimeout(() => {
                    resolve({
                        service: serviceName,
                        status: 'error',
                        responseTime: Date.now() - startTime,
                        error: `Service ${serviceName} failed with internal server error`,
                        statusCode: 500
                    });
                }, delay / 2); // Fail faster than success case
            });
        }
    }
    
    return new Promise<any>(async (resolve) => {
        // Simulate a service call with the appropriate delay
        setTimeout(() => {
            // Get the original filename from the path
            const originalName = path.basename(filePath);
            
            // Successful response
            resolve({
                service: serviceName,
                status: 'success',
                responseTime: Date.now() - startTime,
                response: {
                    success: true,
                    message: `${serviceName} completed successfully`,
                    campaignId: campaignId,
                    videoName: originalName,
                    service: serviceName
                }
            });
        }, delay);
    });
}

// Simple hash function for consistent random failure based on service name
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

// Function to send file to a service with timeout and response time tracking
async function sendToService(serviceName: string, filePath: string, campaignId: string, scenario: string) {
    // Use mock service instead of real API calls
    return mockServiceCall(serviceName, filePath, campaignId, scenario);
    
    /* Original implementation - commented out for testing
    const startTime = Date.now();
    try {
        const form = new FormData();
        form.append('video', fs.createReadStream(filePath));
        form.append('campaignId', campaignId);

        const response = await axios({
            method: 'post',
            url: `https://api.postclips.com/api/code-challenge/${serviceName}`,
            data: form,
            headers: {
                ...form.getHeaders()
            },
            timeout: SERVICE_TIMEOUT
        });

        const responseTime = Date.now() - startTime;
        return {
            service: serviceName,
            status: 'success',
            responseTime,
            response: response.data
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        // Handle timeout errors
        if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
            return {
                service: serviceName,
                status: 'error',
                responseTime: SERVICE_TIMEOUT,
                error: `Request timed out after ${SERVICE_TIMEOUT / 1000} seconds`
            };
        }
        
        // Handle other Axios errors
        if (axios.isAxiosError(error) && error.response) {
            return {
                service: serviceName,
                status: 'error',
                responseTime,
                error: error.response.data.message || error.message,
                statusCode: error.response.status
            };
        }
        
        // Handle general errors
        return {
            service: serviceName,
            status: 'error',
            responseTime,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
    */
}

// Determine overall status based on service results
function determineOverallStatus(serviceResults: any[]) {
    const allSuccess = serviceResults.every(result => result.status === 'success');
    const allFailed = serviceResults.every(result => result.status === 'error');
    
    if (allSuccess) return 'success';
    if (allFailed) return 'failure';
    return 'partialSuccess';
}

// File upload endpoint
app.post('/api/distribute', upload.single('video'), async (req: Request, res: Response) => {
    try {
        // Check if file exists
        if (!req.file) {
            return res.status(400).json({ error: 'Video file is required' });
        }

        // Check if campaignId exists
        const campaignId = req.body.campaignId;
        if (!campaignId) {
            return res.status(400).json({ error: 'Campaign ID is required' });
        }

        // Get the test scenario (default to 'Success')
        const scenario = req.body.scenario || 'Success';
        
        console.log(`Processing file: ${req.file.originalname} for campaign: ${campaignId}`);
        console.log(`Test scenario: ${scenario}`);
        
        // Send to all three services in parallel
        const servicePromises = [
            sendToService('service-1', req.file.path, campaignId, scenario),
            sendToService('service-2', req.file.path, campaignId, scenario),
            sendToService('service-3', req.file.path, campaignId, scenario)
        ];

        // Wait for all services to complete
        const serviceResults = await Promise.all(servicePromises);
        
        // Determine overall status
        const overallStatus = determineOverallStatus(serviceResults);

        // Format response
        const response = {
            timestamp: new Date().toISOString(),
            overallStatus,
            services: serviceResults
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ 
            timestamp: new Date().toISOString(),
            error: 'Failed to process upload',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Make sure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Test endpoint: http://localhost:${PORT}/api/distribute`);
});
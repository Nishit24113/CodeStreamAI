const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    };

    try {
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        const body = JSON.parse(event.body || '{}');
        const code = body.code || '';
        const language = (body.language || 'javascript').toLowerCase();

        if (!code) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No code provided' })
            };
        }

        // Execute JavaScript
        if (language === 'javascript' || language === 'js') {
            const result = await executeJavaScript(code);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: `Unsupported language: ${language}` })
            };
        }

    } catch (error) {
        console.error('Execution error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message,
                output: '',
                executionTime: 0
            })
        };
    }
};

function executeJavaScript(code) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        // Create temporary file
        const tmpFile = path.join(os.tmpdir(), `code_${Date.now()}.js`);
        fs.writeFileSync(tmpFile, code);

        // Execute with timeout
        const child = exec(`node ${tmpFile}`, {
            timeout: 5000,
            maxBuffer: 1024 * 1024
        }, (error, stdout, stderr) => {
            const executionTime = (Date.now() - startTime) / 1000;

            // Cleanup
            try {
                fs.unlinkSync(tmpFile);
            } catch (e) {
                // Ignore cleanup errors
            }

            if (error) {
                if (error.killed) {
                    resolve({
                        success: false,
                        output: '',
                        error: 'Execution timed out (5s limit)',
                        executionTime: 5.0
                    });
                } else {
                    resolve({
                        success: false,
                        output: stdout,
                        error: stderr || error.message,
                        executionTime
                    });
                }
            } else {
                resolve({
                    success: true,
                    output: stdout,
                    error: stderr || null,
                    executionTime
                });
            }
        });
    });
}

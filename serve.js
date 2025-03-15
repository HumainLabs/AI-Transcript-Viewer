// Simple HTTP server to serve the AI Transcript Viewer
// This helps avoid browser security restrictions when loading modules

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const PORT = 9080;
const HOST = 'localhost';
const MAIN_FILE = 'index.html';

// MIME types for common file extensions
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm'
};

// Create the server
const server = http.createServer((req, res) => {
    // Get the URL path (removing query parameters)
    let url = req.url.split('?')[0];
    
    // Normalize the URL to prevent path traversal attacks
    url = url.replace(/\.\./g, '');
    
    // Default to main file if requesting the root
    if (url === '/') {
        url = `/${MAIN_FILE}`;
    }
    
    // Construct the file path
    const filePath = path.join(__dirname, url);
    
    // Check if the file exists
    fs.stat(filePath, (err, stats) => {
        if (err) {
            // If the file doesn't exist, return 404
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1><p>The requested file could not be found.</p>');
            return;
        }
        
        // Handle directory requests with a listing
        if (stats.isDirectory()) {
            fs.readdir(filePath, (err, files) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('<h1>500 Internal Server Error</h1>');
                    return;
                }
                
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write('<h1>Directory Listing</h1>');
                res.write('<ul>');
                
                // Add parent directory link
                if (url !== '/') {
                    res.write(`<li><a href="${path.dirname(url)}">../</a></li>`);
                }
                
                // List all files and directories
                files.forEach(file => {
                    const isDir = fs.statSync(path.join(filePath, file)).isDirectory();
                    res.write(`<li><a href="${path.join(url, file)}">${file}${isDir ? '/' : ''}</a></li>`);
                });
                
                res.write('</ul>');
                res.end();
            });
            return;
        }
        
        // Get the file extension
        const ext = path.extname(filePath);
        
        // Set Content-Type header based on file extension
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        // Read and serve the file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 Internal Server Error</h1>');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

// Start the server
server.listen(PORT, HOST, () => {
    const url = `http://${HOST}:${PORT}`;
    console.log(`Server running at: ${url}`);
    console.log(`Opening ${MAIN_FILE} in your default browser...`);
    
    // Attempt to open the browser automatically
    try {
        // Try to detect the platform and use the appropriate command
        const command = process.platform === 'win32' ? 'start' :
                       process.platform === 'darwin' ? 'open' : 'xdg-open';
        
        exec(`${command} ${url}`);
    } catch (err) {
        console.log('Unable to open browser automatically. Please open manually:');
        console.log(url);
    }
    
    console.log('\nPress Ctrl+C to stop the server');
}); 
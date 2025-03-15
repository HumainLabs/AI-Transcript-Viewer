#!/usr/bin/env node

/**
 * Simple HTTP server for running the Transcript Viewer locally
 * This allows loading js-tiktoken from node_modules which would be 
 * blocked when opening the HTML directly due to browser security
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');

// Configuration
const PORT = 9080;
const HOST = 'localhost';
const MAIN_FILE = 'TranscriptViewer.html';

// Create server
const server = http.createServer((req, res) => {
    // Parse URL
    const parsedUrl = url.parse(req.url);
    let pathname = path.join(__dirname, parsedUrl.pathname);
    
    // Default to index file if request is for root
    if (parsedUrl.pathname === '/') {
        pathname = path.join(__dirname, MAIN_FILE);
    }
    
    // Check if file exists
    fs.stat(pathname, (err, stats) => {
        if (err) {
            // File not found
            res.statusCode = 404;
            res.end(`File ${parsedUrl.pathname} not found!`);
            return;
        }
        
        // Check if it's a directory
        if (stats.isDirectory()) {
            // Redirect to index file if exists
            const indexPath = path.join(pathname, MAIN_FILE);
            if (fs.existsSync(indexPath)) {
                pathname = indexPath;
            } else {
                // List directory contents
                fs.readdir(pathname, (err, files) => {
                    if (err) {
                        res.statusCode = 500;
                        res.end(`Error reading directory: ${err}`);
                        return;
                    }
                    
                    res.setHeader('Content-Type', 'text/html');
                    res.write('<html><head><title>Directory Listing</title></head><body>');
                    res.write(`<h1>Directory ${parsedUrl.pathname}</h1><ul>`);
                    
                    // Add parent directory link
                    if (parsedUrl.pathname !== '/') {
                        const parentPath = parsedUrl.pathname.split('/').slice(0, -1).join('/') || '/';
                        res.write(`<li><a href="${parentPath}">../</a></li>`);
                    }
                    
                    // List files
                    files.forEach(file => {
                        const isDir = fs.statSync(path.join(pathname, file)).isDirectory();
                        res.write(`<li><a href="${path.join(parsedUrl.pathname, file)}">${file}${isDir ? '/' : ''}</a></li>`);
                    });
                    
                    res.end('</ul></body></html>');
                });
                return;
            }
        }
        
        // Read file
        fs.readFile(pathname, (err, data) => {
            if (err) {
                res.statusCode = 500;
                res.end(`Error reading file: ${err}`);
                return;
            }
            
            // Get file extension for content type
            const ext = path.extname(pathname).toLowerCase();
            let contentType = 'text/plain';
            
            // Set content type based on extension
            switch (ext) {
                case '.html': contentType = 'text/html'; break;
                case '.js': contentType = 'text/javascript'; break;
                case '.css': contentType = 'text/css'; break;
                case '.json': contentType = 'application/json'; break;
                case '.png': contentType = 'image/png'; break;
                case '.jpg': contentType = 'image/jpeg'; break;
                case '.gif': contentType = 'image/gif'; break;
                case '.svg': contentType = 'image/svg+xml'; break;
            }
            
            // Send response
            res.setHeader('Content-Type', contentType);
            res.end(data);
        });
    });
});

// Start server
server.listen(PORT, HOST, () => {
    const address = `http://${HOST}:${PORT}`;
    console.log(`Server running at ${address}`);
    console.log(`Opening browser to ${address}`);
    
    // Open browser
    let command;
    switch (process.platform) {
        case 'darwin': command = `open ${address}`; break;
        case 'win32': command = `start ${address}`; break;
        default: command = `xdg-open ${address}`; break;
    }
    
    exec(command, (err) => {
        if (err) {
            console.error('Error opening browser:', err);
            console.log(`Please open ${address} in your browser.`);
        }
    });
    
    console.log('\nPress Ctrl+C to stop the server\n');
}); 
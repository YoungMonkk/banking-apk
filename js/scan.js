// APK Scanner Module - Real Backend Integration
class APKScanner {
    constructor() {
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.uploadBtn = document.getElementById('upload-btn');
        this.scanProgress = document.getElementById('scan-progress');
        this.resultSection = document.getElementById('result-section');
        this.progressBar = document.getElementById('scan-progress-bar');
        this.percentageText = document.getElementById('scan-percentage');
        this.fileNameText = document.getElementById('scan-file-name');
        this.backendUrl = 'http://localhost:3000/api';
        // Configurable client-side size limit to match backend (default 200MB). Override by setting window.MAX_APK_SIZE_MB.
        this.maxApkSizeMB = parseInt(window.MAX_APK_SIZE_MB || '200', 10);
        this.currentAnalysisId = null;
        this.progressInterval = null;
        this.scanTimeout = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.checkBackendHealth();
    }
    
    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.backendUrl}/health`);
            if (response.ok) {
                console.log('✅ Backend server is healthy');
                this.showNotification('Backend connected successfully', 'success');
            } else {
                throw new Error('Backend health check failed');
            }
        } catch (error) {
            console.warn('⚠️ Backend server not available:', error.message);
            this.showNotification('Backend server not available - using demo mode', 'warning');
        }
    }
    
    setupEventListeners() {
        // Upload area click handler
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        // Upload button click handler
        this.uploadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });
        
        // File input change handler
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                this.handleFileUpload(file);
            }
        });
    }
    
    setupDragAndDrop() {
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                this.handleFileUpload(file);
            }
        });
    }
    
    handleFileUpload(file) {
        console.log('[Scan] selected file:', { name: file?.name, type: file?.type, size: file?.size });
        // Validate file type
        if (!file.name.endsWith('.apk')) {
            this.showError('Please upload an APK file.');
            return;
        }
        
        // Validate file size against configurable limit
        if (file.size > this.maxApkSizeMB * 1024 * 1024) {
            this.showError(`File too large. Maximum size is ${this.maxApkSizeMB}MB.`);
            return;
        }
        
        // Keep reference for history metadata
        this.currentFile = file;

        // Start scan process
        this.startScanProcess(file);
    }
    
    async startScanProcess(file) {
        try {
            // Hide upload area and show progress
            this.uploadArea.style.display = 'none';
            this.scanProgress.style.display = 'block';
            this.resultSection.style.display = 'none';
            
            // Update file name
            this.fileNameText.textContent = 'File: ' + file.name;
            
            // Reset progress
            this.progressBar.style.width = '0%';
            this.percentageText.textContent = '0%';
            
            // Reset scan steps
            this.resetScanSteps();
            
            // Try to upload to backend first
            try {
                await this.uploadToBackend(file);
            } catch (error) {
                console.error('Backend upload failed:', error);
                // Do NOT fall back to demo; surface the real error so results are not static
                this.showError(`Backend upload failed: ${error.message || error}`);
                this.resetToUploadState();
                return;
            }
            
        } catch (error) {
            console.error('Scan process failed:', error);
            this.showError('Failed to start scan process. Please try again.');
            this.resetToUploadState();
        }
    }
    
    async uploadToBackend(file) {
        const formData = new FormData();
        formData.append('apk', file);
        console.log('[Scan] appending FormData key "apk" with file:', { name: file.name, size: file.size, type: file.type });
        
        const response = await fetch(`${this.backendUrl}/analyze`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            let bodyText = '';
            try { bodyText = await response.text(); } catch {}
            console.error('analyze upload failed:', response.status, response.statusText, bodyText);
            throw new Error(`Upload failed (${response.status} ${response.statusText}) ${bodyText ? '- ' + bodyText : ''}`);
        }
        
        const result = await response.json();
        console.log('analyze response:', result);
        this.currentAnalysisId = result.analysisId;
        
        console.log('✅ File uploaded successfully, analysis ID:', this.currentAnalysisId);
        
        // Start monitoring progress with timeout
        this.monitorBackendProgress();
        
        // Add overall timeout for the entire scan process
        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
        }
        this.scanTimeout = setTimeout(() => {
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
            }
            this.showError('Scan timeout - the process took too long. Please try again.');
            this.resetToUploadState();
        }, 300000); // 5 minutes timeout
    }
    
    async monitorBackendProgress() {
        if (!this.currentAnalysisId) return;
        
        let consecutiveErrors = 0;
        const maxErrors = 3;
        
        this.progressInterval = setInterval(async () => {
            try {
                const url = `${this.backendUrl}/analysis/${this.currentAnalysisId}`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('analysis poll result:', result);
                    
                    if (result.status === 'completed') {
                        clearInterval(this.progressInterval);
                        if (this.scanTimeout) {
                            clearTimeout(this.scanTimeout);
                            this.scanTimeout = null;
                        }
                        this.showBackendResults(result);
                    } else if (result.status === 'failed') {
                        clearInterval(this.progressInterval);
                        console.error('analysis failed payload:', result);
                        this.showError(`Scan failed: ${result.error || 'Unknown error'}`);
                        this.resetToUploadState();
                    } else if (result.status === 'processing') {
                        consecutiveErrors = 0; // Reset error counter on success
                        this.updateProgressFromBackend(result);
                    } else {
                        console.warn('unexpected analysis status:', result.status);
                    }
                } else {
                    let bodyText = '';
                    try { bodyText = await response.text(); } catch {}
                    throw new Error(`Failed to fetch analysis status (${response.status} ${response.statusText}) ${bodyText ? '- ' + bodyText : ''}`);
                }
                
            } catch (error) {
                console.error('Progress monitoring failed:', error);
                consecutiveErrors++;
                
                if (consecutiveErrors >= maxErrors) {
                    clearInterval(this.progressInterval);
                    this.showError(`Failed to monitor scan progress for ${this.currentAnalysisId || 'current scan'}. ${error?.message || ''}`);
                    this.resetToUploadState();
                }
            }
        }, 2000); // Check every 2 seconds
    }
    
    updateProgressFromBackend(result) {
        if (result.progress !== undefined) {
            this.progressBar.style.width = result.progress + '%';
            this.percentageText.textContent = result.progress + '%';
        }
        
        // Update steps from backend
        if (result.steps && result.steps.length > 0) {
            this.updateScanStepsFromBackend(result.steps);
        }
    }
    
    updateScanStepsFromBackend(steps) {
        // Reset all steps
        document.querySelectorAll('.scan-step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
        
        // Mark completed steps
        steps.forEach((stepInfo, index) => {
            const stepElement = document.getElementById(`step-${index + 1}`);
            if (stepElement) {
                stepElement.classList.add('completed');
            }
        });
        
        // Mark next step as active (avoid step-0)
        const nextStepIndex = Math.min(steps.length + 1, 5);
        const currentStepElement = document.getElementById(`step-${nextStepIndex}`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }
    }
    
    showBackendResults(result) {
        console.log('final analysis result:', result);
        this.resultSection.style.display = 'block';
        
        let resultHTML = '';
        
        if (result.summary && result.summary.isSafe) {
            resultHTML = this.generateBackendSafeResultHTML(result);
        } else if (result.summary && !result.summary.isSafe) {
            resultHTML = this.generateBackendWarningResultHTML(result);
        } else {
            console.warn('result.summary missing; showing warning UI by default');
            resultHTML = this.generateBackendWarningResultHTML({
                summary: { riskLevel: 'suspicious', riskScore: 50, confidence: 70 },
                details: result.details || { manifestAnalysis: { packageName: 'Unknown', versionName: 'Unknown', versionCode: 'Unknown' }, permissionAnalysis: { total: 0, suspicious: [], riskScore: 0 }, codeAnalysis: { dexFiles: 0, suspiciousPatterns: [], riskScore: 0 }, threatAnalysis: { isKnownThreat: false } },
                recommendations: ['Review the APK details', 'Rescan or use official sources']
            });
        }
        
        document.getElementById('result-content').innerHTML = resultHTML;
        this.resultSection.classList.add('animate-fade-up');
        
        // Add to history
        if (window.historyManager) {
            const historyItem = {
                ...result,
                fileSize: this.currentFile ? this.currentFile.size : 0
            };
            window.historyManager.addToHistory(historyItem).catch(error => {
                console.warn('Failed to add to history:', error);
            });
        }
        
        // Show success notification
        const level = result.summary ? result.summary.riskLevel : 'unknown';
        this.showNotification(`Analysis completed! Risk level: ${String(level).toUpperCase()}`, 'success');
    }
    
    generateBackendSafeResultHTML(result) {
        const details = result.details;
        
        return `
            <div class="result-badge result-safe">✅ SAFE</div>
            <h2>This APK appears to be legitimate</h2>
            <p>Our analysis indicates the uploaded APK is likely a genuine application.</p>
            
            <div class="result-detail">
                <h3>Scan Details</h3>
                
                <div class="detail-item">
                    <div class="detail-icon detail-safe">✓</div>
                    <div>
                        <h4>Risk Assessment</h4>
                        <p>Risk Level: <strong>${result.summary.riskLevel.toUpperCase()}</strong> (Score: ${result.summary.riskScore}/100)</p>
                        <p>Confidence: <strong>${result.summary.confidence}%</strong></p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-safe">✓</div>
                    <div>
                        <h4>Package Information</h4>
                        <p>Package: <code>${details.manifestAnalysis.packageName}</code></p>
                        <p>Version: ${details.manifestAnalysis.versionName} (${details.manifestAnalysis.versionCode})</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-safe">✓</div>
                    <div>
                        <h4>Permission Analysis</h4>
                        <p>Total Permissions: ${details.permissionAnalysis.total}</p>
                        <p>Suspicious Permissions: ${details.permissionAnalysis.suspicious.length}</p>
                        <p>Risk Score: ${details.permissionAnalysis.riskScore}/100</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-safe">✓</div>
                    <div>
                        <h4>Code Analysis</h4>
                        <p>DEX Files: ${details.codeAnalysis.dexFiles}</p>
                        <p>Suspicious Patterns: ${details.codeAnalysis.suspiciousPatterns.length}</p>
                        <p>Risk Score: ${details.codeAnalysis.riskScore}/100</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-safe">✓</div>
                    <div>
                        <h4>Threat Database</h4>
                        <p>Known Threat: ${details.threatAnalysis.isKnownThreat ? 'Yes' : 'No'}</p>
                        ${details.threatAnalysis.isKnownThreat ? 
                            `<p>Threat Type: ${details.threatAnalysis.threatType}</p>
                             <p>Confidence: ${details.threatAnalysis.confidence}%</p>` : 
                            '<p>No matches found in our threat database</p>'
                        }
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <h3>Recommendations</h3>
                <ul>
                    ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
                <button class="btn" onclick="window.navigateTo('scan')">Scan Another APK</button>
                <button class="btn" onclick="window.navigateTo('history')" style="margin-left: 10px;">View History</button>
            </div>
        `;
    }
    
    generateBackendWarningResultHTML(result) {
        const details = result.details;
        
        return `
            <div class="result-badge result-warning">⚠️ ${result.summary.riskLevel.toUpperCase()}</div>
            <h2>Security risks detected!</h2>
            <p>Our analysis has flagged the uploaded APK as potentially malicious.</p>
            
            <div class="result-detail">
                <h3>Security Issues Found</h3>
                
                <div class="detail-item">
                    <div class="detail-icon detail-warning">⚠️</div>
                    <div>
                        <h4>Risk Assessment</h4>
                        <p>Risk Level: <strong>${result.summary.riskLevel.toUpperCase()}</strong> (Score: ${result.summary.riskScore}/100)</p>
                        <p>Confidence: <strong>${result.summary.confidence}%</strong></p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-warning">⚠️</div>
                    <div>
                        <h4>Package Information</h4>
                        <p>Package: <code>${details.manifestAnalysis.packageName}</code></p>
                        <p>Version: ${details.manifestAnalysis.versionName} (${details.manifestAnalysis.versionCode})</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-warning">⚠️</div>
                    <div>
                        <h4>Permission Analysis</h4>
                        <p>Total Permissions: ${details.permissionAnalysis.total}</p>
                        <p>Suspicious Permissions: ${details.permissionAnalysis.suspicious.length}</p>
                        <p>Risk Score: ${details.permissionAnalysis.riskScore}/100</p>
                        ${details.permissionAnalysis.suspicious.length > 0 ? 
                            `<p><strong>Suspicious Permissions:</strong> ${details.permissionAnalysis.suspicious.join(', ')}</p>` : ''
                        }
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-warning">⚠️</div>
                    <div>
                        <h4>Code Analysis</h4>
                        <p>DEX Files: ${details.codeAnalysis.dexFiles}</p>
                        <p>Suspicious Patterns: ${details.codeAnalysis.suspiciousPatterns.length}</p>
                        <p>Risk Score: ${details.codeAnalysis.riskScore}/100</p>
                        ${details.codeAnalysis.suspiciousPatterns.length > 0 ? 
                            `<p><strong>Suspicious Patterns:</strong> ${details.codeAnalysis.suspiciousPatterns.map(p => p.pattern).join(', ')}</p>` : ''
                        }
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-warning">⚠️</div>
                    <div>
                        <h4>Threat Database</h4>
                        <p>Known Threat: ${details.threatAnalysis.isKnownThreat ? 'Yes' : 'No'}</p>
                        ${details.threatAnalysis.isKnownThreat ? 
                            `<p>Threat Type: ${details.threatAnalysis.threatType}</p>
                             <p>Description: ${details.threatAnalysis.description}</p>
                             <p>Confidence: ${details.threatAnalysis.confidence}%</p>` : 
                            '<p>No exact matches, but suspicious behavior detected</p>'
                        }
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <h3>Recommendations</h3>
                <ul>
                    ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
                <button class="btn" onclick="window.navigateTo('scan')">Scan Another APK</button>
                <button class="btn" onclick="window.navigateTo('history')" style="margin-left: 10px;">View History</button>
                <button class="btn" onclick="window.navigateTo('threats')" style="margin-left: 10px;">Learn About Threats</button>
            </div>
        `;
    }
    
    runDemoScan() {
        console.log('🔄 Running demo scan mode');
        this.runScanAnimation();
    }
    
    resetScanSteps() {
        document.querySelectorAll('.scan-step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
    }
    
    runScanAnimation() {
        let progress = 0;
        const steps = [
            { id: 'step-1', name: 'File Analysis', threshold: 20 },
            { id: 'step-2', name: 'Permission Check', threshold: 40 },
            { id: 'step-3', name: 'Signature Verification', threshold: 60 },
            { id: 'step-4', name: 'Code Analysis', threshold: 80 },
            { id: 'step-5', name: 'Database Check', threshold: 100 }
        ];
        
        let currentStepIndex = 0;
        
        // Activate first step
        if (steps[currentStepIndex]) {
            document.getElementById(steps[currentStepIndex].id).classList.add('active');
        }
        
        const scanInterval = setInterval(() => {
            progress += 1;
            this.progressBar.style.width = progress + '%';
            this.percentageText.textContent = progress + '%';
            
            // Check if we need to move to next step
            if (currentStepIndex < steps.length && progress >= steps[currentStepIndex].threshold) {
                // Complete current step
                if (currentStepIndex > 0) {
                    document.getElementById(steps[currentStepIndex - 1].id).classList.add('completed');
                    document.getElementById(steps[currentStepIndex - 1].id).classList.remove('active');
                }
                
                // Activate next step
                if (currentStepIndex < steps.length) {
                    document.getElementById(steps[currentStepIndex].id).classList.add('active');
                }
                
                currentStepIndex++;
            }
            
            // Check if scan is complete
            if (progress >= 100) {
                clearInterval(scanInterval);
                
                // Complete last step
                if (currentStepIndex > 0) {
                    document.getElementById(steps[currentStepIndex - 1].id).classList.add('completed');
                    document.getElementById(steps[currentStepIndex - 1].id).classList.remove('active');
                }
                
                // Generate result after a short delay
                setTimeout(() => {
                    this.generateDemoScanResult();
                }, 1000);
            }
        }, 50);
    }
    
    generateDemoScanResult() {
        // Simulate scan result (random for demo)
        const isSafe = Math.random() > 0.3; // 70% chance of being safe
        this.showDemoScanResults(isSafe);
    }
    
    showDemoScanResults(isSafe) {
        this.resultSection.style.display = 'block';
        
        let resultHTML = '';
        
        if (isSafe) {
            resultHTML = this.generateSafeResultHTML();
        } else {
            resultHTML = this.generateWarningResultHTML();
        }
        
        document.getElementById('result-content').innerHTML = resultHTML;
        this.resultSection.classList.add('animate-fade-up');
    }
    
    generateSafeResultHTML() {
        return `
            <div class="result-badge result-safe">✅ SAFE</div>
            <h2>This APK appears to be legitimate</h2>
            <p>Our analysis indicates the uploaded APK is likely a genuine banking application.</p>
            
            <div class="result-detail">
                <h3>Scan Details</h3>
                
                <div class="detail-item">
                    <div class="detail-icon detail-safe">✓</div>
                    <div>
                        <h4>Signature Verification</h4>
                        <p>The application is signed by a verified developer with a valid certificate.</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-safe">✓</div>
                    <div>
                        <h4>Permission Analysis</h4>
                        <p>The requested permissions align with legitimate banking app requirements.</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-safe">✓</div>
                    <div>
                        <h4>Code Analysis</h4>
                        <p>No malicious code patterns or suspicious behaviors detected.</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-safe">✓</div>
                    <div>
                        <h4>Threat Database</h4>
                        <p>No matches found in our database of known banking malware.</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-safe">✓</div>
                    <div>
                        <h4>Network Communication</h4>
                        <p>Communication endpoints appear legitimate and use proper encryption.</p>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <p><strong>Recommendation:</strong> While our analysis indicates this application is legitimate, always download banking apps from official sources like the Google Play Store or your bank's official website.</p>
                <button class="btn" onclick="window.navigateTo('scan')">Scan Another APK</button>
            </div>
        `;
    }
    
    generateWarningResultHTML() {
        return `
            <div class="result-badge result-warning">⚠️ WARNING</div>
            <h2>Potential security risks detected!</h2>
            <p>Our analysis has flagged the uploaded APK as potentially malicious.</p>
            
            <div class="result-detail">
                <h3>Security Issues Found</h3>
                
                <div class="detail-item">
                    <div class="detail-icon detail-warning">⚠️</div>
                    <div>
                        <h4>Unverified Developer</h4>
                        <p>This application is not signed by a recognized banking application developer.</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-warning">⚠️</div>
                    <div>
                        <h4>Suspicious Permissions</h4>
                        <p>The app requests sensitive permissions that legitimate banking apps don't typically need, including SMS access, contact list access, and device admin privileges.</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-warning">⚠️</div>
                    <div>
                        <h4>Overlay Detection</h4>
                        <p>The app contains code that can create screen overlays, a common technique used by banking trojans to steal credentials.</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-warning">⚠️</div>
                    <div>
                        <h4>Malicious Code Patterns</h4>
                        <p>We detected code patterns similar to known banking malware families.</p>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon detail-warning">⚠️</div>
                    <div>
                        <h4>Suspicious Network Communication</h4>
                        <p>The app appears to communicate with servers not associated with legitimate banking infrastructure.</p>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <p><strong>Recommendation:</strong> DO NOT INSTALL this application. It is likely designed to steal your banking credentials and financial information. Delete this APK immediately.</p>
                <p>If you received this APK from someone or downloaded it from an unofficial source, be cautious of potential phishing attempts.</p>
                <button class="btn" onclick="window.navigateTo('scan')">Scan Another APK</button>
                <button class="btn" onclick="window.navigateTo('threats')" style="margin-left: 10px;">Learn About Threats</button>
            </div>
        `;
    }
    
    resetToUploadState() {
        this.uploadArea.style.display = 'block';
        this.scanProgress.style.display = 'none';
        this.resultSection.style.display = 'none';
        this.currentAnalysisId = null;
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
            this.scanTimeout = null;
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        // Set background color based on type
        const colors = {
            info: 'var(--info)',
            success: 'var(--success)',
            warning: 'var(--warning)',
            error: 'var(--warning)'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
}

// Initialize scanner when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new APKScanner();
});

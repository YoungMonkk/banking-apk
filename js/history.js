// History Management Module
class HistoryManager {
    constructor() {
        this.historyKey = 'apkguard_scan_history';
        this.maxHistoryItems = 100; // Keep last 100 scans
        this.history = this.loadHistory();
        
        this.historyList = document.getElementById('history-list');
        this.historyEmpty = document.getElementById('history-empty');
        this.historyFilter = document.getElementById('history-filter');
        this.historySearch = document.getElementById('history-search');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.renderHistory();
    }
    
    setupEventListeners() {
        // Filter change
        this.historyFilter.addEventListener('change', () => {
            this.renderHistory();
        });
        
        // Search input
        this.historySearch.addEventListener('input', () => {
            this.renderHistory();
        });
        
        // Debounced search for better performance
        let searchTimeout;
        this.historySearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.renderHistory();
            }, 300);
        });
    }
    
    loadHistory() {
        try {
            const stored = localStorage.getItem(this.historyKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }
    
    saveHistory() {
        try {
            localStorage.setItem(this.historyKey, JSON.stringify(this.history));
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }
    
    async addToHistory(scanResult) {
        const historyItem = {
            id: scanResult.id || this.generateId(),
            filename: scanResult.filename,
            timestamp: scanResult.endTime || new Date().toISOString(),
            riskLevel: scanResult.summary?.riskLevel || 'unknown',
            riskScore: scanResult.summary?.riskScore || 0,
            status: scanResult.status || 'completed',
            fileSize: scanResult.fileSize || 0,
            threats: scanResult.details?.threats || [],
            permissions: scanResult.details?.permissionAnalysis?.suspicious || [],
            recommendations: scanResult.recommendations || []
        };
        
        // Add to beginning of array (most recent first)
        this.history.unshift(historyItem);
        
        // Keep only the last maxHistoryItems
        if (this.history.length > this.maxHistoryItems) {
            this.history = this.history.slice(0, this.maxHistoryItems);
        }
        
        this.saveHistory();
        this.renderHistory();
        
        // Also save to server if available
        try {
            await fetch('http://localhost:3000/api/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(historyItem)
            });
        } catch (error) {
            console.warn('Failed to save to server history:', error);
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    getFilteredHistory() {
        let filtered = [...this.history];
        
        // Apply filter
        const filterValue = this.historyFilter.value;
        if (filterValue !== 'all') {
            filtered = filtered.filter(item => item.riskLevel === filterValue);
        }
        
        // Apply search
        const searchTerm = this.historySearch.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(item => 
                item.filename.toLowerCase().includes(searchTerm) ||
                item.riskLevel.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered;
    }
    
    renderHistory() {
        const filteredHistory = this.getFilteredHistory();
        
        if (filteredHistory.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.hideEmptyState();
        
        const historyHTML = filteredHistory.map(item => this.createHistoryItemHTML(item)).join('');
        this.historyList.innerHTML = historyHTML;
        
        // Add event listeners to the new elements
        this.addHistoryItemEventListeners();
    }
    
    createHistoryItemHTML(item) {
        const icon = this.getRiskIcon(item.riskLevel);
        const riskClass = this.getRiskClass(item.riskLevel);
        const date = new Date(item.timestamp).toLocaleDateString();
        const time = new Date(item.timestamp).toLocaleTimeString();
        const fileSize = this.formatFileSize(item.fileSize);
        
        return `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-icon">${icon}</div>
                <div class="history-item-content">
                    <div class="history-item-header">
                        <h4 class="history-item-title">${this.escapeHtml(item.filename)}</h4>
                        <span class="history-item-date">${date} at ${time}</span>
                    </div>
                    <div class="history-item-details">
                        <div class="history-item-detail">
                            <span class="history-item-risk ${riskClass}">${item.riskLevel}</span>
                        </div>
                        <div class="history-item-detail">
                            <span>Risk Score: ${item.riskScore}/100</span>
                        </div>
                        <div class="history-item-detail">
                            <span>Size: ${fileSize}</span>
                        </div>
                        ${item.threats.length > 0 ? `
                        <div class="history-item-detail">
                            <span>Threats: ${item.threats.length}</span>
                        </div>
                        ` : ''}
                        ${item.permissions.length > 0 ? `
                        <div class="history-item-detail">
                            <span>Suspicious Permissions: ${item.permissions.length}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="btn btn-secondary" onclick="historyManager.viewDetails('${item.id}')">View Details</button>
                    <button class="btn btn-danger" onclick="historyManager.deleteItem('${item.id}')">Delete</button>
                </div>
            </div>
        `;
    }
    
    getRiskIcon(riskLevel) {
        switch (riskLevel.toLowerCase()) {
            case 'safe': return '✅';
            case 'suspicious': return '⚠️';
            case 'malicious': return '🚨';
            default: return '❓';
        }
    }
    
    getRiskClass(riskLevel) {
        return riskLevel.toLowerCase();
    }
    
    formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showEmptyState() {
        this.historyEmpty.style.display = 'block';
        this.historyList.innerHTML = '';
    }
    
    hideEmptyState() {
        this.historyEmpty.style.display = 'none';
    }
    
    addHistoryItemEventListeners() {
        // Add any additional event listeners if needed
    }
    
    viewDetails(itemId) {
        const item = this.history.find(h => h.id === itemId);
        if (!item) return;
        
        // Create a modal or navigate to a details view
        this.showDetailsModal(item);
    }
    
    showDetailsModal(item) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Scan Details: ${this.escapeHtml(item.filename)}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="detail-section">
                        <h4>Basic Information</h4>
                        <p><strong>Risk Level:</strong> <span class="history-item-risk ${this.getRiskClass(item.riskLevel)}">${item.riskLevel}</span></p>
                        <p><strong>Risk Score:</strong> ${item.riskScore}/100</p>
                        <p><strong>Scan Date:</strong> ${new Date(item.timestamp).toLocaleString()}</p>
                        <p><strong>File Size:</strong> ${this.formatFileSize(item.fileSize)}</p>
                    </div>
                    
                    ${item.threats.length > 0 ? `
                    <div class="detail-section">
                        <h4>Detected Threats (${item.threats.length})</h4>
                        <ul>
                            ${item.threats.map(threat => `<li>${this.escapeHtml(threat)}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    ${item.permissions.length > 0 ? `
                    <div class="detail-section">
                        <h4>Suspicious Permissions (${item.permissions.length})</h4>
                        <ul>
                            ${item.permissions.map(perm => `<li>${this.escapeHtml(perm)}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    ${item.recommendations.length > 0 ? `
                    <div class="detail-section">
                        <h4>Recommendations</h4>
                        <ul>
                            ${item.recommendations.map(rec => `<li>${this.escapeHtml(rec)}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add modal styles if not already present
        if (!document.getElementById('modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: white;
                    border-radius: 8px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                .modal-header {
                    padding: 1rem;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-body {
                    padding: 1rem;
                }
                .detail-section {
                    margin-bottom: 1.5rem;
                }
                .detail-section h4 {
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
                .detail-section ul {
                    margin: 0;
                    padding-left: 1.5rem;
                }
                .detail-section li {
                    margin-bottom: 0.25rem;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this scan from your history?')) {
            this.history = this.history.filter(h => h.id !== itemId);
            this.saveHistory();
            this.renderHistory();
        }
    }
    
    clearHistory() {
        if (confirm('Are you sure you want to clear all scan history? This action cannot be undone.')) {
            this.history = [];
            this.saveHistory();
            this.renderHistory();
        }
    }
    
    getHistoryStats() {
        const total = this.history.length;
        const safe = this.history.filter(h => h.riskLevel === 'safe').length;
        const suspicious = this.history.filter(h => h.riskLevel === 'suspicious').length;
        const malicious = this.history.filter(h => h.riskLevel === 'malicious').length;
        
        return { total, safe, suspicious, malicious };
    }
}

// Global functions for HTML onclick handlers
function clearHistory() {
    if (window.historyManager) {
        window.historyManager.clearHistory();
    }
}

// Initialize history manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.historyManager = new HistoryManager();
});

// Export for use in other modules
window.HistoryManager = HistoryManager;

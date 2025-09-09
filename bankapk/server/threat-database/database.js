const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class ThreatDatabase {
    constructor() {
        this.threats = new Map();
        this.patterns = new Map();
        // Internal readiness flag (avoid name clash with isReady() method)
        this._ready = false;
        this.databasePath = path.join(__dirname, 'data', 'threats.json');
        this.patternsPath = path.join(__dirname, 'data', 'patterns.json');
        
        this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            await this.loadThreatDatabase();
            await this.loadPatternDatabase();
            this._ready = true;
            console.log('✅ Threat database initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize threat database:', error);
            // Create default database if loading fails
            await this.createDefaultDatabase();
            // Mark ready after creating defaults
            this._ready = true;
        }
    }

    async loadThreatDatabase() {
        try {
            if (await fs.pathExists(this.databasePath)) {
                const data = await fs.readFile(this.databasePath, 'utf8');
                const threats = JSON.parse(data);
                
                threats.forEach(threat => {
                    this.threats.set(threat.hash, threat);
                    if (threat.packageName) {
                        this.threats.set(threat.packageName, threat);
                    }
                });
                
                console.log(`📊 Loaded ${threats.length} known threats`);
            }
        } catch (error) {
            console.warn('Could not load threat database, creating default:', error.message);
            await this.createDefaultDatabase();
        }
    }

    async loadPatternDatabase() {
        try {
            if (await fs.pathExists(this.patternsPath)) {
                const data = await fs.readFile(this.patternsPath, 'utf8');
                const patterns = JSON.parse(data);
                
                patterns.forEach(pattern => {
                    this.patterns.set(pattern.id, pattern);
                });
                
                console.log(`🔍 Loaded ${patterns.length} threat patterns`);
            }
        } catch (error) {
            console.warn('Could not load pattern database, creating default:', error.message);
            await this.createDefaultDatabase();
        }
    }

    async createDefaultDatabase() {
        try {
            await fs.ensureDir(path.dirname(this.databasePath));
            
            // Create default threats database
            const defaultThreats = [
                {
                    id: 'threat_001',
                    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                    packageName: 'com.fakebanking.app',
                    type: 'banking_trojan',
                    family: 'Anubis',
                    confidence: 95,
                    description: 'Fake banking application designed to steal credentials',
                    firstSeen: '2024-01-01',
                    lastSeen: new Date().toISOString().split('T')[0],
                    indicators: [
                        'Requests excessive permissions',
                        'Creates overlay screens',
                        'Intercepts SMS messages',
                        'Communicates with C&C servers'
                    ],
                    severity: 'high',
                    tags: ['banking', 'trojan', 'overlay', 'sms_intercept']
                },
                {
                    id: 'threat_002',
                    hash: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',
                    packageName: 'com.security.scanner.fake',
                    type: 'fake_security_app',
                    family: 'FakeScanner',
                    confidence: 90,
                    description: 'Fake security scanner that installs additional malware',
                    firstSeen: '2024-01-15',
                    lastSeen: new Date().toISOString().split('T')[0],
                    indicators: [
                        'Claims to be security software',
                        'Requests admin privileges',
                        'Downloads additional payloads',
                        'Disables security features'
                    ],
                    severity: 'high',
                    tags: ['fake_security', 'admin_privileges', 'payload_download']
                },
                {
                    id: 'threat_003',
                    hash: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
                    packageName: 'com.system.optimizer.fake',
                    type: 'system_optimizer',
                    family: 'FakeOptimizer',
                    confidence: 85,
                    description: 'Fake system optimizer that collects user data',
                    firstSeen: '2024-02-01',
                    lastSeen: new Date().toISOString().split('T')[0],
                    indicators: [
                        'Claims to optimize system performance',
                        'Requests accessibility services',
                        'Collects device information',
                        'Sends data to unknown servers'
                    ],
                    severity: 'medium',
                    tags: ['fake_optimizer', 'accessibility', 'data_collection']
                }
            ];

            await fs.writeFile(this.databasePath, JSON.stringify(defaultThreats, null, 2));
            
            // Create default patterns database
            const defaultPatterns = [
                {
                    id: 'pattern_001',
                    name: 'SMS Interception',
                    pattern: 'sms_intercept',
                    description: 'Code patterns that intercept SMS messages',
                    riskLevel: 'high',
                    tags: ['sms', 'interception', 'otp_theft'],
                    examples: [
                        'android.provider.Telephony.Sms.Intents.SMS_RECEIVED_ACTION',
                        'android.telephony.SmsManager',
                        'android.provider.Telephony.Sms'
                    ]
                },
                {
                    id: 'pattern_002',
                    name: 'Overlay Attack',
                    pattern: 'overlay',
                    description: 'Code that creates screen overlays to steal credentials',
                    riskLevel: 'high',
                    tags: ['overlay', 'credential_theft', 'phishing'],
                    examples: [
                        'android.view.WindowManager.LayoutParams.TYPE_SYSTEM_ALERT',
                        'android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY',
                        'android.service.voice.VoiceInteractionService'
                    ]
                },
                {
                    id: 'pattern_003',
                    name: 'Accessibility Abuse',
                    pattern: 'accessibility',
                    description: 'Misuse of accessibility services for malicious purposes',
                    riskLevel: 'high',
                    tags: ['accessibility', 'keylogging', 'screen_reading'],
                    examples: [
                        'android.accessibilityservice.AccessibilityService',
                        'android.accessibilityservice.AccessibilityServiceInfo',
                        'onAccessibilityEvent'
                    ]
                },
                {
                    id: 'pattern_004',
                    name: 'Keylogger',
                    pattern: 'keylogger',
                    description: 'Code that records keystrokes',
                    riskLevel: 'high',
                    tags: ['keylogging', 'credential_theft', 'privacy_violation'],
                    examples: [
                        'onKeyDown',
                        'onKeyUp',
                        'onTextChanged',
                        'InputMethodManager'
                    ]
                },
                {
                    id: 'pattern_005',
                    name: 'Screen Capture',
                    pattern: 'screen_capture',
                    description: 'Code that captures screen content',
                    riskLevel: 'medium',
                    tags: ['screen_capture', 'privacy_violation', 'surveillance'],
                    examples: [
                        'MediaProjection',
                        'VirtualDisplay',
                        'ImageReader',
                        'screenshot'
                    ]
                }
            ];

            await fs.writeFile(this.patternsPath, JSON.stringify(defaultPatterns, null, 2));
            
            // Load the default databases
            await this.loadThreatDatabase();
            await this.loadPatternDatabase();
            
            console.log('✅ Default threat database created successfully');
            // Mark ready when defaults are created
            this._ready = true;
        } catch (error) {
            console.error('❌ Failed to create default database:', error);
        }
    }

    async lookupThreat(hash, packageName) {
        // Check by hash first
        if (this.threats.has(hash)) {
            return this.threats.get(hash);
        }
        
        // Check by package name
        if (packageName && this.threats.has(packageName)) {
            return this.threats.get(packageName);
        }
        
        return null;
    }

    async addThreat(threat) {
        try {
            // Validate threat data
            if (!threat.hash && !threat.packageName) {
                throw new Error('Threat must have either hash or package name');
            }
            
            // Generate ID if not provided
            if (!threat.id) {
                threat.id = `threat_${Date.now()}`;
            }
            
            // Set timestamps
            if (!threat.firstSeen) {
                threat.firstSeen = new Date().toISOString().split('T')[0];
            }
            threat.lastSeen = new Date().toISOString().split('T')[0];
            
            // Add to memory
            if (threat.hash) {
                this.threats.set(threat.hash, threat);
            }
            if (threat.packageName) {
                this.threats.set(threat.packageName, threat);
            }
            
            // Save to disk
            await this.saveThreatDatabase();
            
            console.log(`✅ Added new threat: ${threat.id}`);
            return threat;
            
        } catch (error) {
            console.error('Failed to add threat:', error);
            throw error;
        }
    }

    async removeThreat(threatId) {
        try {
            let removed = false;
            
            // Find and remove threat
            for (const [key, threat] of this.threats.entries()) {
                if (threat.id === threatId) {
                    this.threats.delete(key);
                    removed = true;
                }
            }
            
            if (removed) {
                await this.saveThreatDatabase();
                console.log(`✅ Removed threat: ${threatId}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to remove threat:', error);
            throw error;
        }
    }

    async searchThreats(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        for (const threat of this.threats.values()) {
            if (threat.id.includes(queryLower) ||
                (threat.packageName && threat.packageName.includes(queryLower)) ||
                (threat.description && threat.description.toLowerCase().includes(queryLower)) ||
                (threat.family && threat.family.toLowerCase().includes(queryLower))) {
                results.push(threat);
            }
        }
        
        return results;
    }

    async getThreatSummary() {
        const summary = {
            totalThreats: this.threats.size,
            threatTypes: {},
            families: {},
            severity: {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0
            },
            recentThreats: [],
            lastUpdated: new Date().toISOString()
        };
        
        const threats = Array.from(this.threats.values());
        
        // Count by type, family, and severity
        threats.forEach(threat => {
            // Count by type
            summary.threatTypes[threat.type] = (summary.threatTypes[threat.type] || 0) + 1;
            
            // Count by family
            if (threat.family) {
                summary.families[threat.family] = (summary.families[threat.family] || 0) + 1;
            }
            
            // Count by severity
            const severity = threat.severity || 'medium';
            summary.severity[severity] = (summary.severity[severity] || 0) + 1;
        });
        
        // Get recent threats (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        summary.recentThreats = threats
            .filter(threat => new Date(threat.lastSeen) > thirtyDaysAgo)
            .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
            .slice(0, 10)
            .map(threat => ({
                id: threat.id,
                type: threat.type,
                family: threat.family,
                severity: threat.severity,
                lastSeen: threat.lastSeen
            }));
        
        return summary;
    }

    async getPatterns() {
        return Array.from(this.patterns.values());
    }

    async addPattern(pattern) {
        try {
            if (!pattern.id) {
                pattern.id = `pattern_${Date.now()}`;
            }
            
            this.patterns.set(pattern.id, pattern);
            await this.savePatternDatabase();
            
            console.log(`✅ Added new pattern: ${pattern.id}`);
            return pattern;
        } catch (error) {
            console.error('Failed to add pattern:', error);
            throw error;
        }
    }

    async saveThreatDatabase() {
        try {
            const threats = Array.from(this.threats.values());
            // Remove duplicates based on ID
            const uniqueThreats = threats.filter((threat, index, self) => 
                index === self.findIndex(t => t.id === threat.id)
            );
            
            await fs.writeFile(this.databasePath, JSON.stringify(uniqueThreats, null, 2));
        } catch (error) {
            console.error('Failed to save threat database:', error);
            throw error;
        }
    }

    async savePatternDatabase() {
        try {
            const patterns = Array.from(this.patterns.values());
            await fs.writeFile(this.patternsPath, JSON.stringify(patterns, null, 2));
        } catch (error) {
            console.error('Failed to save pattern database:', error);
            throw error;
        }
    }

    async updateThreatDatabase() {
        try {
            // This could be extended to fetch updates from external sources
            // For now, just reload the database
            await this.loadThreatDatabase();
            console.log('✅ Threat database updated');
        } catch (error) {
            console.error('Failed to update threat database:', error);
            throw error;
        }
    }

    isReady() {
        return this._ready;
    }

    getDatabaseInfo() {
        return {
            threatsCount: this.threats.size,
            patternsCount: this.patterns.size,
            isReady: this._ready,
            lastUpdated: new Date().toISOString()
        };
    }
}

module.exports = ThreatDatabase;

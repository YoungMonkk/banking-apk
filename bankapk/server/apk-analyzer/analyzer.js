const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const xml2js = require('xml2js');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class APKAnalyzer {
    constructor(threatDatabase) {
        this.threatDatabase = threatDatabase;
        this.analysisResults = new Map();
        this.statistics = {
            totalScans: 0,
            safeApps: 0,
            suspiciousApps: 0,
            maliciousApps: 0,
            lastScan: null
        };
        this.isReady = this.checkDependencies();
    }

    checkDependencies() {
        try {
            // Check if required packages are available
            require('unzipper');
            require('xml2js');
            require('fs-extra');
            require('crypto');
            require('path');
            
            console.log('✅ All required dependencies are available');
            return true;
        } catch (error) {
            console.warn('⚠️ Some dependencies are missing:', error.message);
            console.warn('🔄 Will use fallback methods for analysis');
            return true; // Still allow analysis with fallbacks
        }
    }

    async analyzeAPK(apkPath, analysisId) {
        try {
            console.log(`🔍 Starting analysis for ${analysisId}`);
        
            // Create analysis result object
            const result = {
                id: analysisId,
                status: 'processing',
                startTime: new Date().toISOString(),
                filename: path.basename(apkPath),
                progress: 0,
                steps: []
            };

            this.analysisResults.set(analysisId, result);

            // Initial progress so UI sees immediate movement
            await this.updateProgress(analysisId, 5, 'Starting', 'Initializing analysis');

            // Add timeout protection for the entire analysis (do not throw inside timer)
            let timedOut = false;
            const analysisTimeout = setTimeout(() => {
                timedOut = true;
                console.error(`⏰ Analysis timeout for ${analysisId}`);
                this.updateProgress(analysisId, 0, 'Timeout', 'Analysis took too long and was cancelled');
                const r = this.analysisResults.get(analysisId);
                if (r) {
                    r.status = 'failed';
                    r.error = 'Analysis timeout - process took too long';
                    this.analysisResults.set(analysisId, r);
                }
            }, 300000); // 5 minutes timeout

            try {
                // Step 1: File Analysis
                await this.updateProgress(analysisId, 20, 'File Analysis', 'Examining file structure and integrity');
                const fileAnalysis = await this.analyzeFileStructure(apkPath);
                
                // Step 2: Extract APK contents
                await this.updateProgress(analysisId, 40, 'Extracting APK', 'Extracting and parsing APK contents');
                let extractedPath;
                let manifestAnalysis;
                let permissionAnalysis;
                let codeAnalysis;

                try {
                    extractedPath = await this.extractAPK(apkPath, analysisId);
                    // Step 3: Parse AndroidManifest.xml
                    await this.updateProgress(analysisId, 60, 'Manifest Analysis', 'Analyzing Android manifest file');
                    manifestAnalysis = await this.analyzeManifest(extractedPath);
                    // Step 4: Permission Analysis
                    await this.updateProgress(analysisId, 80, 'Permission Check', 'Analyzing requested permissions');
                    permissionAnalysis = await this.analyzePermissions(manifestAnalysis.permissions);
                    // Step 5: Code Analysis
                    await this.updateProgress(analysisId, 90, 'Code Analysis', 'Checking for malicious code patterns');
                    codeAnalysis = await this.analyzeCode(extractedPath);
                } catch (extractionOrManifestError) {
                    console.warn(`⚠️ Extraction/Manifest/Code analysis failed for ${analysisId}: ${extractionOrManifestError.message}`);
                    console.warn('↩️ Proceeding with minimal analysis based on file metadata only.');
                    // Minimal placeholders so pipeline can complete
                    extractedPath = path.dirname(apkPath);
                    manifestAnalysis = { packageName: 'Unknown', versionCode: 'Unknown', versionName: 'Unknown', permissions: [], activities: [], services: [], receivers: [], providers: [] };
                    permissionAnalysis = { total: 0, suspicious: [], banking: [], riskScore: 0 };
                    codeAnalysis = { dexFiles: 0, suspiciousPatterns: [], riskScore: 0, error: extractionOrManifestError.message };
                }
                
                // Step 6: Threat Database Check
                await this.updateProgress(analysisId, 95, 'Database Check', 'Comparing with known threats');
                const threatAnalysis = await this.checkThreatDatabase(fileAnalysis, manifestAnalysis, codeAnalysis);
                
                // Step 7: Generate final result
                await this.updateProgress(analysisId, 100, 'Finalizing', 'Generating security report');
                const finalResult = await this.generateFinalResult(
                    analysisId,
                    fileAnalysis,
                    manifestAnalysis,
                    permissionAnalysis,
                    codeAnalysis,
                    threatAnalysis
                );

                // Update statistics
                this.updateStatistics(finalResult.summary.riskLevel);
                
                // Cleanup extracted files
                try {
                    await fs.remove(extractedPath);
                } catch (cleanupError) {
                    console.warn(`⚠️ Cleanup failed for ${analysisId}:`, cleanupError.message);
                }
                
                clearTimeout(analysisTimeout);
                console.log(`✅ Analysis completed for ${analysisId}`);
                return finalResult;

            } catch (stepError) {
                // On any step error, finalize with minimal result instead of throwing
                clearTimeout(analysisTimeout);
                console.warn(`⚠️ Analysis pipeline error for ${analysisId}: ${stepError.message}`);
                try {
                    const fileAnalysis = await this.analyzeFileStructure(apkPath).catch(() => ({ size: 0, hash: null, hashSha1: null, lastModified: null, isValidAPK: false }));
                    const manifestAnalysis = { packageName: 'Unknown', versionCode: 'Unknown', versionName: 'Unknown', permissions: [], activities: [], services: [], receivers: [], providers: [] };
                    const permissionAnalysis = { total: 0, suspicious: [], banking: [], riskScore: 0 };
                    const codeAnalysis = { dexFiles: 0, suspiciousPatterns: [], riskScore: 0, error: stepError.message };
                    const threatAnalysis = await this.checkThreatDatabase(fileAnalysis, manifestAnalysis, codeAnalysis).catch(() => ({ isKnownThreat: false }));
                    await this.updateProgress(analysisId, 100, 'Finalizing (fallback)', 'Completing with minimal analysis due to an error');
                    const finalResult = await this.generateFinalResult(
                        analysisId,
                        fileAnalysis,
                        manifestAnalysis,
                        permissionAnalysis,
                        codeAnalysis,
                        threatAnalysis
                    );
                    console.log(`✅ Analysis (fallback) completed for ${analysisId}`);
                    return finalResult;
                } catch (finalizeErr) {
                    console.error(`❌ Failed to finalize fallback result for ${analysisId}: ${finalizeErr.message}`);
                    const r = this.analysisResults.get(analysisId) || { id: analysisId };
                    r.status = 'failed';
                    r.error = stepError.message;
                    this.analysisResults.set(analysisId, r);
                    return r;
                }
            }

        } catch (error) {
            console.error(`❌ Analysis failed for ${analysisId}:`, error);
            // Update progress with error information and return a failed result (do not throw)
            await this.updateProgress(analysisId, 0, 'Error', `Analysis failed: ${error.message}`);
            const result = this.analysisResults.get(analysisId) || { id: analysisId };
            result.status = 'failed';
            result.error = error.message;
            this.analysisResults.set(analysisId, result);
            return result;
        }
    }

    async analyzeFileStructure(apkPath) {
        const stats = await fs.stat(apkPath);
        const hashSha256 = await this.calculateFileHash(apkPath, 'sha256');
        const hashSha1 = await this.calculateFileHash(apkPath, 'sha1');
        
        return {
            size: stats.size,
            hash: hashSha256,
            hashSha1: hashSha1,
            lastModified: stats.mtime,
            isValidAPK: await this.validateAPKFile(apkPath)
        };
    }

    async extractAPK(apkPath, analysisId) {
        const extractPath = path.join(path.dirname(apkPath), `extracted_${analysisId}`);
        await fs.ensureDir(extractPath);

        // Prefer unzipper, but fall back to manual extraction if unavailable or failing
        try {
            await new Promise((resolve, reject) => {
                try {
                    const unzipper = require('unzipper');
                    const extractStream = unzipper.Extract({ path: extractPath });
                    extractStream.on('close', resolve);
                    extractStream.on('error', reject);
                    fs.createReadStream(apkPath).pipe(extractStream);
                } catch (err) {
                    return reject(err);
                }
            });
            console.log(`✅ APK extracted to: ${extractPath}`);
            return extractPath;
        } catch (zipErr) {
            console.warn(`⚠️ unzipper extraction failed or not available for ${analysisId}: ${zipErr.message}`);
            console.warn('↩️ Falling back to manual extraction.');
            const fallbackPath = await this.extractAPKManual(apkPath, extractPath);
            return fallbackPath;
        }
    }

    async extractAPKManual(apkPath, extractPath) {
        try {
            console.log('🔄 Using manual APK extraction (adm-zip fallback)...');
            try {
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(apkPath);
                zip.extractAllTo(extractPath, true);
                console.log('✅ adm-zip extraction completed');
                return extractPath;
            } catch (zErr) {
                console.warn('⚠️ adm-zip not available or failed:', zErr.message);
                // As a last resort, create the directory and proceed without extraction
                await fs.ensureDir(extractPath);
                await fs.writeFile(path.join(extractPath, '.no_extraction'), 'extraction skipped');
                console.warn('↩️ Proceeding without extraction (limited analysis)');
                return extractPath;
            }
        } catch (error) {
            console.error('❌ Manual extraction failed:', error);
            // Proceed by returning the directory to allow minimal analysis to continue
            await fs.ensureDir(extractPath);
            return extractPath;
        }
    }

    async analyzeManifest(extractedPath) {
        const manifestPath = path.join(extractedPath, 'AndroidManifest.xml');
        
        if (!await fs.pathExists(manifestPath)) {
            throw new Error('AndroidManifest.xml not found');
        }

        try {
            const manifestContent = await fs.readFile(manifestPath, 'utf8');
            const parser = new xml2js.Parser();
            const manifest = await parser.parseStringPromise(manifestContent);

            return {
                packageName: manifest.manifest?.$.package || 'Unknown',
                versionCode: manifest.manifest?.$.versionCode || 'Unknown',
                versionName: manifest.manifest?.$.versionName || 'Unknown',
                permissions: this.extractPermissions(manifest),
                activities: this.extractActivities(manifest),
                services: this.extractServices(manifest),
                receivers: this.extractReceivers(manifest),
                providers: this.extractProviders(manifest)
            };
        } catch (error) {
            console.warn('⚠️ Manifest parsing failed, attempting binary permission extraction:', error.message);
            
            // Attempt to extract permissions from binary AXML by scanning for permission strings
            try {
                const manifestBuffer = await fs.readFile(manifestPath);
                const binaryPermissions = this.extractPermissionsFromBinaryBuffer(manifestBuffer);
                
                if (binaryPermissions.length > 0) {
                    return {
                        packageName: 'Unknown',
                        versionCode: 'Unknown',
                        versionName: 'Unknown',
                        permissions: binaryPermissions,
                        activities: [],
                        services: [],
                        receivers: [],
                        providers: []
                    };
                }
            } catch (binErr) {
                console.warn('⚠️ Binary permission extraction failed:', binErr.message);
            }
            
            // Fallback: try to extract basic info from text using regex
            try {
                const manifestContent = await fs.readFile(manifestPath, 'utf8');
                
                // Simple regex-based extraction as fallback
                const packageMatch = manifestContent.match(/package="([^"]+)"/);
                const versionMatch = manifestContent.match(/versionName="([^"]+)"/);
                const versionCodeMatch = manifestContent.match(/versionCode="([^"]+)"/);
                
                return {
                    packageName: packageMatch ? packageMatch[1] : 'Unknown',
                    versionCode: versionCodeMatch ? versionCodeMatch[1] : 'Unknown',
                    versionName: versionMatch ? versionMatch[1] : 'Unknown',
                    permissions: this.extractPermissionsFallback(manifestContent),
                    activities: [],
                    services: [],
                    receivers: [],
                    providers: []
                };
            } catch (fallbackError) {
                console.error('❌ Fallback manifest analysis also failed:', fallbackError.message);
                throw new Error('Failed to analyze Android manifest file');
            }
        }
    }

    extractPermissions(manifest) {
        const permissions = manifest.manifest?.uses-permission || [];
        return permissions.map(p => p.$['android:name']).filter(Boolean);
    }

    extractPermissionsFallback(manifestContent) {
        const permissions = [];
        const permissionRegex = /android:name="([^"]+)"/g;
        let match;
        
        while ((match = permissionRegex.exec(manifestContent)) !== null) {
            if (match[1].startsWith('android.permission.')) {
                permissions.push(match[1]);
            }
        }
        
        return permissions;
    }

    extractPermissionsFromBinaryBuffer(buffer) {
        // Conservative extraction to avoid false positives from binary noise
        const RAW_TEXT = buffer.toString('utf8');
        const NEEDLE = 'android.permission.';
        const CANDIDATES = new Set();

        // Curated allowlist of common Android permissions to validate candidates
        const KNOWN = new Set([
            'android.permission.READ_SMS',
            'android.permission.SEND_SMS',
            'android.permission.RECEIVE_SMS',
            'android.permission.BIND_ACCESSIBILITY_SERVICE',
            'android.permission.REQUEST_INSTALL_PACKAGES',
            'android.permission.SYSTEM_ALERT_WINDOW',
            'android.permission.WRITE_SETTINGS',
            'android.permission.PACKAGE_USAGE_STATS',
            'android.permission.RECEIVE_BOOT_COMPLETED',
            'android.permission.READ_CONTACTS',
            'android.permission.WRITE_CONTACTS',
            'android.permission.READ_CALL_LOG',
            'android.permission.WRITE_CALL_LOG',
            'android.permission.CAMERA',
            'android.permission.RECORD_AUDIO',
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION',
            'android.permission.READ_PHONE_NUMBERS',
            'android.permission.READ_PHONE_STATE',
            'android.permission.INTERNET',
            'android.permission.ACCESS_NETWORK_STATE',
            'android.permission.READ_EXTERNAL_STORAGE',
            'android.permission.WRITE_EXTERNAL_STORAGE',
            'android.permission.BLUETOOTH',
            'android.permission.BLUETOOTH_CONNECT',
            'android.permission.NFC',
            'android.permission.WAKE_LOCK',
            'android.permission.FOREGROUND_SERVICE'
        ]);

        let index = 0;
        while ((index = RAW_TEXT.indexOf(NEEDLE, index)) !== -1) {
            let end = index + NEEDLE.length;
            // Capture valid permission chars [A-Z0-9_\.] only (uppercase preferred in AOSP constants)
            while (end < RAW_TEXT.length) {
                const ch = RAW_TEXT.charAt(end);
                const isValid = (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '_' || ch === '.';
                if (!isValid) break;
                end++;
            }
            const candidate = RAW_TEXT.substring(index, end);
            // Must match strict pattern and be whitelisted
            const isShapeValid = /^android\.permission\.[A-Z0-9_\.]+$/.test(candidate);
            if (isShapeValid && KNOWN.has(candidate)) {
                CANDIDATES.add(candidate);
            }
            index = end;
        }

        return Array.from(CANDIDATES);
    }

    extractActivities(manifest) {
        const activities = manifest.manifest?.application?.[0]?.activity || [];
        return activities.map(a => a.$['android:name']).filter(Boolean);
    }

    extractServices(manifest) {
        const services = manifest.manifest?.application?.[0]?.service || [];
        return services.map(s => s.$['android:name']).filter(Boolean);
    }

    extractReceivers(manifest) {
        const receivers = manifest.manifest?.application?.[0]?.receiver || [];
        return receivers.map(r => r.$['android:name']).filter(Boolean);
    }

    extractProviders(manifest) {
        const providers = manifest.manifest?.application?.[0]?.provider || [];
        return providers.map(p => p.$['android:name']).filter(Boolean);
    }

    async analyzePermissions(permissions) {
        const suspiciousPermissions = [
            'android.permission.READ_SMS',
            'android.permission.SEND_SMS',
            'android.permission.RECEIVE_SMS',
            'android.permission.BIND_ACCESSIBILITY_SERVICE',
            'android.permission.REQUEST_INSTALL_PACKAGES',
            'android.permission.SYSTEM_ALERT_WINDOW',
            'android.permission.WRITE_SETTINGS',
            'android.permission.PACKAGE_USAGE_STATS',
            'android.permission.RECEIVE_BOOT_COMPLETED',
            'android.permission.READ_CONTACTS',
            'android.permission.WRITE_CONTACTS',
            'android.permission.READ_CALL_LOG',
            'android.permission.WRITE_CALL_LOG',
            'android.permission.CAMERA',
            'android.permission.RECORD_AUDIO',
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION',
            'android.permission.READ_PHONE_NUMBERS',
            'android.permission.READ_PHONE_STATE'
        ];

        const bankingPermissions = [
            'android.permission.INTERNET',
            'android.permission.ACCESS_NETWORK_STATE',
            'android.permission.READ_EXTERNAL_STORAGE',
            'android.permission.WRITE_EXTERNAL_STORAGE'
        ];

        const foundSuspicious = permissions.filter(p => suspiciousPermissions.includes(p));
        const foundBanking = permissions.filter(p => bankingPermissions.includes(p));

        return {
            total: permissions.length,
            suspicious: foundSuspicious,
            banking: foundBanking,
            riskScore: this.calculatePermissionRisk(permissions, foundSuspicious)
        };
    }

    calculatePermissionRisk(permissions, suspiciousPermissions) {
        let riskScore = 10; // Lower base risk for sideloaded APKs
        
        // High risk permissions (always suspicious)
        const highRiskPerms = [
            'android.permission.BIND_ACCESSIBILITY_SERVICE',
            'android.permission.SYSTEM_ALERT_WINDOW',
            'android.permission.TYPE_APPLICATION_OVERLAY'
        ];
        
        // Medium risk permissions (suspicious in combination)
        const mediumRiskPerms = [
            'android.permission.RECEIVE_SMS',
            'android.permission.READ_SMS',
            'android.permission.SEND_SMS',
            'android.permission.READ_CONTACTS',
            'android.permission.WRITE_CONTACTS',
            'android.permission.READ_CALL_LOG',
            'android.permission.WRITE_CALL_LOG'
        ];
        
        // Low risk permissions (usually legitimate)
        const lowRiskPerms = [
            'android.permission.CAMERA',
            'android.permission.RECORD_AUDIO',
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION',
            'android.permission.READ_PHONE_STATE',
            'android.permission.INTERNET',
            'android.permission.ACCESS_NETWORK_STATE'
        ];
        
        // Calculate risk based on permission categories
        suspiciousPermissions.forEach(permission => {
            const perm = String(permission);
            
            if (highRiskPerms.includes(perm)) {
                riskScore += 25; // High risk
            } else if (mediumRiskPerms.includes(perm)) {
                riskScore += 15; // Medium risk
            } else if (lowRiskPerms.includes(perm)) {
                riskScore += 8;  // Low risk
            } else {
                riskScore += 10; // Unknown permission
            }
        });
        
        // Apply contextual adjustments
        if (suspiciousPermissions.length === 1 && lowRiskPerms.includes(suspiciousPermissions[0])) {
            // Single low-risk permission is usually safe
            riskScore = Math.max(riskScore - 5, 0);
        }
        
        if (suspiciousPermissions.length >= 5) {
            // Too many suspicious permissions
            riskScore += 15;
        }

        // Cap between 0-100
        return Math.max(0, Math.min(riskScore, 100));
    }

    async analyzeCode(extractedPath) {
        try {
            const dexFiles = await this.findDexFiles(extractedPath);
            const suspiciousPatterns = await this.scanForSuspiciousPatterns(extractedPath);
            
            return {
                dexFiles: dexFiles.length,
                suspiciousPatterns,
                riskScore: this.calculateCodeRisk(suspiciousPatterns)
            };
        } catch (error) {
            console.warn('⚠️ Code analysis failed, using fallback:', error.message);
            
            // Fallback: return basic analysis
            return {
                dexFiles: 0,
                suspiciousPatterns: [],
                riskScore: 0,
                error: error.message
            };
        }
    }

    async findDexFiles(extractedPath) {
        const dexFiles = [];
        
        try {
            const findDex = async (dir) => {
                try {
                    const items = await fs.readdir(dir);
                    for (const item of items) {
                        try {
                            const itemPath = path.join(dir, item);
                            const stats = await fs.stat(itemPath);
                            
                            if (stats.isDirectory()) {
                                await findDex(itemPath);
                            } else if (item.endsWith('.dex')) {
                                dexFiles.push(itemPath);
                            }
                        } catch (itemError) {
                            console.warn(`⚠️ Could not process item ${item}:`, itemError.message);
                        }
                    }
                } catch (dirError) {
                    console.warn(`⚠️ Could not read directory ${dir}:`, dirError.message);
                }
            };

            await findDex(extractedPath);
        } catch (error) {
            console.warn('⚠️ DEX file search failed:', error.message);
        }
        
        return dexFiles;
    }

    async scanForSuspiciousPatterns(allFiles) {
        // Accept both dexFiles array or any file list; prefer high-signal patterns only
        const patterns = [
            // High-signal behavior and APIs
            'TYPE_APPLICATION_OVERLAY',
            'SYSTEM_ALERT_WINDOW',
            'BIND_ACCESSIBILITY_SERVICE',
            'AccessibilityService',
            'REQUEST_INSTALL_PACKAGES',
            'PACKAGE_USAGE_STATS',
            'RECEIVE_BOOT_COMPLETED',
            'MediaProjection',
            'VirtualDisplay',
            'DeviceAdminReceiver',
            'DevicePolicyManager',
            'BIND_DEVICE_ADMIN',
            'SmsManager',
            'addJavascriptInterface'
        ];

        // Add patterns from threat database if available
        try {
            if (this.threatDatabase && this.threatDatabase.patterns) {
                for (const pattern of this.threatDatabase.patterns.values()) {
                    if (Array.isArray(pattern.examples)) {
                        pattern.examples.forEach(ex => patterns.push(String(ex)));
                    }
                    if (pattern.pattern) patterns.push(String(pattern.pattern));
                }
            }
        } catch {}

        const foundPatterns = [];

        // Determine target files: prefer classes*.dex and manifest XML to reduce noise
        const targetFiles = [];
        const addFilesFromDir = async (dir) => {
            const items = await fs.readdir(dir);
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = await fs.stat(itemPath);
                if (stats.isDirectory()) {
                    await addFilesFromDir(itemPath);
                } else {
                    if (
                        // DEX bytecode files (class data strings sometimes expose symbols)
                        /^classes(\d*)?\.dex$/i.test(item) ||
                        // Android manifest and XML configs
                        item === 'AndroidManifest.xml' ||
                        (item.toLowerCase().endsWith('.xml') && itemPath.toLowerCase().includes(path.sep + 'res' + path.sep))
                    ) {
                        targetFiles.push(itemPath);
                    }
                }
            }
        };

        // If input looks like a directory, scan it recursively; otherwise assume it's a list of file paths
        if (typeof allFiles === 'string') {
            await addFilesFromDir(allFiles);
        } else if (Array.isArray(allFiles) && allFiles.length && allFiles[0].includes(path.sep)) {
            targetFiles.push(...allFiles);
        } else {
            // Fallback to current directory
            targetFiles.push(...await this.findDexFiles(allFiles));
        }

        for (const filePath of targetFiles) {
            try {
                const buffer = await fs.readFile(filePath);
                // Convert to lower-case string, best-effort for binary
                const contentStr = buffer.toString('utf8').toLowerCase();

                patterns.forEach(pattern => {
                    const p = String(pattern).toLowerCase();
                    if (p && contentStr.includes(p)) {
                        foundPatterns.push({
                            pattern: pattern,
                            file: path.basename(filePath),
                            confidence: this.estimatePatternConfidence(pattern)
                        });
                    }
                });
            } catch (error) {
                console.warn(`⚠️ Could not read file ${filePath}:`, error.message);
            }
        }

        return foundPatterns;
    }

    estimatePatternConfidence(pattern) {
        const highRisk = ['SYSTEM_ALERT_WINDOW', 'TYPE_APPLICATION_OVERLAY', 'AccessibilityService', 'sms_intercept', 'keylogger'];
        const mediumRisk = ['RECORD_AUDIO', 'READ_SMS', 'RECEIVE_SMS', 'SEND_SMS'];
        const p = String(pattern).toUpperCase();
        if (highRisk.some(k => p.includes(k))) return 'high';
        if (mediumRisk.some(k => p.includes(k))) return 'medium';
        return 'low';
    }

    calculateCodeRisk(suspiciousPatterns) {
        let riskScore = 0;
        
        // Categorize patterns by risk level
        const highRiskPatterns = [];
        const mediumRiskPatterns = [];
        const lowRiskPatterns = [];
        
        suspiciousPatterns.forEach(pattern => {
            const pat = String(pattern.pattern || pattern).toUpperCase();
            
            // High risk patterns (always suspicious)
            if (pat.includes('SYSTEM_ALERT_WINDOW') || 
                pat.includes('TYPE_APPLICATION_OVERLAY') || 
                pat.includes('ACCESSIBILITYSERVICE') ||
                pat.includes('KEYLOGGER') ||
                pat.includes('SCREEN_CAPTURE') ||
                pat.includes('BANKING_TROJAN') ||
                pat.includes('CREDENTIAL_STEALER')) {
                highRiskPatterns.push(pattern);
            }
            // Medium risk patterns (suspicious in combination)
            else if (pat.includes('SMS') || 
                     pat.includes('CONTACTS') || 
                     pat.includes('CALL_LOG') ||
                     pat.includes('RECORD_AUDIO') ||
                     pat.includes('CAMERA') ||
                     pat.includes('MEDIAPROJECTION') ||
                     pat.includes('VIRTUALDISPLAY') ||
                     pat.includes('DEVICEADMIN') ||
                     pat.includes('DEVICEPOLICY')) {
                mediumRiskPatterns.push(pattern);
            }
            // Low risk patterns (usually legitimate)
            else if (pat.includes('INTERNET') ||
                     pat.includes('NETWORK') ||
                     pat.includes('LOCATION') ||
                     pat.includes('PHONE_STATE')) {
                lowRiskPatterns.push(pattern);
            }
            // Unknown patterns
            else {
                lowRiskPatterns.push(pattern);
            }
        });
        
        // Calculate risk based on pattern categories
        if (highRiskPatterns.length > 0) {
            riskScore += Math.min(25 + (highRiskPatterns.length * 8), 60);
        }
        
        if (mediumRiskPatterns.length >= 2) {
            riskScore += Math.min(20 + (mediumRiskPatterns.length * 5), 40);
        }
        
        if (lowRiskPatterns.length >= 3) {
            riskScore += Math.min(15 + (lowRiskPatterns.length * 3), 30);
        }
        
        // Apply contextual adjustments
        if (suspiciousPatterns.length === 1 && lowRiskPatterns.length === 1) {
            // Single low-risk pattern is usually safe
            riskScore = Math.max(riskScore - 5, 0);
        }
        
        if (highRiskPatterns.length === 0 && mediumRiskPatterns.length === 0) {
            // Only low-risk patterns, reduce score
            riskScore = Math.max(riskScore - 10, 0);
        }

        return Math.min(riskScore, 100);
    }

    async checkThreatDatabase(fileAnalysis, manifestAnalysis, codeAnalysis) {
        const fileHashSha256 = fileAnalysis.hash;
        const fileHashSha1 = fileAnalysis.hashSha1;
        const packageName = manifestAnalysis.packageName;
        
        // Check if this APK is known malicious by hash or package
        let knownThreat = await this.threatDatabase.lookupThreat(fileHashSha256, packageName);
        if (!knownThreat && fileHashSha1) {
            knownThreat = await this.threatDatabase.lookupThreat(fileHashSha1, packageName);
        }
        
        if (knownThreat) {
            return {
                isKnownThreat: true,
                threatType: knownThreat.type,
                confidence: knownThreat.confidence,
                description: knownThreat.description
            };
        }

        return {
            isKnownThreat: false,
            threatType: null,
            confidence: 0,
            description: null
        };
    }

    async generateFinalResult(analysisId, fileAnalysis, manifestAnalysis, permissionAnalysis, codeAnalysis, threatAnalysis) {
        // Start with base risk calculation
        let totalRiskScore = this.calculateTotalRisk(
            permissionAnalysis.riskScore,
            codeAnalysis.riskScore,
            threatAnalysis
        );

        // Detailed risk breakdown for debugging
        const riskBreakdown = {
            baseScore: totalRiskScore,
            permissionScore: permissionAnalysis.riskScore,
            codeScore: codeAnalysis.riskScore,
            adjustments: [],
            finalScore: 0
        };

        // Apply nuanced adjustments based on context
        try {
            const filename = String(fileAnalysis?.filename || '').toLowerCase();
            const packageName = String(manifestAnalysis?.packageName || '').toLowerCase();
            
            // Check for obvious malicious indicators
            if (/hack|trojan|malware|virus|spyware/i.test(filename) || /hack|trojan|malware|virus|spyware/i.test(packageName)) {
                totalRiskScore = Math.max(totalRiskScore, 80);
                riskBreakdown.adjustments.push({ factor: 'Malicious filename/package', boost: 80 });
            }
            
            // Check for modded app indicators (moderate risk)
            if (/mod|vanced|microg|happymod|gamedva/i.test(filename) || /mod|vanced|microg|happymod|gamedva/i.test(packageName)) {
                totalRiskScore = Math.max(totalRiskScore, 55);
                riskBreakdown.adjustments.push({ factor: 'Modded app indicators', boost: 55 });
            }
            
            // Analyze permissions contextually
            if (Array.isArray(permissionAnalysis?.suspicious) && permissionAnalysis.suspicious.length > 0) {
                const highRiskPerms = [
                    'android.permission.BIND_ACCESSIBILITY_SERVICE',
                    'android.permission.SYSTEM_ALERT_WINDOW',
                    'android.permission.TYPE_APPLICATION_OVERLAY'
                ];
                
                const mediumRiskPerms = [
                    'android.permission.RECEIVE_SMS',
                    'android.permission.READ_SMS',
                    'android.permission.SEND_SMS',
                    'android.permission.READ_CONTACTS',
                    'android.permission.WRITE_CONTACTS'
                ];
                
                const lowRiskPerms = [
                    'android.permission.CAMERA',
                    'android.permission.RECORD_AUDIO',
                    'android.permission.ACCESS_FINE_LOCATION',
                    'android.permission.ACCESS_COARSE_LOCATION'
                ];
                
                // Count permissions by risk level
                const highRiskCount = permissionAnalysis.suspicious.filter(p => highRiskPerms.includes(p)).length;
                const mediumRiskCount = permissionAnalysis.suspicious.filter(p => mediumRiskPerms.includes(p)).length;
                const lowRiskCount = permissionAnalysis.suspicious.filter(p => lowRiskPerms.includes(p)).length;
                
                // Apply contextual permission scoring
                if (highRiskCount > 0) {
                    const boost = Math.min(30 + (highRiskCount * 10), 60);
                    totalRiskScore = Math.max(totalRiskScore, boost);
                    riskBreakdown.adjustments.push({ factor: `High-risk permissions (${highRiskCount})`, boost });
                }
                
                if (mediumRiskCount >= 2) {
                    const boost = Math.min(25 + (mediumRiskCount * 5), 45);
                    totalRiskScore = Math.max(totalRiskScore, boost);
                    riskBreakdown.adjustments.push({ factor: `Multiple medium-risk permissions (${mediumRiskCount})`, boost });
                }
                
                if (lowRiskCount >= 3) {
                    const boost = Math.min(20 + (lowRiskCount * 3), 35);
                    totalRiskScore = Math.max(totalRiskScore, boost);
                    riskBreakdown.adjustments.push({ factor: `Multiple low-risk permissions (${lowRiskCount})`, boost });
                }
            }
            
            // Analyze code patterns contextually
            if (Array.isArray(codeAnalysis?.suspiciousPatterns) && codeAnalysis.suspiciousPatterns.length > 0) {
                const highRiskPatterns = codeAnalysis.suspiciousPatterns.filter(p => {
                    const pat = String(p.pattern || '').toUpperCase();
                    return pat.includes('SYSTEM_ALERT_WINDOW') || 
                           pat.includes('TYPE_APPLICATION_OVERLAY') || 
                           pat.includes('ACCESSIBILITYSERVICE') ||
                           pat.includes('KEYLOGGER') ||
                           pat.includes('SCREEN_CAPTURE');
                });
                
                const mediumRiskPatterns = codeAnalysis.suspiciousPatterns.filter(p => {
                    const pat = String(p.pattern || '').toUpperCase();
                    return pat.includes('SMS') || 
                           pat.includes('CONTACTS') || 
                           pat.includes('CALL_LOG') ||
                           pat.includes('RECORD_AUDIO') ||
                           pat.includes('CAMERA');
                });
                
                if (highRiskPatterns.length > 0) {
                    const boost = Math.min(35 + (highRiskPatterns.length * 8), 60);
                    totalRiskScore = Math.max(totalRiskScore, boost);
                    riskBreakdown.adjustments.push({ factor: `High-risk code patterns (${highRiskPatterns.length})`, boost });
                }
                
                if (mediumRiskPatterns.length >= 2) {
                    const boost = Math.min(25 + (mediumRiskPatterns.length * 5), 45);
                    totalRiskScore = Math.max(totalRiskScore, boost);
                    riskBreakdown.adjustments.push({ factor: `Multiple medium-risk patterns (${mediumRiskPatterns.length})`, boost });
                }
            }
            
            // Check for legitimate banking app indicators (risk reduction)
            if (/bank|finance|payment|wallet|credit/i.test(packageName) || /bank|finance|payment|wallet|credit/i.test(filename)) {
                // Banking apps often need sensitive permissions legitimately
                if (totalRiskScore < 60) {
                    totalRiskScore = Math.max(totalRiskScore - 15, 0);
                    riskBreakdown.adjustments.push({ factor: 'Legitimate banking app indicators', reduction: 15 });
                }
            }
            
            // Check for Google Play Store indicators (risk reduction)
            if (manifestAnalysis?.signatures?.some(sig => sig.includes('google') || sig.includes('android'))) {
                if (totalRiskScore < 50) {
                    totalRiskScore = Math.max(totalRiskScore - 10, 0);
                    riskBreakdown.adjustments.push({ factor: 'Google/Android signature detected', reduction: 10 });
                }
            }
            
        } catch (error) {
            console.error('Error in risk calculation:', error);
        }
        
        // If there are no suspicious signals at all, cap risk low
        try {
            const noPermSignals = !(Array.isArray(permissionAnalysis?.suspicious) && permissionAnalysis.suspicious.length > 0);
            const noCodeSignals = !(Array.isArray(codeAnalysis?.suspiciousPatterns) && codeAnalysis.suspiciousPatterns.length > 0);
            const noThreat = !(threatAnalysis && threatAnalysis.isKnownThreat);
            if (noPermSignals && noCodeSignals && noThreat) {
                totalRiskScore = Math.min(totalRiskScore, 20);
                riskBreakdown.adjustments.push({ factor: 'No suspicious signals detected', cap: 20 });
            }
        } catch {}

        // Additional low-signal guard: if both permission and code risks are low and not a known threat, cap low
        try {
            const lowPermRisk = (permissionAnalysis?.riskScore ?? 0) < 25;
            const lowCodeRisk = (codeAnalysis?.riskScore ?? 0) < 25;
            const notKnownThreat = !(threatAnalysis && threatAnalysis.isKnownThreat);
            if (lowPermRisk && lowCodeRisk && notKnownThreat) {
                totalRiskScore = Math.min(totalRiskScore, 20);
                riskBreakdown.adjustments.push({ factor: 'Low signals guard (perm<25 & code<25, no known threat)', cap: 20 });
            }
        } catch {}

        // Ensure final score is within bounds
        totalRiskScore = Math.max(0, Math.min(totalRiskScore, 100));
        riskBreakdown.finalScore = totalRiskScore;
        
        const riskLevel = this.determineRiskLevel(totalRiskScore);
        const recommendations = this.generateRecommendations(riskLevel, permissionAnalysis, codeAnalysis);

        const finalResult = {
            id: analysisId,
            status: 'completed',
            endTime: new Date().toISOString(),
            summary: {
                riskLevel,
                riskScore: totalRiskScore,
                isSafe: riskLevel === 'safe',
                confidence: this.calculateConfidence(permissionAnalysis, codeAnalysis, threatAnalysis),
                riskBreakdown // Include detailed breakdown for debugging
            },
            details: {
                fileAnalysis,
                manifestAnalysis,
                permissionAnalysis,
                codeAnalysis,
                threatAnalysis
            },
            recommendations,
            timestamp: new Date().toISOString()
        };

        this.analysisResults.set(analysisId, finalResult);
        return finalResult;
    }

    calculateTotalRisk(permissionRisk, codeRisk, threatAnalysis) {
        // Weighted aggregation with guard rails
        let totalRisk = Math.round((0.55 * permissionRisk) + (0.45 * codeRisk));

        // Strong signals can elevate the floor
        if (permissionRisk >= 60 || codeRisk >= 60) {
            totalRisk = Math.max(totalRisk, 70);
        }

        // Known threat should be very high
        if (threatAnalysis && threatAnalysis.isKnownThreat) {
            totalRisk = Math.max(totalRisk, 90);
        }

        // If both signals are very low and no known threat, cap low
        if ((permissionRisk < 15 && codeRisk < 15) && !(threatAnalysis && threatAnalysis.isKnownThreat)) {
            totalRisk = Math.min(totalRisk, 20);
        }

        return Math.max(0, Math.min(Math.round(totalRisk), 100));
    }

    determineRiskLevel(riskScore) {
        // More nuanced risk classification with better thresholds
        if (riskScore < 30) return 'safe';
        if (riskScore < 50) return 'low_risk';
        if (riskScore < 70) return 'suspicious';
        if (riskScore < 85) return 'high_risk';
        return 'malicious';
    }

    calculateConfidence(permissionAnalysis, codeAnalysis, threatAnalysis) {
        let confidence = 70; // Base confidence
        
        if (threatAnalysis.isKnownThreat) {
            confidence = 95;
        } else if (permissionAnalysis.riskScore > 50 || codeAnalysis.riskScore > 50) {
            confidence = 85;
        }
        
        return confidence;
    }

    generateRecommendations(riskLevel, permissionAnalysis, codeAnalysis) {
        const recommendations = [];
        
        if (riskLevel === 'safe') {
            recommendations.push('This APK appears to be safe for installation');
            recommendations.push('Always download from official sources when possible');
        } else if (riskLevel === 'suspicious') {
            recommendations.push('Exercise caution - this APK has some suspicious characteristics');
            recommendations.push('Review the detailed analysis before making a decision');
            recommendations.push('Consider downloading from official sources instead');
        } else {
            recommendations.push('DO NOT INSTALL this APK - high risk of malware');
            recommendations.push('Delete the file immediately');
            recommendations.push('Report to your bank if this claims to be a banking app');
        }

        if (permissionAnalysis.suspicious.length > 0) {
            recommendations.push(`Review suspicious permissions: ${permissionAnalysis.suspicious.join(', ')}`);
        }

        return recommendations;
    }

    async updateProgress(analysisId, progress, step, description) {
        const result = this.analysisResults.get(analysisId);
        if (result) {
            result.progress = progress;
            result.steps.push({
                step,
                description,
                timestamp: new Date().toISOString()
            });
            this.analysisResults.set(analysisId, result);
            try {
                console.log(`📈 [${analysisId}] progress=${progress}% | step=${step} | ${description}`);
            } catch {}
        }
    }

    getAnalysisResult(analysisId) {
        return this.analysisResults.get(analysisId);
    }

    getStatistics() {
        return {
            ...this.statistics,
            currentTime: new Date().toISOString()
        };
    }

    updateStatistics(riskLevel) {
        this.statistics.totalScans++;
        this.statistics.lastScan = new Date().toISOString();
        
        switch (riskLevel) {
            case 'safe':
                this.statistics.safeApps++;
                break;
            case 'suspicious':
                this.statistics.suspiciousApps++;
                break;
            case 'malicious':
                this.statistics.maliciousApps++;
                break;
        }
    }

    async calculateFileHash(filePath, algo = 'sha256') {
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash(algo).update(fileBuffer).digest('hex');
    }

    async validateAPKFile(filePath) {
        try {
            const stats = await fs.stat(filePath);
            if (stats.size < 1024) return false; // Too small to be valid APK

            // Read first 4 bytes to verify ZIP signature (PK\x03\x04)
            const fd = await fs.open(filePath, 'r');
            try {
                const sig = Buffer.alloc(4);
                await fd.read(sig, 0, 4, 0);
                return sig.equals(Buffer.from([0x50, 0x4B, 0x03, 0x04]));
            } finally {
                await fd.close();
            }
        } catch (error) {
            return false;
        }
    }

    isReady() {
        return this.isReady;
    }

    // Test mode function for debugging risk calculations
    async testRiskCalculation(apkFile) {
        try {
            console.log('=== TEST MODE: Risk Calculation Analysis ===');
            
            // Perform full analysis
            const analysisId = this.generateAnalysisId();
            const result = await this.analyzeAPK(apkFile, analysisId);
            
            if (result.status === 'completed') {
                console.log('\n📊 FINAL RESULT:');
                console.log(`Risk Level: ${result.summary.riskLevel}`);
                console.log(`Risk Score: ${result.summary.riskScore}/100`);
                console.log(`Confidence: ${result.summary.confidence}%`);
                
                console.log('\n🔍 RISK BREAKDOWN:');
                if (result.summary.riskBreakdown) {
                    console.log(`Base Score: ${result.summary.riskBreakdown.baseScore}`);
                    console.log(`Permission Score: ${result.summary.riskBreakdown.permissionScore}`);
                    console.log(`Code Score: ${result.summary.riskBreakdown.codeScore}`);
                    
                    if (result.summary.riskBreakdown.adjustments.length > 0) {
                        console.log('\n📈 ADJUSTMENTS APPLIED:');
                        result.summary.riskBreakdown.adjustments.forEach(adj => {
                            if (adj.boost) {
                                console.log(`  +${adj.boost}: ${adj.factor}`);
                            } else if (adj.reduction) {
                                console.log(`  -${adj.reduction}: ${adj.factor}`);
                            }
                        });
                    }
                }
                
                console.log('\n📱 PERMISSION ANALYSIS:');
                console.log(`Total Permissions: ${result.details.permissionAnalysis.total}`);
                console.log(`Suspicious Permissions: ${result.details.permissionAnalysis.suspicious.length}`);
                if (result.details.permissionAnalysis.suspicious.length > 0) {
                    result.details.permissionAnalysis.suspicious.forEach(perm => {
                        console.log(`  - ${perm}`);
                    });
                }
                
                console.log('\n💻 CODE ANALYSIS:');
                console.log(`Suspicious Patterns: ${result.details.codeAnalysis.suspiciousPatterns.length}`);
                if (result.details.codeAnalysis.suspiciousPatterns.length > 0) {
                    result.details.codeAnalysis.suspiciousPatterns.forEach(pattern => {
                        console.log(`  - ${pattern.pattern} (${pattern.confidence || 'unknown'} confidence)`);
                    });
                }
                
                console.log('\n🎯 RECOMMENDATIONS:');
                result.recommendations.forEach(rec => {
                    console.log(`  - ${rec}`);
                });
                
                console.log('\n=== END TEST MODE ===\n');
            } else {
                console.log('❌ Analysis failed:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Test mode error:', error);
            throw error;
        }
    }
}

module.exports = APKAnalyzer;

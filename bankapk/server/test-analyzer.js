const APKAnalyzer = require('./apk-analyzer/analyzer');
const ThreatDatabase = require('./threat-database/database');

async function testAnalyzer() {
    console.log('🧪 Testing APK Analyzer...');
    
    try {
        // Initialize services
        const threatDatabase = new ThreatDatabase();
        const apkAnalyzer = new APKAnalyzer(threatDatabase);
        
        // Wait for database to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ Services initialized');
        console.log('📊 Threat Database ready:', threatDatabase.isReady);
        console.log('🔍 APK Analyzer ready:', apkAnalyzer.isReady());
        
        // Test dependency check
        console.log('\n🔧 Testing dependency check...');
        const deps = apkAnalyzer.checkDependencies();
        console.log('Dependencies available:', deps);
        
        console.log('\n✅ All tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testAnalyzer();
}

module.exports = { testAnalyzer };

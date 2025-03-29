// Validation engine using the Agno framework
import * as fs from 'fs';
import * as path from 'path';
console.log('Loading validation module...');
// Use path.resolve to get absolute path to the rules file
const rulesPath = path.resolve(process.cwd(), 'src/validation/validationRules.json');
console.log('Attempting to load validation rules from:', rulesPath);
let validationRules;
try {
    if (fs.existsSync(rulesPath)) {
        const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
        console.log('Rules file content length:', rulesContent.length);
        validationRules = JSON.parse(rulesContent);
        console.log('Successfully parsed validation rules. Found', validationRules.length, 'rules');
    }
    else {
        console.error('CRITICAL ERROR: Rules file not found at path:', rulesPath);
        validationRules = [];
    }
}
catch (error) {
    console.error('CRITICAL ERROR: Failed to load validation rules:');
    console.error(error instanceof Error ? error.stack : String(error));
    validationRules = [];
}
const filePresenceValidator = (files) => {
    console.log('Checking file presence for:', files);
    try {
        const exists = files.some(file => {
            const fileExists = fs.existsSync(file);
            console.log(`  - File ${file}: ${fileExists ? 'EXISTS' : 'NOT FOUND'}`);
            return fileExists;
        });
        return exists;
    }
    catch (error) {
        console.error('ERROR in filePresenceValidator:', error);
        return false;
    }
};
const regexCheckValidator = (filePath, pattern) => {
    console.log(`Checking regex pattern ${pattern} in file: ${filePath}`);
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`  - File ${filePath} does not exist, skipping regex check`);
            return false;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const matches = pattern.test(content);
        console.log(`  - Regex match result: ${matches ? 'FOUND' : 'NOT FOUND'}`);
        return matches;
    }
    catch (error) {
        console.error('ERROR in regexCheckValidator:', error);
        return false;
    }
};
const codebaseGrepValidator = (pattern) => {
    console.log(`Searching codebase for pattern: ${pattern}`);
    try {
        const files = fs.readdirSync('.', { withFileTypes: true });
        console.log(`  - Found ${files.length} files/directories to check`);
        for (const file of files) {
            if (file.isFile()) {
                try {
                    console.log(`  - Checking file: ${file.name}`);
                    const content = fs.readFileSync(file.name, 'utf-8');
                    if (pattern.test(content)) {
                        console.log(`  - MATCH FOUND in ${file.name}`);
                        return true;
                    }
                }
                catch (fileError) {
                    console.error(`  - ERROR reading file ${file.name}:`, fileError);
                    // Continue to next file
                }
            }
        }
        console.log('  - No matches found in any files');
        return false;
    }
    catch (error) {
        console.error('ERROR in codebaseGrepValidator:', error);
        return false;
    }
};
const executeCheck = async (rule) => {
    console.log(`\n==== EXECUTING CHECK: ${rule.name} (${rule.type}) ====`);
    try {
        switch (rule.type) {
            case 'filePresence':
                console.log(`Running filePresence check for: ${rule.name}`);
                const fileResult = filePresenceValidator(rule.files);
                console.log(`filePresence check result: ${fileResult ? 'PASSED' : 'FAILED'}`);
                return fileResult;
            case 'placeholder':
                console.log(`Running placeholder check: ${rule.name}`);
                console.log(`Placeholder message: ${rule.message}`);
                return true;
            case 'customCommand':
                console.log(`Running custom command: ${rule.command}`);
                try {
                    // Use Node.js built-in module without require
                    console.log(`Using child_process module...`);
                    // In ESM, we can use the Node.js built-in modules directly
                    // This is a workaround to avoid the async import
                    const { spawnSync } = await import('child_process');
                    console.log(`Executing command: ${rule.command}`);
                    // Use spawnSync instead of execSync to get the exit code
                    const result = spawnSync('sh', ['-c', rule.command], { stdio: 'inherit' });
                    console.log(`Command executed with exit code: ${result.status}`);
                    // Exit code 0 means full compliance
                    if (result.status === 0) {
                        console.log(`Command executed successfully (full compliance)`);
                        return true;
                    }
                    // Exit code 2 means partial compliance
                    else if (result.status === 2) {
                        console.log(`Command executed with partial compliance`);
                        // Store partial compliance status in the rule object for later use
                        rule.partialCompliance = true;
                        return false;
                    }
                    // Any other exit code means no compliance
                    else {
                        console.log(`Command failed (no compliance)`);
                        return false;
                    }
                }
                catch (error) {
                    if (error instanceof Error && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND') {
                        console.error(`FAILED TO IMPORT child_process module:`);
                    }
                    else {
                        console.error(`COMMAND EXECUTION FAILED: ${rule.command}`);
                    }
                    console.error(error instanceof Error ? error.stack : String(error));
                    return false;
                }
            default:
                console.error(`UNKNOWN RULE TYPE: ${rule.type}`);
                return false;
        }
    }
    catch (error) {
        console.error(`ERROR EXECUTING CHECK ${rule.name}:`);
        console.error(error instanceof Error ? error.stack : String(error));
        return false;
    }
};
export const validate = async () => {
    console.log('\n===============================================');
    console.log('VALIDATION ENGINE INITIALIZED');
    console.log('===============================================');
    if (!validationRules || validationRules.length === 0) {
        console.error('No validation rules found or rules failed to load. Aborting validation.');
        return;
    }
    console.log(`Found ${validationRules.length} validation rules to process`);
    console.log('Starting validation process...');
    try {
        // Process rules sequentially with async/await
        const results = [];
        for (const rule of validationRules) {
            console.log(`\n----- Processing rule: ${rule.name} -----`);
            try {
                // Await the async executeCheck function
                const passed = await executeCheck(rule);
                console.log(`----- Result for ${rule.name}: ${passed ? 'PASSED ✓' : 'FAILED ✗'} -----`);
                results.push({
                    name: rule.name,
                    passed: passed
                });
            }
            catch (ruleError) {
                console.error(`ERROR processing rule ${rule.name}:`, ruleError);
                results.push({
                    name: rule.name,
                    passed: false
                });
            }
        }
        console.log('\n===============================================');
        console.log('VALIDATION RESULTS SUMMARY');
        console.log('===============================================');
        const passedCount = results.filter(r => r.passed).length;
        const failedCount = results.length - passedCount;
        console.log(`Total rules: ${results.length}`);
        console.log(`Passed: ${passedCount}`);
        console.log(`Failed: ${failedCount}`);
        console.log('\nDetailed results:');
        results.forEach((result, index) => {
            const rule = validationRules[index];
            if (result.passed) {
                console.log(`✓ PASSED: ${result.name}`);
                // Display full compliance status message if available
                if (rule && rule.statusMessages && rule.statusMessages.fullCompliance) {
                    console.log(`  STATUS: ${rule.statusMessages.fullCompliance}`);
                }
            }
            else {
                console.error(`✗ FAILED: ${result.name}`);
                // Display remedy if available
                if (rule && rule.remedy) {
                    console.error(`  REMEDY: ${rule.remedy}`);
                }
                // Display user instructions if available
                if (rule && rule.userInstructions) {
                    console.error(`  USER INSTRUCTIONS: ${rule.userInstructions}`);
                }
                // Check if this is a partial compliance case
                if (rule && rule.partialCompliance && rule.statusMessages && rule.statusMessages.partialCompliance) {
                    console.error(`  STATUS: ${rule.statusMessages.partialCompliance}`);
                }
                // Otherwise display no compliance status message if available
                else if (rule && rule.statusMessages && rule.statusMessages.noCompliance) {
                    console.error(`  STATUS: ${rule.statusMessages.noCompliance}`);
                }
            }
        });
        console.log('\n===============================================');
        return results;
    }
    catch (error) {
        console.error('\nCRITICAL ERROR DURING VALIDATION:');
        console.error(error instanceof Error ? error.stack : String(error));
        return [];
    }
};

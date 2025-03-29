// Validation engine using the Agno framework
import * as fs from 'fs';
import * as path from 'path';

import { ValidationResult } from '../types/validationTypes';

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
    } else {
        console.error('CRITICAL ERROR: Rules file not found at path:', rulesPath);
        validationRules = [];
    }
} catch (error: unknown) {
    console.error('CRITICAL ERROR: Failed to load validation rules:');
    console.error(error instanceof Error ? error.stack : String(error));
    validationRules = [];
}

const filePresenceValidator = (files: string[], rule?: any): boolean => {
    console.log('Checking file presence for:', files);
    try {
        // Initialize findings array if rule is provided
        if (rule && !(rule as any).findings) {
            (rule as any).findings = [];
        }

        // Track missing files
        const missingFiles: string[] = [];

        const exists = files.some(file => {
            const fileExists = fs.existsSync(file);
            console.log(`  - File ${file}: ${fileExists ? 'EXISTS' : 'NOT FOUND'}`);

            if (!fileExists) {
                missingFiles.push(file);
            }

            return fileExists;
        });

        // Add detailed findings about missing files
        if (rule && missingFiles.length > 0) {
            (rule as any).findings.push(`Missing files: ${missingFiles.join(', ')}`);
        }

        return exists;
    } catch (error: unknown) {
        console.error('ERROR in filePresenceValidator:', error);

        // Add error to findings if rule is provided
        if (rule) {
            (rule as any).findings.push(`Error checking file presence: ${error instanceof Error ? error.message : String(error)}`);
        }

        return false;
    }
};

const regexCheckValidator = (filePath: string, pattern: RegExp, rule?: any): boolean => {
    console.log(`Checking regex pattern ${pattern} in file: ${filePath}`);
    try {
        // Initialize findings array if rule is provided
        if (rule && !(rule as any).findings) {
            (rule as any).findings = [];
        }

        if (!fs.existsSync(filePath)) {
            console.log(`  - File ${filePath} does not exist, skipping regex check`);
            if (rule) {
                (rule as any).findings.push(`File not found: ${filePath}`);
            }
            return false;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const matches = pattern.test(content);
        console.log(`  - Regex match result: ${matches ? 'FOUND' : 'NOT FOUND'}`);

        if (!matches && rule) {
            (rule as any).findings.push(`Pattern "${pattern}" not found in file: ${filePath}`);
        }

        return matches;
    } catch (error: unknown) {
        console.error('ERROR in regexCheckValidator:', error);

        // Add error to findings if rule is provided
        if (rule) {
            (rule as any).findings.push(`Error checking regex pattern: ${error instanceof Error ? error.message : String(error)}`);
        }

        return false;
    }
};

const codebaseGrepValidator = (pattern: RegExp, rule?: any): boolean => {
    console.log(`Searching codebase for pattern: ${pattern}`);
    try {
        // Initialize findings array if rule is provided
        if (rule && !(rule as any).findings) {
            (rule as any).findings = [];
        }

        const files = fs.readdirSync('.', { withFileTypes: true });
        console.log(`  - Found ${files.length} files/directories to check`);

        // Track files with errors
        const errorFiles: string[] = [];

        for (const file of files) {
            if (file.isFile()) {
                try {
                    console.log(`  - Checking file: ${file.name}`);
                    const content = fs.readFileSync(file.name, 'utf-8');
                    if (pattern.test(content)) {
                        console.log(`  - MATCH FOUND in ${file.name}`);
                        if (rule) {
                            (rule as any).findings.push(`Pattern match found in file: ${file.name}`);
                        }
                        return true;
                    }
                } catch (fileError: unknown) {
                    console.error(`  - ERROR reading file ${file.name}:`, fileError);
                    errorFiles.push(file.name);
                    // Continue to next file
                }
            }
        }

        console.log('  - No matches found in any files');

        if (rule) {
            (rule as any).findings.push(`Pattern "${pattern}" not found in any files`);

            if (errorFiles.length > 0) {
                (rule as any).findings.push(`Errors occurred while reading files: ${errorFiles.join(', ')}`);
            }
        }

        return false;
    } catch (error: unknown) {
        console.error('ERROR in codebaseGrepValidator:', error);

        // Add error to findings if rule is provided
        if (rule) {
            (rule as any).findings.push(`Error searching codebase: ${error instanceof Error ? error.message : String(error)}`);
        }

        return false;
    }
};

const executeCheck = async (rule: any): Promise<boolean> => {
    console.log(`\n==== EXECUTING CHECK: ${rule.name} (${rule.type}) ====`);

    try {
        switch (rule.type) {
            case 'filePresence':
                console.log(`Running filePresence check for: ${rule.name}`);
                const fileResult = filePresenceValidator(rule.files, rule);
                console.log(`filePresence check result: ${fileResult ? 'PASSED' : 'FAILED'}`);
                return fileResult;

            case 'regexCheck':
                console.log(`Running regex check for: ${rule.name}`);
                const regexResult = regexCheckValidator(rule.filePath, rule.pattern, rule);
                console.log(`Regex check result: ${regexResult ? 'PASSED' : 'FAILED'}`);
                return regexResult;

            case 'codebaseGrep':
                console.log(`Running codebase grep for: ${rule.name}`);
                const grepResult = codebaseGrepValidator(rule.pattern, rule);
                console.log(`Codebase grep result: ${grepResult ? 'PASSED' : 'FAILED'}`);
                return grepResult;

            case 'placeholder':
                console.log(`Running placeholder check: ${rule.name}`);
                console.log(`Placeholder message: ${rule.message}`);

                // Initialize findings array if it doesn't exist
                if (!(rule as any).findings) {
                    (rule as any).findings = [];
                }

                // Add placeholder message to findings
                (rule as any).findings.push(`Placeholder: ${rule.message}`);
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

                    // Initialize findings array if it doesn't exist
                    if (!(rule as any).findings) {
                        (rule as any).findings = [];
                    }

                    // Exit code 0 means full compliance
                    if (result.status === 0) {
                        console.log(`Command executed successfully (full compliance)`);
                        return true;
                    }
                    // Exit code 2 means partial compliance
                    else if (result.status === 2) {
                        console.log(`Command executed with partial compliance`);
                        // Store partial compliance status in the rule object for later use
                        (rule as any).partialCompliance = true;
                        (rule as any).findings.push(`Command exited with partial compliance (exit code 2)`);
                        return false;
                    }
                    // Any other exit code means no compliance
                    else {
                        console.log(`Command failed (no compliance)`);
                        (rule as any).findings.push(`Command failed with exit code ${result.status}`);
                        return false;
                    }
                } catch (error: unknown) {
                    // Initialize findings array if it doesn't exist
                    if (!(rule as any).findings) {
                        (rule as any).findings = [];
                    }

                    if (error instanceof Error && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND') {
                        console.error(`FAILED TO IMPORT child_process module:`);
                        (rule as any).findings.push(`Failed to import child_process module: ${error.message}`);
                    } else {
                        console.error(`COMMAND EXECUTION FAILED: ${rule.command}`);
                        (rule as any).findings.push(`Command execution failed: ${error instanceof Error ? error.message : String(error)}`);
                    }
                    console.error(error instanceof Error ? error.stack : String(error));
                    return false;
                }

            default:
                console.error(`UNKNOWN RULE TYPE: ${rule.type}`);

                // Initialize findings array if it doesn't exist
                if (!(rule as any).findings) {
                    (rule as any).findings = [];
                }

                // Add unknown rule type to findings
                (rule as any).findings.push(`Unknown rule type: ${rule.type}`);
                return false;
        }
    } catch (error: unknown) {
        console.error(`ERROR EXECUTING CHECK ${rule.name}:`);
        console.error(error instanceof Error ? error.stack : String(error));

        // Initialize findings array if it doesn't exist
        if (!(rule as any).findings) {
            (rule as any).findings = [];
        }

        // Add error to findings
        (rule as any).findings.push(`Error executing check: ${error instanceof Error ? error.message : String(error)}`);
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
        const results: ValidationResult[] = [];

        for (const rule of validationRules) {
            console.log(`\n----- Processing rule: ${rule.name} -----`);
            try {
                // Await the async executeCheck function
                const passed = await executeCheck(rule);
                console.log(`----- Result for ${rule.name}: ${passed ? 'PASSED ✓' : 'FAILED ✗'} -----`);
                // Initialize findings array
                const findings: string[] = [];

                // Add any findings from the rule execution
                if ((rule as any).findings && Array.isArray((rule as any).findings)) {
                    findings.push(...(rule as any).findings);
                }

                results.push({
                    name: rule.name,
                    passed: passed,
                    findings: findings
                });
            } catch (ruleError: unknown) {
                console.error(`ERROR processing rule ${rule.name}:`, ruleError);
                results.push({
                    name: rule.name,
                    passed: false,
                    findings: [`Error during validation: ${ruleError instanceof Error ? ruleError.message : String(ruleError)}`]
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
            } else {
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
                if (rule && (rule as any).partialCompliance && rule.statusMessages && rule.statusMessages.partialCompliance) {
                    console.error(`  STATUS: ${rule.statusMessages.partialCompliance}`);
                }
                // Otherwise display no compliance status message if available
                else if (rule && rule.statusMessages && rule.statusMessages.noCompliance) {
                    console.error(`  STATUS: ${rule.statusMessages.noCompliance}`);
                }

                // Display any findings if they exist
                if (result.findings && result.findings.length > 0) {
                    console.error(`  FINDINGS:`);
                    result.findings.forEach(finding => {
                        console.error(`    - ${finding}`);
                    });
                }
            }
        });

        console.log('\n===============================================');
        return results;
    } catch (error: unknown) {
        console.error('\nCRITICAL ERROR DURING VALIDATION:');
        console.error(error instanceof Error ? error.stack : String(error));
        return [];
    }
};

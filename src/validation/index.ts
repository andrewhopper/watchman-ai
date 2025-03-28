// Validation engine using the Agno framework
import fs from 'fs';

import { ValidationResult } from '../types/validationTypes';

const validationRules = JSON.parse(fs.readFileSync('src/validation/validationRules.json', 'utf-8'));

const filePresenceValidator = (files: string[]): boolean => {
    return files.some(file => fs.existsSync(file));
};

const regexCheckValidator = (filePath: string, pattern: RegExp): boolean => {
    if (!fs.existsSync(filePath)) return false;
    const content = fs.readFileSync(filePath, 'utf-8');
    return pattern.test(content);
};

const codebaseGrepValidator = (pattern: RegExp): boolean => {
    const files = fs.readdirSync('.', { withFileTypes: true });
    for (const file of files) {
        if (file.isFile()) {
            const content = fs.readFileSync(file.name, 'utf-8');
            if (pattern.test(content)) {
                return true;
            }
        }
    }
    return false;
};

const executeCheck = (rule: any): boolean => {
    switch (rule.type) {
        case 'filePresence':
            return filePresenceValidator(rule.files);
        case 'placeholder':
            console.log(rule.message);
            return true;
        case 'customCommand':
            try {
                const execSync = require('child_process').execSync;
                execSync(rule.command, { stdio: 'inherit' });
                return true;
            } catch (error) {
                console.error(`Command failed: ${rule.command}`);
                return false;
            }
        default:
            console.error(`Unknown rule type: ${rule.type}`);
            return false;
    }
};

export const validate = () => {
    console.log('Validation engine initialized');

    const results: ValidationResult[] = validationRules.map((rule: any) => ({
        name: rule.name,
        passed: executeCheck(rule)
    }));

    results.forEach(result => {
        if (result.passed) {
            console.log(`${result.name} is present.`);
        } else {
            console.error(`${result.name} is missing.`);
        }
    });
};

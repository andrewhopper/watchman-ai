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
  } else {
    console.error('CRITICAL ERROR: Rules file not found at path:', rulesPath);
    validationRules = [];
  }
} catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
        } catch (fileError) {
          console.error(`  - ERROR reading file ${file.name}:`, fileError);
          // Continue to next file
        }
      }
    }
    console.log('  - No matches found in any files');
    return false;
  } catch (error) {
    console.error('ERROR in codebaseGrepValidator:', error);
    return false;
  }
};
var executeCheck = function executeCheck(rule) {
  switch (rule.type) {
    case 'filePresence':
      return filePresenceValidator(rule.files);
    case 'placeholder':
      console.log(rule.message);
      return true;
    case 'customCommand':
      try {
        var spawnSync = require('child_process').spawnSync;
        var result = spawnSync('sh', ['-c', rule.command], {
          stdio: 'inherit'
        });
        console.log("Command executed with exit code: ".concat(result.status));

        // Exit code 0 means full compliance
        if (result.status === 0) {
          console.log("Command executed successfully (full compliance)");
          return true;
        }
        // Exit code 2 means partial compliance
        else if (result.status === 2) {
          console.log("Command executed with partial compliance");
          // Store partial compliance status in the rule object for later use
          rule.partialCompliance = true;
          return false;
        }
        // Any other exit code means no compliance
        else {
          console.log("Command failed (no compliance)");
          return false;
        }
      } catch (error) {
        console.error("Command failed: ".concat(rule.command));
        return false;
      }
    default:
      console.error("Unknown rule type: ".concat(rule.type));
      return false;
  }
};
var validate = function validate() {
  console.log('Validation engine initialized');
  console.log('Starting validation process...');
  var results = validationRules.map(function (rule) {
    console.log("Executing rule: ".concat(rule.name));
    var passed = executeCheck(rule);
    console.log("Result for ".concat(rule.name, ": ").concat(passed ? 'Passed' : 'Failed'));
    return {
      name: rule.name,
      passed: passed
    };
  });
  console.log('Validation Results:');
  results.forEach(function (result, index) {
    var rule = validationRules[index];
    if (result.passed) {
      console.log("".concat(result.name, " is present."));
      // Display full compliance status message if available
      if (rule && rule.statusMessages && rule.statusMessages.fullCompliance) {
        console.log("  STATUS: ".concat(rule.statusMessages.fullCompliance));
      }
    } else {
      console.error("".concat(result.name, " is missing."));

      // Display remedy if available
      if (rule && rule.remedy) {
        console.error("  REMEDY: ".concat(rule.remedy));
      }

      // Display user instructions if available
      if (rule && rule.userInstructions) {
        console.error("  USER INSTRUCTIONS: ".concat(rule.userInstructions));
      }

      // Check if this is a partial compliance case
      if (rule && rule.partialCompliance && rule.statusMessages && rule.statusMessages.partialCompliance) {
        console.error("  STATUS: ".concat(rule.statusMessages.partialCompliance));
      }
      // Otherwise display no compliance status message if available
      else if (rule && rule.statusMessages && rule.statusMessages.noCompliance) {
        console.error("  STATUS: ".concat(rule.statusMessages.noCompliance));
      }
    }
  });
};
exports.validate = validate;

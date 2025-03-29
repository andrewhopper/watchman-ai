"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
// Validation engine using the Agno framework
var fs = require("fs");
var validationRules = JSON.parse(fs.readFileSync('src/validation/validationRules.json', 'utf-8'));
var filePresenceValidator = function (files) {
    return files.some(function (file) { return fs.existsSync(file); });
};
var regexCheckValidator = function (filePath, pattern) {
    if (!fs.existsSync(filePath))
        return false;
    var content = fs.readFileSync(filePath, 'utf-8');
    return pattern.test(content);
};
var codebaseGrepValidator = function (pattern) {
    var files = fs.readdirSync('.', { withFileTypes: true });
    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
        var file = files_1[_i];
        if (file.isFile()) {
            var content = fs.readFileSync(file.name, 'utf-8');
            if (pattern.test(content)) {
                return true;
            }
        }
    }
    return false;
};
var executeCheck = function (rule) {
    switch (rule.type) {
        case 'filePresence':
            return filePresenceValidator(rule.files);
        case 'placeholder':
            console.log(rule.message);
            return true;
        case 'customCommand':
            try {
                var spawnSync = require('child_process').spawnSync;
                var result = spawnSync('sh', ['-c', rule.command], { stdio: 'inherit' });
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
            }
            catch (error) {
                console.error("Command failed: ".concat(rule.command));
                return false;
            }
        default:
            console.error("Unknown rule type: ".concat(rule.type));
            return false;
    }
};
var validate = function () {
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
        }
        else {
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

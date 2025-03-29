// Entry point for the CLI
import { validate } from '../validation/index.js';

console.log('=================================================');
console.log('Watchman AI Command-Line Validation Tool Starting');
console.log('=================================================');

// Self-executing async function to handle top-level await
(async () => {
    try {
        console.log('Current working directory:', process.cwd());
        console.log('Initializing validation process...');

        // Await the async validate function
        const results = await validate();

        console.log('Validation process completed');

        // Exit with appropriate code based on validation results
        if (results && Array.isArray(results)) {
            const failedCount = results.filter(r => !r.passed).length;
            if (failedCount > 0) {
                console.log(`Exiting with code 1 due to ${failedCount} failed validations`);
                process.exit(1);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('ERROR IN CLI EXECUTION:');
        console.error(error instanceof Error ? error.stack : String(error));
        process.exit(1);
    }
})();

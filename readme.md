# Watchman AI - Command-Line Validation Tool

## Overview
The Watchman AI Command-Line Validation Tool is designed to enforce rules, specifications, and standards in AI coding environments. It accepts a set of validation criteria and returns a comprehensive validation report.

## Features
- Accepts validation criteria via command-line arguments or configuration files.
- Processes criteria using the Agno framework.
- Generates detailed validation reports with errors and warnings.

## Setup Instructions
1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Build the Project:**
   ```bash
   npm run build
   ```

## Usage Guidelines
- **Run the Tool:**
  ```bash
  npm run dev -- [options]
  ```
  Replace `[options]` with the desired validation criteria.

## Architecture

```mermaid
graph TD;
    A[Validation Engine] --> B[File Presence Validator];
    A --> C[Regex Check Validator];
    A --> D[Codebase Grep Validator];
    A --> E[Custom Command Executor];
    B --> F[Validation Rules JSON];
    C --> F;
    D --> F;
    E --> F;
```

## Validation Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant ValidationEngine
    participant Validators
    User->>CLI: Run validation command
    CLI->>ValidationEngine: Initialize validation
    ValidationEngine->>Validators: Execute validation checks
    Validators-->>ValidationEngine: Return results
    ValidationEngine-->>CLI: Output validation report
    CLI-->>User: Display results
```

## Future Plans
- Expand into an MCP server, VS Code plugin, or daemon for real-time validation.
- Enhance scalability to handle large sets of validation criteria.

## License
This project is licensed under the MIT License.

## Contact
For questions or feedback, please contact Andrew Hopper at hopperab@gmail.com.

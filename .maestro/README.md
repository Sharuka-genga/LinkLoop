# Maestro E2E Tests

This folder contains Maestro flow definitions for end-to-end testing of the LinkLoop application.

## Structure

- **`common/`**: Reusable subflows (e.g., app setup, common login steps).
- **`flows/`**: Main test suites organized by feature area.
    - **`auth/`**: Authentication flows (login, signup, password reset).
    - **`navigation/`**: UI navigation tests (tabs, drawers, deep links).
    - **`features/`**: Core application functionality and business logic.
- **`config.yaml`**: Global Maestro configuration.

## Running Tests

To run all tests:
```bash
maestro test .maestro/flows/
```

To run a specific flow:
```bash
maestro test .maestro/flows/auth/login.yaml
```

## Useful Commands

- `maestro studio`: Launch the visual flow builder.
- `maestro hierarchy`: View the current screen's element hierarchy (useful for finding selectors).

## ADDED Requirements

### Requirement: Session activity categorization
The system SHALL support categorizing sessions into one of: `Debugging`, `New Feature`, `Refactoring`, `Documentation`, or `Validation`.

#### Scenario: Categorize session as Debugging
- **WHEN** a session is created with `effortType = "debugging"`
- **THEN** it is persisted with that category

#### Scenario: Default category is Validation
- **WHEN** no category is provided
- **THEN** the system SHALL attempt to auto-detect based on context or default to `Validation`

### Requirement: Effort distribution calculation
The system SHALL calculate the percentage of total sessions or total cost spent on each effort category over a given time period (default: 7 days).

#### Scenario: Effort distribution chart data
- **WHEN** requested for the dashboard
- **THEN** it returns percentages for all 5 categories (e.g., Debugging 40%, New Features 30%, etc.)

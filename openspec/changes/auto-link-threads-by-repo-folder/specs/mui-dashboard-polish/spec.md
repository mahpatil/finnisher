## ADDED Requirements

### Requirement: Modern Material UI Dashboard Layout
The web dashboard SHALL use a high-density, modern Material UI v9 layout with improved typography and spacing.

#### Scenario: Dashboard uses Container with maxWidth md
- **WHEN** the dashboard is rendered
- **THEN** it uses an MUI `Container` component with `maxWidth="md"` to center content

#### Scenario: Professional Header with Logo and Action
- **WHEN** the dashboard header is rendered
- **THEN** it displays "Finnisher" in a bold h5 typography
- **AND** it provides a prominent "Add Thread" button with a plus icon

### Requirement: Enhanced Thread Cards
The `ThreadCard` component SHALL use MUI `Card` components with subtle elevation and clear action areas.

#### Scenario: Thread card shows status indicators
- **WHEN** a thread card is rendered
- **THEN** it uses color-coded chips or icons to indicate status (Active, Waiting, Stalled)
- **AND** it displays the `nextAction` prominently if present

### Requirement: Responsive Session History
The `SessionCard` component SHALL display session details in a compact, readable format.

#### Scenario: Session card shows repo and folder context
- **WHEN** a session card is rendered
- **THEN** it displays the folder name and repository URL (if available) as metadata
- **AND** it uses secondary typography for these details

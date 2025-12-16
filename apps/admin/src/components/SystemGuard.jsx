import React from 'react';

// In D1 architecture, the database is pre-initialized via schema.sql
// No need to check system status anymore
export default function SystemGuard({ children }) {
    return children;
}

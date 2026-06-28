import '@testing-library/jest-dom';
import * as React from 'react';
// @vitejs/plugin-react v6 uses oxc-transform which doesn't inject the automatic
// JSX runtime in Vitest's pipeline — make React available globally so component
// JSX (compiled as React.createElement) doesn't throw ReferenceError.
globalThis.React = React;

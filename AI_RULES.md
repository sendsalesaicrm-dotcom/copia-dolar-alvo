# AI Development Rules for Dolar Alvo

This document outlines the technical stack and development guidelines for maintaining and extending the Dolar Alvo application.

## Tech Stack Overview

1.  **Framework**: React (v19+) for building the user interface.
2.  **Language**: TypeScript for robust, type-safe code.
3.  **Build Tool**: Vite for fast development and bundling.
4.  **Styling**: Tailwind CSS for a utility-first approach to responsive design.
5.  **Component Library**: shadcn/ui (or components derived from it) for high-quality, accessible UI elements.
6.  **Icons**: `lucide-react` for all visual icons.
7.  **Routing**: React Router is the designated solution for navigation between pages.
8.  **Formatting**: Native JavaScript `Intl.NumberFormat` is used for currency and number internationalization.

## Library Usage Rules

| Feature | Recommended Library/Tool | Rule |
| :--- | :--- | :--- |
| **UI Components** | shadcn/ui | Always prioritize using or composing components based on shadcn/ui for consistency and accessibility. |
| **Styling** | Tailwind CSS | All styling must be done using Tailwind utility classes. Custom CSS should be avoided. |
| **Icons** | `lucide-react` | Use icons exclusively from the `lucide-react` package. |
| **Routing** | React Router | Use for navigation between different views/pages. Keep routes defined in `App.tsx`. |
| **State Management** | React Hooks | Keep state management simple using built-in React hooks (`useState`, `useReducer`, `useContext`). |
| **Notifications** | (To be installed if needed) | If toast notifications are required, use a standard React toast library (e.g., `react-hot-toast`). |
| **File Structure** | Standardized | Components go into `src/components/`, pages into `src/pages/`. |
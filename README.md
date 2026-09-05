MediLocker

MediLocker is a secure digital healthcare record management platform designed to help users store, manage, access, and share their medical information digitally.

The project is being developed as a full-stack application with a separate frontend and backend architecture.

Repository Structure

MediLocker/
│
├── frontend/     # Frontend client application (HTML5, Vanilla CSS, JS)
├── backend/      # Node.js + Express + TypeScript + Prisma API
├── scripts/      # Dev server scripts
├── package.json  # Unified workspace package
├── README.md
└── .gitignore

Quick Start

Run the entire full-stack application with a single command from the root directory:

```bash
# 1. Install dependencies
npm run install:all

# 2. Run both frontend and backend concurrently
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/v1/health

Development

Frontend

The "frontend/" directory contains the complete client-side application, including:

- User interface
- Authentication screens
- Dashboard
- Medical record management
- Document upload and viewing
- Profile management
- Other frontend components and services

Backend

The "backend/" directory contains the complete server-side application, including:

- Authentication and authorization
- User management
- Medical record APIs
- Document/file management
- Database integration
- Secure data handling
- API services
- Other backend services

Team Workflow

Both frontend and backend development are maintained in this repository.

- Frontend development → "frontend/"
- Backend development → "backend/"
- Project-level configuration/documentation → repository root

Each contributor should work primarily within their respective directory and regularly pull the latest changes before pushing new work.

Project Status

🚧 Under Development

This repository is currently being developed for the MediLocker project.
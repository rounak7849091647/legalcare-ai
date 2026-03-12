# Chapter 17: Configuration Files

## Complete Project Configuration Documentation

**LegalCareAI - Proprietary Source Code**  
**Copyright © 2024-2026 LegalCareAI. All Rights Reserved.**

---

## Table of Contents

1. [Vite Configuration](#vite-configuration)
2. [Tailwind CSS Configuration](#tailwind-css-configuration)
3. [TypeScript Configuration](#typescript-configuration)
4. [ESLint Configuration](#eslint-configuration)
5. [Supabase Configuration](#supabase-configuration)
6. [Component Library Configuration](#component-library-configuration)

---

## 1. Vite Configuration

**File**: `vite.config.ts`  
**Purpose**: Build tool configuration with path aliases

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

### Key Features

| Feature | Description |
|---------|-------------|
| SWC Compiler | Fast Rust-based React compilation |
| Path Alias | `@/` maps to `src/` directory |
| Hot Reload | Development server on port 8080 |
| Component Tagger | Lovable development tools integration |

---

## 2. Tailwind CSS Configuration

**File**: `tailwind.config.ts`  
**Purpose**: Design system tokens and theme configuration

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### Color System

| Token | Usage |
|-------|-------|
| `background` | Page backgrounds |
| `foreground` | Primary text |
| `primary` | Brand color, CTAs |
| `secondary` | Secondary actions |
| `muted` | Subtle backgrounds |
| `accent` | Highlights |
| `destructive` | Error states |
| `sidebar-*` | Sidebar-specific colors |

---

## 3. TypeScript Configuration

**File**: `tsconfig.json`  
**Purpose**: TypeScript compiler settings

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**File**: `tsconfig.app.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### Compiler Options

| Option | Value | Purpose |
|--------|-------|---------|
| `target` | ES2020 | Modern JavaScript output |
| `strict` | true | Full type checking |
| `jsx` | react-jsx | React 17+ JSX transform |
| `moduleResolution` | bundler | Vite-compatible resolution |
| `skipLibCheck` | true | Faster builds |

---

## 4. ESLint Configuration

**File**: `eslint.config.js`  
**Purpose**: Code quality and style enforcement

```javascript
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  }
);
```

---

## 5. Supabase Configuration

**File**: `supabase/config.toml`  
**Purpose**: Supabase project settings

```toml
[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[db.pooler]
enabled = false
port = 54329
pool_mode = "transaction"
default_pool_size = 20
max_client_conn = 100

[studio]
enabled = true
port = 54323
api_url = "http://127.0.0.1"

[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["https://127.0.0.1:3000"]
jwt_expiry = 3600
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10
enable_signup = true
enable_anonymous_sign_ins = false

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

[analytics]
enabled = false
port = 54327
backend = "postgres"
```

---

## 6. Component Library Configuration

**File**: `components.json`  
**Purpose**: shadcn/ui component library settings

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

---

## 7. PostCSS Configuration

**File**: `postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

## 8. HTML Entry Point

**File**: `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#000000" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>LegalCareAI - AI-Powered Legal Intelligence</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Configuration File Inventory

| File | Purpose | Lines |
|------|---------|-------|
| vite.config.ts | Build configuration | 20 |
| tailwind.config.ts | Design system | 100 |
| tsconfig.json | TypeScript base | 12 |
| tsconfig.app.json | App TypeScript | 25 |
| tsconfig.node.json | Node TypeScript | 15 |
| eslint.config.js | Linting rules | 30 |
| components.json | shadcn/ui config | 20 |
| postcss.config.js | CSS processing | 6 |
| supabase/config.toml | Backend config | 60 |
| index.html | Entry point | 15 |

**Total Configuration**: ~300 lines across 10 files

---

*This documentation is confidential and proprietary. Unauthorized reproduction is prohibited.*

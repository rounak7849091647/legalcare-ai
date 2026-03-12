# UI Components

## Complete UI Component Documentation

---

## 1. Overview

LegalCareAI uses a custom UI component library built on top of Shadcn/UI and Radix primitives. All components are accessible, themeable, and follow a consistent design system.

---

## 2. Component Categories

### 2.1 Layout Components

| Component | File | Purpose |
|-----------|------|---------|
| Sidebar | ui/sidebar.tsx | Collapsible navigation sidebar |
| Sheet | ui/sheet.tsx | Slide-out panel |
| Dialog | ui/dialog.tsx | Modal dialog |
| Drawer | ui/drawer.tsx | Bottom drawer (mobile) |
| Card | ui/card.tsx | Content container |
| Separator | ui/separator.tsx | Visual divider |
| Scroll Area | ui/scroll-area.tsx | Custom scrollbar |
| Resizable | ui/resizable.tsx | Resizable panels |

### 2.2 Form Components

| Component | File | Purpose |
|-----------|------|---------|
| Button | ui/button.tsx | Primary action element |
| Input | ui/input.tsx | Text input field |
| Textarea | ui/textarea.tsx | Multi-line text input |
| Select | ui/select.tsx | Dropdown selection |
| Checkbox | ui/checkbox.tsx | Boolean toggle |
| Radio Group | ui/radio-group.tsx | Single selection |
| Switch | ui/switch.tsx | On/off toggle |
| Slider | ui/slider.tsx | Range selection |
| Form | ui/form.tsx | Form with validation |
| Label | ui/label.tsx | Form field label |
| Input OTP | ui/input-otp.tsx | OTP input fields |

### 2.3 Display Components

| Component | File | Purpose |
|-----------|------|---------|
| Avatar | ui/avatar.tsx | User avatar |
| Badge | ui/badge.tsx | Status indicator |
| Alert | ui/alert.tsx | Notification message |
| Progress | ui/progress.tsx | Progress indicator |
| Skeleton | ui/skeleton.tsx | Loading placeholder |
| Table | ui/table.tsx | Data table |
| Chart | ui/chart.tsx | Data visualization |

### 2.4 Navigation Components

| Component | File | Purpose |
|-----------|------|---------|
| Tabs | ui/tabs.tsx | Tab navigation |
| Accordion | ui/accordion.tsx | Collapsible sections |
| Navigation Menu | ui/navigation-menu.tsx | Main navigation |
| Menubar | ui/menubar.tsx | Menu bar |
| Dropdown Menu | ui/dropdown-menu.tsx | Dropdown menu |
| Context Menu | ui/context-menu.tsx | Right-click menu |
| Breadcrumb | ui/breadcrumb.tsx | Breadcrumb navigation |
| Pagination | ui/pagination.tsx | Page navigation |

### 2.5 Overlay Components

| Component | File | Purpose |
|-----------|------|---------|
| Tooltip | ui/tooltip.tsx | Hover tooltip |
| Popover | ui/popover.tsx | Click popover |
| Hover Card | ui/hover-card.tsx | Hover content card |
| Alert Dialog | ui/alert-dialog.tsx | Confirmation dialog |
| Command | ui/command.tsx | Command palette |

### 2.6 Feedback Components

| Component | File | Purpose |
|-----------|------|---------|
| Toast | ui/toast.tsx | Notification toast |
| Toaster | ui/toaster.tsx | Toast container |
| Sonner | ui/sonner.tsx | Toast (sonner) |

---

## 3. Key Component Implementations

### 3.1 Button Component

```typescript
// src/components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

### 3.2 Sidebar Component

```typescript
// src/components/ui/sidebar.tsx (excerpt)
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_ICON = "3rem";

const SidebarContext = React.createContext<{
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
} | null>(null);

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  children,
}: SidebarProviderProps) {
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = setOpenProp ?? _setOpen;

  const toggleSidebar = React.useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const state = open ? "expanded" : "collapsed";

  return (
    <SidebarContext.Provider value={{ state, open, setOpen, toggleSidebar }}>
      <div
        style={{
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props }, ref) => {
    const { state } = useSidebar();
    
    return (
      <div
        ref={ref}
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        className={cn(
          "group peer hidden md:block text-sidebar-foreground",
          className
        )}
      >
        <div className="duration-200 relative h-svh w-[--sidebar-width] bg-transparent transition-[width] ease-linear group-data-[collapsible=offcanvas]:w-0 group-data-[state=collapsed]:w-[--sidebar-width-icon]">
          <div className="flex h-full w-full flex-col bg-sidebar">
            {children}
          </div>
        </div>
      </div>
    );
  }
);
```

### 3.3 Card Component

```typescript
// src/components/ui/card.tsx
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
);

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
);

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
);

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
);

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

### 3.4 Badge Component

```typescript
// src/components/ui/badge.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
```

---

## 4. Feature Components

### 4.1 AppSidebar

Main application sidebar with navigation.

```typescript
// src/components/AppSidebar.tsx
const AppSidebar = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const mainItems = [
    { title: 'AI Assistant', icon: Home, href: '/' },
  ];

  const serviceItems = [
    { title: 'Documents', icon: FileText, href: '/documents' },
    { title: 'Lawyers', icon: Users, href: '/lawyers' },
    { title: 'Tax Services', icon: Calculator, href: '/tax-services' },
    { title: 'Discussion', icon: MessageSquare, href: '/discussion' },
    { title: 'Community', icon: Globe, href: '/community' },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/">
          <h1>LegalCareAI</h1>
          <p>Legal Intelligence</p>
        </Link>
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>MAIN</SidebarGroupLabel>
          <SidebarMenu>
            {mainItems.map(item => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link to={item.href}>
                    <item.icon />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Dashboard (when logged in) */}
        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>MY ACCOUNT</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard />
                    {!isCollapsed && <span>Dashboard</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Services */}
        <SidebarGroup>
          <SidebarGroupLabel>SERVICES</SidebarGroupLabel>
          <SidebarMenu>
            {serviceItems.map(item => (/* ... */))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* User info / Login */}
      </SidebarFooter>
    </Sidebar>
  );
};
```

### 4.2 ChatInput

Chat input with voice and document upload.

```typescript
// src/components/ChatInput.tsx
interface ChatInputProps {
  onSend: (message: string, documentContent?: string) => void;
  onDocumentUpload: (content: string, name: string) => void;
  isLoading: boolean;
  isSpeaking: boolean;
  onVoiceTranscript: (transcript: string, language: string) => void;
}

const ChatInput = ({
  onSend,
  onDocumentUpload,
  isLoading,
  isSpeaking,
  onVoiceTranscript,
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const { currentLanguage } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage('');
    }
  };

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    onDocumentUpload(text, file.name);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl">
        {/* Document upload */}
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
          id="doc-upload"
        />
        <label htmlFor="doc-upload" className="cursor-pointer">
          <Paperclip className="text-muted-foreground hover:text-foreground" />
        </label>

        {/* Text input */}
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask a legal question..."
          className="flex-1 border-0 focus-visible:ring-0"
          disabled={isLoading}
        />

        {/* Voice button */}
        <VoiceButton onTranscript={onVoiceTranscript} />

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || isLoading}
        >
          <Send size={18} />
        </Button>
      </div>
    </form>
  );
};
```

### 4.3 ChatMessages

Message display component.

```typescript
// src/components/ChatMessages.tsx
interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatMessages = ({ messages, isLoading }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-3",
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'assistant' && (
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                AI
              </AvatarFallback>
            </Avatar>
          )}

          <div
            className={cn(
              "max-w-[80%] rounded-xl px-4 py-3",
              message.role === 'user'
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border"
            )}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>

          {message.role === 'user' && (
            <Avatar>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary">AI</AvatarFallback>
          </Avatar>
          <div className="bg-card border rounded-xl px-4 py-3">
            <div className="flex gap-1">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce delay-100">●</span>
              <span className="animate-bounce delay-200">●</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
```

---

## 5. Design Tokens

### 5.1 Color Tokens

```css
/* Light mode */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
}

/* Dark mode */
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 4.9% 83.9%;
}
```

---

*This UI components documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*

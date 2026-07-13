import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type HTMLAttributes,
} from "react";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className = "",
  ...props
}: TabsProps) {
  const [localValue, setLocalValue] = useState(defaultValue);
  const activeValue = value ?? localValue;

  const handleValueChange = (newValue: string) => {
    setLocalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={`w-full flex flex-col gap-4 ${className}`} {...props}>
        {children}
      </div>
    </TabsContext>
  );
}

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function TabsList({ children, className = "", ...props }: TabsListProps) {
  return (
    <div
      className={`flex border-b border-outline-variant/30 gap-6 overflow-x-auto no-scrollbar ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  children: ReactNode;
}

export function TabsTrigger({
  value,
  children,
  className = "",
  ...props
}: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={`py-3 px-1 text-label-md font-semibold border-b-2 transition-all duration-200 focus:outline-none whitespace-nowrap ${
        isActive
          ? "border-primary text-primary font-bold"
          : "border-transparent text-on-surface-variant/75 hover:text-on-surface hover:border-outline-variant/50"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  children: ReactNode;
}

export function TabsContent({
  value,
  children,
  className = "",
  ...props
}: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <div
      className={`animate-in fade-in duration-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

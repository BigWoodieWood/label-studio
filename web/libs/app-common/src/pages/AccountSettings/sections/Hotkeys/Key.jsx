
export const KeyboardKey = ({ children }) => {
  return (
    <kbd className="inline-flex items-center justify-center rounded border border-input bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
      {children}      
    </kbd>
  );
};

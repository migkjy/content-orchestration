'use client';

export function ConfirmForm({
  action,
  message,
  children,
}: {
  action: () => void;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}

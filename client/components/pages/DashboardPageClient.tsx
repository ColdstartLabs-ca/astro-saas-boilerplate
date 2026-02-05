'use client';

export default function DashboardPage(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your workspace overview.</p>
      </div>

      {/* Workspace placeholder - feature components were extracted to boilerplate */}
      <div className="p-8 border rounded-lg bg-muted/50">
        <p className="text-center text-muted-foreground">
          Workspace component has been extracted to the boilerplate.
          <br />
          Please implement your custom workspace UI here.
        </p>
      </div>
    </div>
  );
}

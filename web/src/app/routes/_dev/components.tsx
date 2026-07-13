import { useState, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Dialog } from "../../../components/ui/Dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "../../../components/ui/Table";
import { Avatar } from "../../../components/ui/Avatar";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../../components/ui/Tabs";
import { Alert } from "../../../components/ui/Alert";
import { StatusBadge } from "../../../components/shared/StatusBadge";
import { PageHeader } from "../../../components/shared/PageHeader";
import { EmptyState } from "../../../components/shared/EmptyState";
import { useToastStore } from "../../../stores/toast-store";

export const Route = createFileRoute("/_dev/components")({
  component: ComponentsDemoPage,
});

function ComponentsDemoPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputPass, setInputPass] = useState("");
  const addToast = useToastStore((state) => state.addToast);

  const mockUsers = [
    { name: "Aria Wijaya", email: "aria@telemed.com", role: "Patient", status: "online" },
    { name: "Dr. Anisa Rahma", email: "anisa.r@telemed.com", role: "Doctor", status: "away" },
    { name: "Budi Santoso", email: "budi@telemed.com", role: "Admin", status: "offline" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="TeleMedHub UI Workshop"
        subtitle="Satu sumber kebenaran (Single Source of Truth) untuk reusable components & design tokens."
        actions={
          <Button leftIcon="bolt" onClick={() => alert("System OK!")}>
            System Sync
          </Button>
        }
      />

      {/* Colors & Spacing Tokens Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-headline-md font-bold text-on-surface">Design Tokens</h2>
        
        <Card variant="elevation">
          <CardContent className="flex flex-col gap-6">
            <div>
              <h4 className="text-label-md font-bold text-on-surface-variant mb-3">Material Design 3 Colors</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-primary text-on-primary rounded-lg text-center text-label-sm font-bold shadow-sm">
                  Primary<br />#00676a
                </div>
                <div className="p-3 bg-primary-container text-on-primary-container rounded-lg text-center text-label-sm font-bold">
                  Primary Cont.<br />#008286
                </div>
                <div className="p-3 bg-secondary text-on-secondary rounded-lg text-center text-label-sm font-bold shadow-sm">
                  Secondary<br />#006b5f
                </div>
                <div className="p-3 bg-secondary-container text-on-secondary-container rounded-lg text-center text-label-sm font-bold">
                  Secondary Cont.<br />#6df5e1
                </div>
                <div className="p-3 bg-tertiary text-on-tertiary rounded-lg text-center text-label-sm font-bold shadow-sm">
                  Tertiary<br />#005f9d
                </div>
                <div className="p-3 bg-tertiary-container text-on-tertiary-container rounded-lg text-center text-label-sm font-bold">
                  Tertiary Cont.<br />#0079c4
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-label-md font-bold text-on-surface-variant mb-3">Semantic Alerts & Surfaces</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-error text-on-error rounded-lg text-center text-label-sm font-bold shadow-sm">
                  Error<br />#ba1a1a
                </div>
                <div className="p-3 bg-error-container text-on-error-container rounded-lg text-center text-label-sm font-bold">
                  Error Cont.<br />#ffdad6
                </div>
                <div className="p-3 bg-surface-container text-on-surface rounded-lg text-center text-label-sm font-bold border border-outline-variant/30">
                  Surface Cont.<br />#e7eeff
                </div>
                <div className="p-3 bg-surface-container-high text-on-surface rounded-lg text-center text-label-sm font-bold">
                  Surface High<br />#dee8ff
                </div>
                <div className="p-3 bg-surface-container-highest text-on-surface rounded-lg text-center text-label-sm font-bold">
                  Surface Highest<br />#d8e3fb
                </div>
                <div className="p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-center text-label-sm font-bold">
                  Surface Lowest<br />#ffffff
                </div>
              </div>
            </div>

            <div className="border-t border-outline-variant/10 pt-4 flex flex-wrap gap-x-8 gap-y-4">
              <div>
                <span className="text-label-md font-bold text-on-surface-variant mr-2">Card Radius:</span>
                <code className="bg-surface-container-low px-2 py-1 rounded text-body-sm font-semibold">rounded-card (20px)</code>
              </div>
              <div>
                <span className="text-label-md font-bold text-on-surface-variant mr-2">Layout Spacing:</span>
                <code className="bg-surface-container-low px-2 py-1 rounded text-body-sm font-semibold">gutter (24px)</code>
              </div>
              <div>
                <span className="text-label-md font-bold text-on-surface-variant mr-2">Elevations:</span>
                <code className="bg-surface-container-low px-2 py-1 rounded text-body-sm font-semibold">shadow-level-1</code>, <code className="bg-surface-container-low px-2 py-1 rounded text-body-sm font-semibold">shadow-level-2</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Button & Badge Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div className="flex flex-col gap-4">
          <h2 className="text-headline-md font-bold text-on-surface">Button Variants</h2>
          <Card variant="elevation">
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="text">Text Button</Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm" leftIcon="edit">Small</Button>
                <Button variant="primary" size="md" leftIcon="schedule">Medium</Button>
                <Button variant="primary" size="lg" rightIcon="arrow_forward">Large</Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" isLoading>Loading</Button>
                <Button variant="outline" disabled leftIcon="lock">Disabled</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-headline-md font-bold text-on-surface">Badge & Status Indicators</h2>
          <Card variant="elevation">
            <CardContent className="flex flex-col gap-4">
              <div>
                <h4 className="text-label-md font-bold text-on-surface-variant mb-2">Semantic Badges (Primitive)</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="neutral">Neutral</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="info">Info</Badge>
                </div>
              </div>

              <div className="border-t border-outline-variant/10 pt-4">
                <h4 className="text-label-md font-bold text-on-surface-variant mb-2">DB-Mapped Status Badge (Shared)</h4>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status="completed" />
                  <StatusBadge status="pending" />
                  <StatusBadge status="cancelled" />
                  <StatusBadge status="shipped" />
                  <StatusBadge status="draft" />
                  <StatusBadge status="other_state" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Input / Form Fields Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-headline-md font-bold text-on-surface">Forms & Validation Fields</h2>
        <Card variant="elevation">
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                leftIcon="person"
                value={inputText}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInputText(e.target.value)}
              />

              <Input
                label="Password (Auto Toggle Visibility)"
                type="password"
                placeholder="Enter secure password"
                leftIcon="lock"
                value={inputPass}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInputPass(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="invalid-email"
                leftIcon="mail"
                error="Please enter a valid email address."
              />

              <Input
                label="Clinical Notes"
                textarea
                rows={3}
                placeholder="Write medical notes here..."
                leftIcon="description"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Alert & Toast Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div className="flex flex-col gap-4">
          <h2 className="text-headline-md font-bold text-on-surface">Inline Alerts (Status Banner)</h2>
          <Card variant="elevation">
            <CardContent className="flex flex-col gap-4">
              <Alert variant="success" title="Pembaruan Berhasil">
                Rekam medis pasien telah disinkronkan dengan Database Pusat.
              </Alert>
              <Alert variant="info" title="Informasi Sistem">
                Modul smart pharmacy saat ini sedang terhubung ke stock inventory.
              </Alert>
              <Alert variant="warning" title="Peringatan Limit">
                Saldo Wallet Anda kurang dari batas minimal Rp 50.000.
              </Alert>
              <Alert variant="error" title="Gagal Koneksi">
                Kehilangan koneksi ke Auth Server. Coba beberapa saat lagi.
              </Alert>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-headline-md font-bold text-on-surface">Toast Notifications</h2>
          <Card variant="elevation">
            <CardContent className="flex flex-col gap-4 items-center justify-center p-8 text-center">
              <span className="material-symbols-outlined text-[48px] text-primary mb-4">
                notifications_active
              </span>
              <h4 className="text-headline-sm font-bold text-on-surface mb-2">Global Float Banner</h4>
              <p className="text-body-sm text-on-surface-variant mb-6 max-w-xs">
                Trigger floating status popups. Auto dismiss in 4 seconds.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="primary" onClick={() => addToast({ type: "success", title: "Action Success", message: "Data berhasil disimpan!" })}>
                  Success
                </Button>
                <Button variant="secondary" onClick={() => addToast({ type: "info", title: "Information", message: "Ada jadwal konsultasi baru." })}>
                  Info
                </Button>
                <Button variant="outline" onClick={() => addToast({ type: "warning", title: "Low Balance", message: "Harap top-up digital wallet Anda." })}>
                  Warning
                </Button>
                <Button variant="text" className="text-error hover:bg-error-container/10" onClick={() => addToast({ type: "error", title: "System Fault", message: "Gagal menghubungkan ke server." })}>
                  Error
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tabs & Cards Interactive Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-headline-md font-bold text-on-surface">Tabs & Cards (Interactive)</h2>
        <Tabs defaultValue="tab-cards">
          <TabsList>
            <TabsTrigger value="tab-cards">Card Styles</TabsTrigger>
            <TabsTrigger value="tab-table">Tabular Data</TabsTrigger>
            <TabsTrigger value="tab-avatar">Avatars Showcase</TabsTrigger>
          </TabsList>

          <TabsContent value="tab-cards" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="default">
              <CardHeader>
                <CardTitle>Border (Default)</CardTitle>
                <CardDescription>Simple bordered card without elevation.</CardDescription>
              </CardHeader>
              <CardContent>
                Perfect for low-priority structure or inner content panels.
              </CardContent>
              <CardFooter>
                <Button variant="text" size="sm">Dismiss</Button>
              </CardFooter>
            </Card>

            <Card variant="elevation">
              <CardHeader>
                <CardTitle>Elevation Card</CardTitle>
                <CardDescription>Uses level-1 soft teal shadow.</CardDescription>
              </CardHeader>
              <CardContent>
                The primary card format for cards, reports, and dashboards.
              </CardContent>
              <CardFooter>
                <Button variant="primary" size="sm">Action</Button>
              </CardFooter>
            </Card>

            <Card variant="interactive">
              <CardHeader>
                <CardTitle>Interactive Hover</CardTitle>
                <CardDescription>Hover to animate elevation and translation.</CardDescription>
              </CardHeader>
              <CardContent>
                Designed for booking schedules, prescriptions, and cards.
              </CardContent>
              <CardFooter>
                <span className="text-label-sm font-bold text-primary flex items-center gap-1">
                  View Detail <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </span>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="tab-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User / Profile</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>System Access Role</TableHead>
                  <TableHead>Activity Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar name={user.name} size="sm" status={user.status as any} />
                      <span className="font-semibold text-on-surface">{user.name}</span>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "Admin" ? "primary" : "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status === "online" ? "active" : user.status === "away" ? "pending" : "inactive"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="tab-avatar" className="flex items-center gap-6">
            <div className="flex flex-col gap-2 items-center">
              <Avatar name="Rina Patient" size="sm" status="online" />
              <span className="text-label-sm text-on-surface-variant">Small (sm)</span>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <Avatar name="Dr. Amir" size="md" status="away" />
              <span className="text-label-sm text-on-surface-variant">Medium (md)</span>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <Avatar name="Bayu Admin" size="lg" status="offline" />
              <span className="text-label-sm text-on-surface-variant">Large (lg)</span>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Dialog & Empty State Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div className="flex flex-col gap-4">
          <h2 className="text-headline-md font-bold text-on-surface">Dialog (Modal Trigger)</h2>
          <Card variant="elevation">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <span className="material-symbols-outlined text-[48px] text-primary mb-4">
                chat_bubble_outline
              </span>
              <h4 className="text-headline-sm font-bold text-on-surface mb-2">Test Modal Overlay</h4>
              <p className="text-body-sm text-on-surface-variant mb-6 max-w-xs">
                Launch a centered modal layout to review system notifications or critical actions.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} leftIcon="open_in_new">
                Open Dialog
              </Button>
            </CardContent>
          </Card>

          <Dialog
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            title="System Verification"
            footer={
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => { setIsDialogOpen(false); alert("Success!"); }}>
                  Confirm Sync
                </Button>
              </>
            }
          >
            <p className="mb-4">
              Apakah Anda yakin ingin menyinkronkan seluruh design tokens dan komponen reusable ini ke codebase TeleMedHub?
            </p>
            <div className="p-4 bg-surface-container rounded-lg border border-outline-variant/20 text-body-sm font-mono">
              Theme: Material Design 3 (M3) standard<br />
              Tailwind Version: 4.3.2 (Vite integration)
            </div>
          </Dialog>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-headline-md font-bold text-on-surface">Empty State (Fallback)</h2>
          <EmptyState
            icon="folder_off"
            title="No Appointments Found"
            description="You don't have any scheduled appointments yet. Book a session with our verified medical experts."
            actionLabel="Book Appointment"
            actionIcon="add"
            onActionClick={() => alert("Navigating to booking schedule...")}
          />
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import {
  branchesApi,
  employeeChecklistsApi,
  employeeDocumentsApi,
  employeesApi,
  probationApi,
} from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { useIsNigeria, useRegionLabel } from "@/components/region-field";
import type {
  ChecklistItem,
  ChecklistType,
  CreateEmployeeLoginOut,
  DocumentCategory,
  Employee,
  EmployeeHistoryEvent,
  ProbationPeriod,
} from "@/lib/types";

const CHECKLIST_TYPES: ChecklistType[] = ["onboarding", "offboarding"];
const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "identification",
  "contract",
  "certificate",
  "offer_letter",
  "other",
];

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "payroll_manager";
  // The roles the server lets change an employee's record.
  const canEdit = canManage || user?.role === "accountant";
  const employee = useApiResource(() => employeesApi.get(id), [id]);
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [createdLogin, setCreatedLogin] = useState<CreateEmployeeLoginOut | null>(null);

  return (
    <div>
      {employee.loading ? <LoadingState /> : null}
      {employee.error ? <ErrorState message={employee.error} /> : null}
      {employee.data ? (
        <>
          <PageHeader
            title={employee.data.full_name}
            subtitle={[
              employee.data.employee_number,
              employee.data.login_code ? `Login code ${employee.data.login_code}` : null,
              employee.data.job_title,
            ]
              .filter(Boolean)
              .join(" · ")}
            action={
              <div className="flex items-center gap-3">
                <Avatar name={employee.data.full_name} size="lg" src={employee.data.photo_url} />
                <StatusBadge status={employee.data.lifecycle_stage} />
                <Badge tone="neutral">{titleCase(employee.data.employment_type)}</Badge>
                {user?.role === "admin" && !employee.data.account_id ? (
                  <Button size="md" variant="secondary" onClick={() => setCreatingLogin(true)}>
                    Create Login
                  </Button>
                ) : null}
                {canEdit ? (
                  <Link href={`/employees/${employee.data.id}/edit`}>
                    <Button size="md" variant="secondary">
                      Edit Details
                    </Button>
                  </Link>
                ) : null}
                {canManage && employee.data.lifecycle_state === "active" ? (
                  <Button
                    size="md"
                    variant="secondary"
                    onClick={() => router.push(`/settlement?employeeId=${employee.data!.id}`)}
                  >
                    Offboard
                  </Button>
                ) : null}
              </div>
            }
          />

          {creatingLogin ? (
            <CreateLoginDrawer
              employee={employee.data}
              onClose={() => setCreatingLogin(false)}
              onCreated={(result) => {
                setCreatingLogin(false);
                setCreatedLogin(result);
                employee.reload();
              }}
            />
          ) : null}

          {createdLogin ? (
            <LoginCredentialsDialog login={createdLogin} onClose={() => setCreatedLogin(null)} />
          ) : null}

          <Tabs
            tabs={[
              { id: "overview", label: "Overview", content: <OverviewTab employeeId={id} /> },
              { id: "history", label: "History", content: <HistoryTab employeeId={id} /> },
              ...(canManage
                ? [
                    {
                      id: "checklist",
                      label: "Checklist",
                      content: <ChecklistTab employeeId={id} />,
                    },
                    {
                      id: "probation",
                      label: "Probation",
                      content: <ProbationTab employeeId={id} />,
                    },
                    {
                      id: "documents",
                      label: "Documents",
                      content: <DocumentsTab employeeId={id} />,
                    },
                  ]
                : []),
            ]}
          />
        </>
      ) : null}
    </div>
  );
}

function CreateLoginDrawer({
  employee,
  onClose,
  onCreated,
}: {
  employee: Employee;
  onClose: () => void;
  onCreated: (login: CreateEmployeeLoginOut) => void;
}) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await employeesApi.createLogin(employee.id, { email, password });
      showToast("Login created", "good");
      onCreated(result);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Create Login — ${employee.full_name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            required
          />
        </div>
        <div>
          <Label htmlFor="login-password">Initial Password</Label>
          <Input
            id="login-password"
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Login"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function LoginCredentialsDialog({
  login,
  onClose,
}: {
  login: CreateEmployeeLoginOut;
  onClose: () => void;
}) {
  return (
    <Drawer title="Login Created" onClose={onClose}>
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Share these sign-in details with <span className="font-bold text-ink">{login.email}</span> now — they
          won&apos;t be shown again.
        </p>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2.5 text-[13px]">
          <dt className="text-ink-soft">Email</dt>
          <dd className="font-mono font-bold">{login.email}</dd>
          {login.login_code ? (
            <>
              <dt className="text-ink-soft">Login Code</dt>
              <dd className="font-mono font-bold">{login.login_code}</dd>
            </>
          ) : null}
        </dl>
        <div className="mt-auto flex justify-end pt-4">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Drawer>
  );
}

function OverviewTab({ employeeId }: { employeeId: string }) {
  const regionLabel = useRegionLabel();
  const isNigeria = useIsNigeria();
  const employee = useApiResource(() => employeesApi.get(employeeId), [employeeId]);
  const branches = useApiResource(() => branchesApi.list());
  if (!employee.data) return null;
  const e = employee.data;
  const branch = (branches.data ?? []).find((b) => b.id === e.branch_id) ?? null;
  const grossMinor =
    e.basic_minor === null ||
    e.housing_minor === null ||
    e.transport_minor === null ||
    e.other_earnings_minor === null
      ? null
      : e.basic_minor + e.housing_minor + e.transport_minor + e.other_earnings_minor;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Employment" />
        <dl className="grid grid-cols-[160px_1fr] gap-y-2.5 text-[13px]">
          <dt className="text-ink-soft">{regionLabel} of Residence</dt>
          <dd className="font-bold">{e.state_of_residence}</dd>
          <dt className="text-ink-soft">{regionLabel} of Origin</dt>
          <dd className="font-bold">{e.state_of_origin ?? "—"}</dd>
          <dt className="text-ink-soft">Branch</dt>
          <dd className="font-bold">{branch?.name ?? "—"}</dd>
          <dt className="text-ink-soft">Date of Joining</dt>
          <dd className="font-bold">{formatDate(e.date_of_joining)}</dd>
          <dt className="text-ink-soft">Contract End Date</dt>
          <dd className="font-bold">{formatDate(e.contract_end_date)}</dd>
          <dt className="text-ink-soft">Pay Frequency</dt>
          <dd className="font-bold">{titleCase(e.pay_frequency)}</dd>
          <dt className="text-ink-soft">{isNigeria ? "TIN" : "Tax ID"}</dt>
          <dd className={`font-bold ${e.tin ? "" : "text-bad"}`}>
            {e.tin ?? (isNigeria ? "Missing: needed before they can be paid" : "Missing")}
          </dd>
          <dt className="text-ink-soft">Annual Leave Days</dt>
          <dd className="font-bold">{e.annual_leave_entitlement_days}</dd>
        </dl>
      </Card>
      <Card>
        <CardHeader title="Personal & Contact" />
        <dl className="grid grid-cols-[160px_1fr] gap-y-2.5 text-[13px]">
          <dt className="text-ink-soft">Email</dt>
          <dd className="font-bold">{e.email ?? "Not recorded"}</dd>
          <dt className="text-ink-soft">Phone</dt>
          <dd className="font-bold">{e.phone ?? "—"}</dd>
          <dt className="text-ink-soft">Address</dt>
          <dd className="font-bold">{e.residential_address ?? "—"}</dd>
          <dt className="text-ink-soft">Date of Birth</dt>
          <dd className="font-bold">{formatDate(e.date_of_birth ?? null)}</dd>
          <dt className="text-ink-soft">Gender</dt>
          <dd className="font-bold">{e.gender ?? "—"}</dd>
          <dt className="text-ink-soft">Nationality</dt>
          <dd className="font-bold">{e.nationality ?? "—"}</dd>
          <dt className="text-ink-soft">Marital Status</dt>
          <dd className="font-bold">{e.marital_status ?? "—"}</dd>
          <dt className="text-ink-soft">Next of Kin</dt>
          <dd className="font-bold">
            {e.next_of_kin_name ? `${e.next_of_kin_name}${e.next_of_kin_phone ? ` · ${e.next_of_kin_phone}` : ""}` : "—"}
          </dd>
          {isNigeria ? (
            <>
              <dt className="text-ink-soft">Pension PFA</dt>
              <dd className="font-bold">{e.pfa_name ?? "—"}</dd>
              <dt className="text-ink-soft">RSA PIN</dt>
              <dd className="font-bold">{e.rsa_pin ?? "—"}</dd>
              <dt className="text-ink-soft">NHF Number</dt>
              <dd className="font-bold">{e.nhf_number ?? "—"}</dd>
            </>
          ) : null}
        </dl>
      </Card>
      <Card>
        <CardHeader title="Compensation / Period" />
        {grossMinor === null ? (
          <Badge tone="neutral">Masked</Badge>
        ) : (
          <dl className="grid grid-cols-[160px_1fr] gap-y-2.5 text-[13px]">
            <dt className="text-ink-soft">Basic</dt>
            <dd className="font-bold">{formatMoney(e.basic_minor!)}</dd>
            <dt className="text-ink-soft">Housing</dt>
            <dd className="font-bold">{formatMoney(e.housing_minor!)}</dd>
            <dt className="text-ink-soft">Transport</dt>
            <dd className="font-bold">{formatMoney(e.transport_minor!)}</dd>
            <dt className="text-ink-soft">Other Earnings</dt>
            <dd className="font-bold">{formatMoney(e.other_earnings_minor!)}</dd>
            <dt className="text-ink-soft">Gross / Period</dt>
            <dd className="font-extrabold text-primary">{formatMoney(grossMinor)}</dd>
            {isNigeria ? (
              <>
                <dt className="text-ink-soft">Pension Rates</dt>
                <dd className="font-bold">
                  {e.pension_employee_rate_ppm || e.pension_employer_rate_ppm
                    ? `Employee ${e.pension_employee_rate_ppm ? `${e.pension_employee_rate_ppm / 10_000}%` : "statutory minimum"} · Employer ${e.pension_employer_rate_ppm ? `${e.pension_employer_rate_ppm / 10_000}%` : "statutory minimum"}`
                    : "Statutory minimums"}
                </dd>
              </>
            ) : null}
            {isNigeria ? null : (
              <>
                <dt className="text-ink-soft">Family Shares</dt>
                <dd className="font-bold">{halfSharesLabel(e.tax_half_shares)}</dd>
                <dt className="text-ink-soft">Expatriate Status</dt>
                <dd className="font-bold">{expatriateLabel(e.is_expatriate)}</dd>
              </>
            )}
          </dl>
        )}
      </Card>
    </div>
  );
}

// Family shares are stored in halves (1 share = 2).
function halfSharesLabel(halfShares: number | null | undefined): string {
  if (halfShares === null || halfShares === undefined) return "Not recorded";
  return `${halfShares / 2} (${halfShares} halves)`;
}

function expatriateLabel(isExpatriate: boolean | null | undefined): string {
  if (isExpatriate === null || isExpatriate === undefined) return "Not recorded";
  return isExpatriate ? "Expatriate" : "Local staff";
}

function HistoryTab({ employeeId }: { employeeId: string }) {
  const history = useApiResource(() => employeesApi.history(employeeId), [employeeId]);

  return (
    <Card>
      {history.loading ? <LoadingState /> : null}
      {history.error ? <ErrorState message={history.error} /> : null}
      {history.data && history.data.length === 0 ? (
        <EmptyState label="No status or compensation changes recorded yet." />
      ) : null}
      {history.data && history.data.length > 0 ? (
        <div className="flex flex-col gap-3">
          {[...history.data].reverse().map((event) => (
            <HistoryEventRow key={event.id} event={event} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function HistoryEventRow({ event }: { event: EmployeeHistoryEvent }) {
  return (
    <div className="rounded-panel border border-border p-3">
      <div className="flex items-center justify-between">
        <Badge tone={event.event_type === "status_change" ? "warn" : "neutral"}>
          {titleCase(event.event_type)}
        </Badge>
        <span className="text-[11px] text-ink-soft">{formatDate(event.effective_date)}</span>
      </div>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[12px] text-ink-soft">
        {JSON.stringify(event.detail, null, 2)}
      </pre>
    </div>
  );
}

function ChecklistTab({ employeeId }: { employeeId: string }) {
  const items = useApiResource(() => employeeChecklistsApi.forEmployee(employeeId), [employeeId]);
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);

  async function complete(item: ChecklistItem) {
    try {
      await employeeChecklistsApi.complete(item.id);
      items.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <Card>
      <CardHeader title="Onboarding / Offboarding Checklist" action={<Button onClick={() => setCreating(true)}>New Item</Button>} />
      {items.loading ? <LoadingState /> : null}
      {items.error ? <ErrorState message={items.error} /> : null}
      {items.data && items.data.length === 0 ? <EmptyState label="No checklist items yet." /> : null}
      {items.data && items.data.length > 0 ? (
        <Table>
          <Thead>
            <tr>
              <Th>Type</Th>
              <Th>Title</Th>
              <Th>Due</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {items.data.map((item) => (
              <tr key={item.id}>
                <Td>
                  <Badge tone="neutral">{titleCase(item.checklist_type)}</Badge>
                </Td>
                <Td className="font-bold">{item.title}</Td>
                <Td>{formatDate(item.due_date)}</Td>
                <Td>
                  <StatusBadge status={item.status} />
                </Td>
                <Td align="right">
                  {item.status === "pending" ? (
                    <Button size="md" variant="secondary" onClick={() => complete(item)}>
                      Mark Done
                    </Button>
                  ) : (
                    <span className="text-ink-soft">{formatDate(item.completed_at)}</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}

      {creating ? (
        <NewChecklistItemDrawer
          employeeId={employeeId}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            items.reload();
          }}
        />
      ) : null}
    </Card>
  );
}

function NewChecklistItemDrawer({
  employeeId,
  onClose,
  onCreated,
}: {
  employeeId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [checklistType, setChecklistType] = useState<ChecklistType>("onboarding");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await employeeChecklistsApi.create(employeeId, {
        checklist_type: checklistType,
        title,
        due_date: dueDate || null,
      });
      showToast("Checklist item added", "good");
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Checklist Item" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="checklistType">Type</Label>
          <Select
            id="checklistType"
            value={checklistType}
            onChange={(event) => setChecklistType(event.target.value as ChecklistType)}
          >
            {CHECKLIST_TYPES.map((type) => (
              <option key={type} value={type}>
                {titleCase(type)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Issue laptop"
            required
          />
        </div>
        <div>
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Add Item"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function ProbationTab({ employeeId }: { employeeId: string }) {
  const periods = useApiResource(() => probationApi.forEmployee(employeeId), [employeeId]);
  const [creating, setCreating] = useState(false);
  const [extending, setExtending] = useState<ProbationPeriod | null>(null);
  const [deciding, setDeciding] = useState<ProbationPeriod | null>(null);

  return (
    <Card>
      <CardHeader title="Probation Periods" action={<Button onClick={() => setCreating(true)}>New Probation Period</Button>} />
      {periods.loading ? <LoadingState /> : null}
      {periods.error ? <ErrorState message={periods.error} /> : null}
      {periods.data && periods.data.length === 0 ? <EmptyState label="No probation periods recorded." /> : null}
      {periods.data && periods.data.length > 0 ? (
        <Table>
          <Thead>
            <tr>
              <Th>Start</Th>
              <Th>End</Th>
              <Th>Status</Th>
              <Th>Notes</Th>
              <Th align="right">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {periods.data.map((period) => (
              <tr key={period.id}>
                <Td>{formatDate(period.start_date)}</Td>
                <Td>{formatDate(period.end_date)}</Td>
                <Td>
                  <StatusBadge status={period.status} />
                </Td>
                <Td className="text-ink-soft">{period.notes ?? "—"}</Td>
                <Td align="right">
                  {period.status === "in_progress" ? (
                    <div className="flex justify-end gap-2">
                      <Button size="md" variant="secondary" onClick={() => setExtending(period)}>
                        Extend
                      </Button>
                      <Button size="md" onClick={() => setDeciding(period)}>
                        Decide
                      </Button>
                    </div>
                  ) : (
                    <span className="text-ink-soft">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}

      {creating ? (
        <NewProbationPeriodDrawer
          employeeId={employeeId}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            periods.reload();
          }}
        />
      ) : null}
      {extending ? (
        <ExtendProbationDrawer
          period={extending}
          onClose={() => setExtending(null)}
          onExtended={() => {
            setExtending(null);
            periods.reload();
          }}
        />
      ) : null}
      {deciding ? (
        <DecideProbationDrawer
          period={deciding}
          onClose={() => setDeciding(null)}
          onDecided={() => {
            setDeciding(null);
            periods.reload();
          }}
        />
      ) : null}
    </Card>
  );
}

function NewProbationPeriodDrawer({
  employeeId,
  onClose,
  onCreated,
}: {
  employeeId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await probationApi.create(employeeId, { start_date: startDate, end_date: endDate });
      showToast("Probation period registered", "good");
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Probation Period" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input id="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Registering…" : "Register"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function ExtendProbationDrawer({
  period,
  onClose,
  onExtended,
}: {
  period: ProbationPeriod;
  onClose: () => void;
  onExtended: () => void;
}) {
  const { showToast } = useToast();
  const [newEndDate, setNewEndDate] = useState(period.end_date);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await probationApi.extend(period.id, { new_end_date: newEndDate, notes: notes || null });
      showToast("Probation period extended", "good");
      onExtended();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Extend Probation" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="newEndDate">New End Date</Label>
          <Input
            id="newEndDate"
            type="date"
            value={newEndDate}
            onChange={(event) => setNewEndDate(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Extending…" : "Extend"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function DecideProbationDrawer({
  period,
  onClose,
  onDecided,
}: {
  period: ProbationPeriod;
  onClose: () => void;
  onDecided: () => void;
}) {
  const { showToast } = useToast();
  const [outcome, setOutcome] = useState<"confirmed" | "failed">("confirmed");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await probationApi.decide(period.id, { outcome, notes: notes || null });
      showToast("Probation decided", "good");
      onDecided();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Decide Probation Outcome" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="outcome">Outcome</Label>
          <Select id="outcome" value={outcome} onChange={(event) => setOutcome(event.target.value as "confirmed" | "failed")}>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="decisionNotes">Notes</Label>
          <Input id="decisionNotes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save Decision"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function documentSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsTab({ employeeId }: { employeeId: string }) {
  const documents = useApiResource(() => employeeDocumentsApi.forEmployee(employeeId), [employeeId]);
  const [creating, setCreating] = useState(false);

  return (
    <Card>
      <CardHeader title="Documents" action={<Button onClick={() => setCreating(true)}>Upload Document</Button>} />
      {documents.loading ? <LoadingState /> : null}
      {documents.error ? <ErrorState message={documents.error} /> : null}
      {documents.data && documents.data.length === 0 ? <EmptyState label="No documents on file." /> : null}
      {documents.data && documents.data.length > 0 ? (
        <Table>
          <Thead>
            <tr>
              <Th>Category</Th>
              <Th>Title</Th>
              <Th>File</Th>
              <Th>Expiry</Th>
              <Th align="right">Open</Th>
            </tr>
          </Thead>
          <tbody>
            {documents.data.map((doc) => (
              <tr key={doc.id}>
                <Td>
                  <Badge tone="neutral">{titleCase(doc.category)}</Badge>
                </Td>
                <Td className="font-bold">{doc.title}</Td>
                <Td className="text-[12px] text-ink-soft">
                  {doc.file_name ? `${doc.file_name} · ${documentSize(doc.size_bytes)}` : "Linked file"}
                </Td>
                <Td>{formatDate(doc.expiry_date)}</Td>
                <Td align="right">
                  {doc.storage_url ? (
                    <a
                      href={doc.storage_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] font-bold text-primary hover:underline"
                    >
                      Open
                    </a>
                  ) : (
                    "—"
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}

      {creating ? (
        <NewDocumentDrawer
          employeeId={employeeId}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            documents.reload();
          }}
        />
      ) : null}
    </Card>
  );
}

// What a document on an HR file usually is: a PDF, a scan or a photo taken
// on a phone, or a Word document — the types the server accepts.
const DOCUMENT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

function NewDocumentDrawer({
  employeeId,
  onClose,
  onCreated,
}: {
  employeeId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  // A file from this computer or phone (the usual case), or a link to one
  // that already lives somewhere else.
  const [source, setSource] = useState<"upload" | "link">("upload");
  const [category, setCategory] = useState<DocumentCategory>("identification");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [storageUrl, setStorageUrl] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fileError =
    file && file.size > MAX_DOCUMENT_BYTES
      ? `This file is ${documentSize(file.size)}; documents can be up to 10 MB.`
      : null;

  function chooseFile(chosen: File | null) {
    setFile(chosen);
    // The file's own name is a fair title until one is typed.
    if (chosen && !title) setTitle(chosen.name.replace(/\.[^.]+$/, ""));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (source === "upload" && (!file || fileError)) return;
    setSubmitting(true);
    try {
      if (source === "upload" && file) {
        await employeeDocumentsApi.upload(employeeId, {
          file,
          category,
          title,
          expiry_date: expiryDate || null,
        });
        showToast("Document uploaded", "good");
      } else {
        await employeeDocumentsApi.create(employeeId, {
          category,
          title,
          storage_url: storageUrl,
          expiry_date: expiryDate || null,
        });
        showToast("Document recorded", "good");
      }
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Upload failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Upload Document" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="documentSource">File</Label>
          <Select
            id="documentSource"
            value={source}
            onChange={(event) => setSource(event.target.value as "upload" | "link")}
          >
            <option value="upload">Upload from this computer or phone</option>
            <option value="link">Link to a file stored elsewhere</option>
          </Select>
        </div>
        {source === "upload" ? (
          <div>
            <Label htmlFor="documentFile">Choose File</Label>
            <input
              id="documentFile"
              type="file"
              accept={DOCUMENT_ACCEPT}
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              aria-describedby="documentFileHint"
              required
              className="block w-full cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-[13px] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-white"
            />
            <p id="documentFileHint" className={`mt-1 text-[11px] ${fileError ? "text-bad-ink" : "text-ink-soft"}`}>
              {fileError ??
                (file
                  ? `${file.name} · ${documentSize(file.size)}`
                  : "A PDF, a photo or scan (JPEG, PNG, WebP, HEIC) or a Word document, up to 10 MB. On a phone you can take a photo of the document.")}
            </p>
          </div>
        ) : (
          <div>
            <Label htmlFor="storageUrl">File URL</Label>
            <Input
              id="storageUrl"
              value={storageUrl}
              onChange={(event) => setStorageUrl(event.target.value)}
              placeholder="https://…"
              required
            />
          </div>
        )}
        <div>
          <Label htmlFor="category">Category</Label>
          <Select id="category" value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {titleCase(cat)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. National ID" required />
        </div>
        <div>
          <Label htmlFor="expiryDate">Expiry Date</Label>
          <Input id="expiryDate" type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || (source === "upload" && (!file || Boolean(fileError)))}>
            {submitting ? (source === "upload" ? "Uploading…" : "Saving…") : source === "upload" ? "Upload Document" : "Save Document"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

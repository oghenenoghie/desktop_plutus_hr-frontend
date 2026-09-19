"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { departmentsApi, employeesApi, jobGradesApi, shiftsApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNaira, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { NIGERIAN_BANKS } from "@/lib/nigerian-banks";
import type { Employee, EmployeeBulkImportResult } from "@/lib/types";

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManageMasking = user?.role === "admin" || user?.role === "payroll_manager";
  const employees = useApiResource(() => employeesApi.list());
  const [bankAccountFor, setBankAccountFor] = useState<Employee | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const { showToast } = useToast();
  const departments = useApiResource(() => departmentsApi.list());
  const departmentsById = new Map((departments.data ?? []).map((department) => [department.id, department]));
  const jobGrades = useApiResource(() => jobGradesApi.list());
  const jobGradesById = new Map((jobGrades.data ?? []).map((jobGrade) => [jobGrade.id, jobGrade]));
  const shifts = useApiResource(() => shiftsApi.list());
  const shiftsById = new Map((shifts.data ?? []).map((shift) => [shift.id, shift]));

  async function toggleMasking(employee: Employee) {
    try {
      await employeesApi.setSalaryMasked(employee.id, !employee.salary_masked);
      employees.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Directory, TIN status and pay components"
        action={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setBulkImporting(true)}>
              Bulk Import
            </Button>
            <Button onClick={() => router.push("/employees/new")}>New Employee</Button>
          </div>
        }
      />

      <Card>
        {employees.loading ? <LoadingState /> : null}
        {employees.error ? <ErrorState message={employees.error} /> : null}
        {employees.data && employees.data.length === 0 ? (
          <EmptyState label="No employees on record yet." />
        ) : null}
        {employees.data && employees.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Employee</Th>
                <Th>Department</Th>
                <Th>Job Grade</Th>
                <Th>Shift</Th>
                <Th>State</Th>
                <Th>Type</Th>
                <Th>TIN</Th>
                <Th align="right">Gross / Period</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {employees.data.map((employee) => {
                const { basic_minor, housing_minor, transport_minor, other_earnings_minor } = employee;
                const grossMinor =
                  basic_minor === null ||
                  housing_minor === null ||
                  transport_minor === null ||
                  other_earnings_minor === null
                    ? null
                    : basic_minor + housing_minor + transport_minor + other_earnings_minor;
                return (
                  <tr key={employee.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={employee.full_name} src={employee.photo_url} />
                        <div>
                          <div className="font-bold">{employee.full_name}</div>
                          <div className="text-[11px] text-ink-soft">
                            {employee.employee_number}
                            {employee.job_title ? ` · ${employee.job_title}` : ""}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      {employee.department_id
                        ? (departmentsById.get(employee.department_id)?.name ?? "—")
                        : "—"}
                    </Td>
                    <Td>
                      {employee.job_grade_id
                        ? (jobGradesById.get(employee.job_grade_id)?.name ?? "—")
                        : "—"}
                    </Td>
                    <Td>
                      {employee.shift_id ? (shiftsById.get(employee.shift_id)?.name ?? "—") : "—"}
                    </Td>
                    <Td>{employee.state_of_residence}</Td>
                    <Td>{titleCase(employee.employment_type)}</Td>
                    <Td>
                      {employee.tin ? (
                        <Badge tone="good">Valid</Badge>
                      ) : (
                        <Badge tone="bad">Missing</Badge>
                      )}
                    </Td>
                    <Td align="right">
                      {grossMinor === null ? (
                        <Badge tone="neutral">Masked</Badge>
                      ) : (
                        formatNaira(grossMinor)
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={employee.lifecycle_state} />
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="md"
                          variant="secondary"
                          onClick={() => router.push(`/employees/${employee.id}`)}
                        >
                          View
                        </Button>
                        {canManageMasking ? (
                          <Button size="md" variant="secondary" onClick={() => toggleMasking(employee)}>
                            {employee.salary_masked ? "Unmask Salary" : "Mask Salary"}
                          </Button>
                        ) : null}
                        <Button size="md" variant="secondary" onClick={() => setBankAccountFor(employee)}>
                          Bank Account
                        </Button>
                        {employee.lifecycle_state === "active" ? (
                          <Button
                            size="md"
                            variant="secondary"
                            onClick={() => router.push(`/settlement?employeeId=${employee.id}`)}
                          >
                            Offboard
                          </Button>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {bankAccountFor ? (
        <BankAccountDrawer employee={bankAccountFor} onClose={() => setBankAccountFor(null)} />
      ) : null}

      {bulkImporting ? (
        <BulkImportDrawer
          onClose={() => setBulkImporting(false)}
          onImported={() => employees.reload()}
        />
      ) : null}
    </div>
  );
}

function BulkImportDrawer({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const { showToast } = useToast();
  const [csvContent, setCsvContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EmployeeBulkImportResult | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const outcome = await employeesApi.bulkImport({ csv_content: csvContent });
      setResult(outcome);
      if (outcome.created.length > 0) onImported();
      if (outcome.row_errors.length === 0) {
        showToast(`${outcome.created.length} employee(s) imported`, "good");
      }
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Import failed.", "bad");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Bulk Import Employees" onClose={onClose}>
      {result ? (
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-[13px]">
            <span className="font-bold text-good">{result.created.length} created</span>
            {result.row_errors.length > 0 ? (
              <>
                {" · "}
                <span className="font-bold text-bad">{result.row_errors.length} failed</span>
              </>
            ) : null}
          </p>
          {result.row_errors.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Row</Th>
                  <Th>Employee Number</Th>
                  <Th>Error</Th>
                </tr>
              </Thead>
              <tbody>
                {result.row_errors.map((rowError) => (
                  <tr key={rowError.row}>
                    <Td>{rowError.row}</Td>
                    <Td>{rowError.employee_number ?? "—"}</Td>
                    <Td className="text-bad">{rowError.error}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
          <div className="mt-auto flex justify-end gap-3 pt-4">
            {result.row_errors.length > 0 ? (
              <Button variant="secondary" onClick={() => setResult(null)}>
                Fix and Retry
              </Button>
            ) : null}
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
          <p className="text-[13px] text-ink-soft">
            Paste CSV text — a header row plus one row per employee, columns matching the New Employee
            form&apos;s field names (employee_number, full_name, state_of_residence, employment_type,
            date_of_joining, basic_minor, housing_minor, transport_minor, …). A bad row is skipped and
            reported here — it never blocks the rest of the file.
          </p>
          <div className="flex flex-1 flex-col">
            <Label htmlFor="csv-content">CSV Content</Label>
            <Textarea
              id="csv-content"
              className="flex-1 font-mono"
              rows={14}
              value={csvContent}
              onChange={(event) => setCsvContent(event.target.value)}
              placeholder={"employee_number,full_name,state_of_residence,employment_type,date_of_joining,basic_minor,housing_minor,transport_minor\nEMP-101,Bisi Adeyemi,Lagos,permanent,2026-01-01,30000000,15000000,5000000"}
              required
            />
          </div>
          <div className="mt-auto flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !csvContent.trim()}>
              {submitting ? "Importing…" : "Import"}
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}

function BankAccountDrawer({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const existing = useApiResource(() => employeesApi.getBankAccount(employee.id), [employee.id]);
  const { showToast } = useToast();
  const [bankChoice, setBankChoice] = useState("");
  const [otherBankName, setOtherBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Seeds local editable state from the server once loaded — not a
    // derived-state loop, since the user then owns edits until Save.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (existing.data) {
      const isKnownBank = (NIGERIAN_BANKS as readonly string[]).includes(existing.data.bank_name);
      setBankChoice(isKnownBank ? existing.data.bank_name : "Other");
      setOtherBankName(isKnownBank ? "" : existing.data.bank_name);
      setAccountNumber(existing.data.account_number);
      setAccountName(existing.data.account_name);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [existing.data]);

  const bankName = bankChoice === "Other" ? otherBankName : bankChoice;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await employeesApi.upsertBankAccount(employee.id, {
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
      });
      showToast("Bank account saved", "good");
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Bank Account — ${employee.full_name}`} onClose={onClose}>
      {existing.loading ? (
        <LoadingState />
      ) : (
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
          {existing.data?.verified ? (
            <Badge tone="good">Checksum verified</Badge>
          ) : existing.data ? (
            <Badge tone="neutral">Unverified bank — format only</Badge>
          ) : null}
          <div>
            <Label htmlFor="bank">Bank</Label>
            <Select id="bank" value={bankChoice} onChange={(event) => setBankChoice(event.target.value)} required>
              <option value="">Select bank</option>
              {NIGERIAN_BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
              <option value="Other">Other</option>
            </Select>
          </div>
          {bankChoice === "Other" ? (
            <div>
              <Label htmlFor="otherBankName">Bank Name</Label>
              <Input
                id="otherBankName"
                value={otherBankName}
                onChange={(event) => setOtherBankName(event.target.value)}
                required
              />
            </div>
          ) : null}
          <div>
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              placeholder="10-digit NUBAN"
              required
            />
          </div>
          <div>
            <Label htmlFor="accountName">Account Name</Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              required
            />
          </div>
          <div className="mt-auto flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}

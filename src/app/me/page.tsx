"use client";

import { useState } from "react";

import { EmployeePhotoField } from "@/components/employee-photo-field";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import {
  attendanceApi,
  benefitsApi,
  companyAssetsApi,
  employeesApi,
  expensesApi,
  generatedDocumentsApi,
  leaveApi,
  loansApi,
  payRunsApi,
  performanceReviewsApi,
  policiesApi,
  quizzesApi,
  trainingCourseAttachmentsApi,
  trainingCoursesApi,
  trainingEnrollmentsApi,
  unionMembershipsApi,
} from "@/lib/api/endpoints";
import { formatDate, formatDateTime, formatNaira, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { PerformanceReview, TrainingEnrollment } from "@/lib/types";

export default function MyWorkspacePage() {
  const employee = useApiResource(() => employeesApi.me());
  const payslips = useApiResource(() => payRunsApi.myPayslips());
  const leaveBalance = useApiResource(() => leaveApi.myBalance());
  const leaveRequests = useApiResource(() => leaveApi.mine());
  const expenses = useApiResource(() => expensesApi.mine());
  const loans = useApiResource(() => loansApi.mine());
  const benefits = useApiResource(() => benefitsApi.mine());
  const policies = useApiResource(() => policiesApi.list());
  const performanceReviews = useApiResource(() => performanceReviewsApi.me());
  const myEnrollments = useApiResource(() => trainingEnrollmentsApi.mine());
  const courses = useApiResource(() => trainingCoursesApi.list());
  const coursesById = new Map((courses.data ?? []).map((course) => [course.id, course]));
  const unionMemberships = useApiResource(() => unionMembershipsApi.mine());
  const myAssets = useApiResource(() => companyAssetsApi.mine());
  const allAssets = useApiResource(() => companyAssetsApi.list());
  const assetsById = new Map((allAssets.data ?? []).map((asset) => [asset.id, asset]));
  const attendance = useApiResource(() => attendanceApi.mine());
  const myDocuments = useApiResource(() => generatedDocumentsApi.mine());
  const [signingDocumentId, setSigningDocumentId] = useState<string | null>(null);
  const [takingQuizFor, setTakingQuizFor] = useState<TrainingEnrollment | null>(null);
  const { showToast } = useToast();
  const [clockActionPending, setClockActionPending] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  async function onMyPhotoSelected(blob: Blob, consent: boolean) {
    setPhotoBusy(true);
    try {
      await employeesApi.uploadMyPhoto(blob, consent);
      employee.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Photo upload failed.", "bad");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onMyPhotoRemoved() {
    setPhotoBusy(true);
    try {
      await employeesApi.deleteMyPhoto();
      employee.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Could not remove photo.", "bad");
    } finally {
      setPhotoBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = (attendance.data ?? []).find((record) => record.work_date === today);

  async function clockIn() {
    setClockActionPending(true);
    try {
      await attendanceApi.clockIn();
      attendance.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setClockActionPending(false);
    }
  }

  async function clockOut() {
    setClockActionPending(true);
    try {
      await attendanceApi.clockOut();
      attendance.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setClockActionPending(false);
    }
  }

  const latestPayslip = payslips.data
    ? [...payslips.data].sort((a, b) => (a.period_end < b.period_end ? 1 : -1))[0]
    : undefined;

  return (
    <div>
      <PageHeader title="My Workspace" subtitle="Payslips, leave, expenses, loans and benefits in one place" />

      {employee.loading ? <LoadingState /> : null}
      {employee.error ? <ErrorState message={employee.error} /> : null}
      {employee.data ? (
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <EmployeePhotoField
              name={employee.data.full_name}
              previewUrl={employee.data.photo_url}
              busy={photoBusy}
              onSelect={onMyPhotoSelected}
              onRemove={onMyPhotoRemoved}
            />
            <div>
              <div className="text-[15px] font-extrabold text-ink">{employee.data.full_name}</div>
              <div className="text-[12px] text-ink-soft">
                {employee.data.employee_number}
                {employee.data.job_title ? ` · ${employee.data.job_title}` : ""} · {employee.data.state_of_residence}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              {employee.data.tin ? <Badge tone="good">TIN Valid</Badge> : <Badge tone="bad">TIN Missing</Badge>}
              <StatusBadge status={employee.data.lifecycle_state} />
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiTile
          label="Leave Remaining"
          value={leaveBalance.data ? `${leaveBalance.data.remaining_days}d` : "—"}
          caption={leaveBalance.data ? `of ${leaveBalance.data.entitlement_days}d entitlement` : undefined}
        />
        <KpiTile
          label="Latest Net Pay"
          value={latestPayslip ? formatNaira(latestPayslip.net_minor) : "—"}
          caption={latestPayslip ? formatDate(latestPayslip.period_end) : undefined}
        />
        <KpiTile
          label="Active Loans"
          value={(loans.data ?? []).filter((loan) => loan.status === "active").length.toString()}
        />
        <KpiTile label="Benefits Enrolled" value={(benefits.data ?? []).length.toString()} />
      </div>

      {latestPayslip ? (
        <Card className="mt-6">
          <CardHeader
            title="Latest Payslip"
            subtitle={`${formatDate(latestPayslip.period_start)} – ${formatDate(latestPayslip.period_end)}`}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <PayslipFigure label="Gross" value={latestPayslip.gross_minor} />
            <PayslipFigure label="PAYE" value={latestPayslip.paye_minor} />
            <PayslipFigure label="Pension" value={latestPayslip.pension_employee_minor} />
            <PayslipFigure label="NHF" value={latestPayslip.nhf_minor} />
            <PayslipFigure label="Net" value={latestPayslip.net_minor} emphasize />
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Attendance"
            action={
              todayRecord?.clock_in_at && !todayRecord.clock_out_at ? (
                <Button onClick={clockOut} disabled={clockActionPending}>
                  {clockActionPending ? "Working…" : "Clock Out"}
                </Button>
              ) : !todayRecord?.clock_in_at ? (
                <Button onClick={clockIn} disabled={clockActionPending}>
                  {clockActionPending ? "Working…" : "Clock In"}
                </Button>
              ) : undefined
            }
          />
          {attendance.loading ? <LoadingState /> : null}
          {attendance.error ? <ErrorState message={attendance.error} /> : null}
          {todayRecord?.clock_in_at && todayRecord.clock_out_at ? (
            <p className="mb-3 text-[12px] text-ink-soft">
              Clocked in at {formatDateTime(todayRecord.clock_in_at)}, out at{" "}
              {formatDateTime(todayRecord.clock_out_at)}.
            </p>
          ) : null}
          {attendance.data && attendance.data.length === 0 ? (
            <EmptyState label="No attendance recorded yet." />
          ) : null}
          {attendance.data && attendance.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Clock In</Th>
                  <Th>Clock Out</Th>
                </tr>
              </Thead>
              <tbody>
                {[...attendance.data].reverse().slice(0, 7).map((record) => (
                  <tr key={record.id}>
                    <Td>{formatDate(record.work_date)}</Td>
                    <Td>{record.clock_in_at ? formatDateTime(record.clock_in_at) : "—"}</Td>
                    <Td>{record.clock_out_at ? formatDateTime(record.clock_out_at) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Leave Requests" />
          {leaveRequests.loading ? <LoadingState /> : null}
          {leaveRequests.error ? <ErrorState message={leaveRequests.error} /> : null}
          {leaveRequests.data && leaveRequests.data.length === 0 ? <EmptyState label="No leave requests yet." /> : null}
          {leaveRequests.data && leaveRequests.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Dates</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {leaveRequests.data.map((request) => (
                  <tr key={request.id}>
                    <Td>{titleCase(request.leave_type)}</Td>
                    <Td>
                      {formatDate(request.start_date)} – {formatDate(request.end_date)}
                    </Td>
                    <Td>
                      <StatusBadge status={request.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Expense Claims" />
          {expenses.loading ? <LoadingState /> : null}
          {expenses.error ? <ErrorState message={expenses.error} /> : null}
          {expenses.data && expenses.data.length === 0 ? <EmptyState label="No expense claims yet." /> : null}
          {expenses.data && expenses.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Category</Th>
                  <Th align="right">Amount</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {expenses.data.map((expense) => (
                  <tr key={expense.id}>
                    <Td>{expense.category}</Td>
                    <Td align="right">{formatNaira(expense.amount_minor)}</Td>
                    <Td>
                      <StatusBadge status={expense.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Loans & Advances" />
          {loans.loading ? <LoadingState /> : null}
          {loans.error ? <ErrorState message={loans.error} /> : null}
          {loans.data && loans.data.length === 0 ? <EmptyState label="No loans on record." /> : null}
          {loans.data && loans.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th align="right">Outstanding</Th>
                  <Th align="right">Installment</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {loans.data.map((loan) => (
                  <tr key={loan.id}>
                    <Td align="right">{formatNaira(loan.outstanding_minor)}</Td>
                    <Td align="right">{formatNaira(loan.installment_minor)}</Td>
                    <Td>
                      <StatusBadge status={loan.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Benefits" />
          {benefits.loading ? <LoadingState /> : null}
          {benefits.error ? <ErrorState message={benefits.error} /> : null}
          {benefits.data && benefits.data.length === 0 ? <EmptyState label="No benefits enrolled." /> : null}
          {benefits.data && benefits.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Plan</Th>
                  <Th>Frequency</Th>
                  <Th align="right">Value</Th>
                </tr>
              </Thead>
              <tbody>
                {benefits.data.map((benefit) => (
                  <tr key={benefit.id}>
                    <Td>{benefit.name}</Td>
                    <Td>{titleCase(benefit.frequency)}</Td>
                    <Td align="right">{benefit.value_minor != null ? formatNaira(benefit.value_minor) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Performance Reviews" />
          {performanceReviews.loading ? <LoadingState /> : null}
          {performanceReviews.error ? <ErrorState message={performanceReviews.error} /> : null}
          {performanceReviews.data && performanceReviews.data.length === 0 ? (
            <EmptyState label="No performance reviews on record yet." />
          ) : null}
          {performanceReviews.data && performanceReviews.data.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {performanceReviews.data.map((review) => (
                <PerformanceReviewItem
                  key={review.id}
                  review={review}
                  onAcknowledged={() => performanceReviews.reload()}
                />
              ))}
            </ul>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Learning" />
          {myEnrollments.loading ? <LoadingState /> : null}
          {myEnrollments.error ? <ErrorState message={myEnrollments.error} /> : null}
          {myEnrollments.data && myEnrollments.data.length === 0 ? (
            <EmptyState label="No training enrollments yet." />
          ) : null}
          {myEnrollments.data && myEnrollments.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Course</Th>
                  <Th>Status</Th>
                  <Th align="right">Score</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </Thead>
              <tbody>
                {myEnrollments.data.map((enrollment: TrainingEnrollment) => (
                  <tr key={enrollment.id}>
                    <Td>{coursesById.get(enrollment.course_id)?.title ?? "—"}</Td>
                    <Td>
                      <StatusBadge status={enrollment.status} />
                    </Td>
                    <Td align="right">{enrollment.score != null ? `${enrollment.score}/100` : "—"}</Td>
                    <Td align="right">
                      {enrollment.status === "enrolled" || enrollment.status === "in_progress" ? (
                        <Button size="md" variant="secondary" onClick={() => setTakingQuizFor(enrollment)}>
                          Take Quiz
                        </Button>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
          {takingQuizFor ? (
            <QuizTaker
              enrollment={takingQuizFor}
              courseTitle={coursesById.get(takingQuizFor.course_id)?.title ?? "Course"}
              onClose={() => setTakingQuizFor(null)}
              onCompleted={() => {
                setTakingQuizFor(null);
                myEnrollments.reload();
              }}
            />
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Union Membership" />
          {unionMemberships.loading ? <LoadingState /> : null}
          {unionMemberships.error ? <ErrorState message={unionMemberships.error} /> : null}
          {unionMemberships.data && unionMemberships.data.length === 0 ? (
            <EmptyState label="No union membership on record." />
          ) : null}
          {unionMemberships.data && unionMemberships.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Union</Th>
                  <Th align="right">Monthly Dues</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {unionMemberships.data.map((membership) => (
                  <tr key={membership.id}>
                    <Td>{membership.union_name}</Td>
                    <Td align="right">{formatNaira(membership.monthly_dues_minor)}</Td>
                    <Td>
                      <Badge tone={membership.status === "active" ? "good" : membership.status === "suspended" ? "warn" : "neutral"}>
                        {membership.status}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="My Assets" />
          {myAssets.loading ? <LoadingState /> : null}
          {myAssets.error ? <ErrorState message={myAssets.error} /> : null}
          {myAssets.data && myAssets.data.length === 0 ? (
            <EmptyState label="No company assets currently assigned to you." />
          ) : null}
          {myAssets.data && myAssets.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Asset</Th>
                  <Th>Tag</Th>
                  <Th>Assigned</Th>
                </tr>
              </Thead>
              <tbody>
                {myAssets.data.map((assignment) => (
                  <tr key={assignment.id}>
                    <Td>{assetsById.get(assignment.asset_id)?.name ?? "—"}</Td>
                    <Td>{assetsById.get(assignment.asset_id)?.asset_tag ?? "—"}</Td>
                    <Td>{formatDate(assignment.assigned_date)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="My Documents" />
          {myDocuments.loading ? <LoadingState /> : null}
          {myDocuments.error ? <ErrorState message={myDocuments.error} /> : null}
          {myDocuments.data && myDocuments.data.length === 0 ? (
            <EmptyState label="No documents issued to you yet." />
          ) : null}
          {myDocuments.data && myDocuments.data.length > 0 ? (
            <div className="flex flex-col gap-3">
              {myDocuments.data.map((doc) => (
                <div key={doc.id} className="rounded-panel border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-ink">{titleCase(doc.document_type)}</div>
                      <StatusBadge status={doc.status} />
                    </div>
                    <div className="flex gap-2">
                      {doc.status === "sent_for_signature" ? (
                        <Button size="md" onClick={() => setSigningDocumentId(doc.id)}>
                          Sign
                        </Button>
                      ) : null}
                      <Button
                        size="md"
                        variant="secondary"
                        onClick={() => generatedDocumentsApi.downloadPdf(doc.id, "document.pdf")}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                  {signingDocumentId === doc.id ? (
                    <SignDocumentForm
                      documentId={doc.id}
                      onCancel={() => setSigningDocumentId(null)}
                      onSigned={() => {
                        setSigningDocumentId(null);
                        myDocuments.reload();
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Company Policies" />
          {policies.loading ? <LoadingState /> : null}
          {policies.error ? <ErrorState message={policies.error} /> : null}
          {policies.data && policies.data.length === 0 ? <EmptyState label="No policies published yet." /> : null}
          {policies.data && policies.data.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {policies.data.map((policy) => (
                <li key={policy.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{policy.title}</span>
                    {policy.category ? <Badge>{policy.category}</Badge> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-ink-soft">{policy.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function PerformanceReviewItem({
  review,
  onAcknowledged,
}: {
  review: PerformanceReview;
  onAcknowledged: () => void;
}) {
  const { showToast } = useToast();
  const [comments, setComments] = useState("");
  const [acknowledging, setAcknowledging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function acknowledge() {
    setSubmitting(true);
    try {
      await performanceReviewsApi.acknowledge(review.id, { employee_comments: comments || null });
      showToast("Review acknowledged", "good");
      onAcknowledged();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-ink">
          {formatDate(review.period_start)} – {formatDate(review.period_end)}
        </span>
        <div className="flex items-center gap-2">
          {review.rating != null ? (
            <span className="text-[12px] text-ink-soft">{review.rating}/5</span>
          ) : null}
          <StatusBadge status={review.status} />
        </div>
      </div>
      {review.manager_comments ? (
        <p className="mt-1 text-[12px] text-ink-soft">{review.manager_comments}</p>
      ) : null}
      {review.status === "submitted" ? (
        acknowledging ? (
          <div className="mt-2 flex flex-col gap-2">
            <Textarea
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              placeholder="Optional comments"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button size="md" variant="secondary" onClick={() => setAcknowledging(false)}>
                Cancel
              </Button>
              <Button size="md" onClick={acknowledge} disabled={submitting}>
                {submitting ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <Button size="md" variant="secondary" onClick={() => setAcknowledging(true)}>
              Acknowledge
            </Button>
          </div>
        )
      ) : null}
      {review.employee_comments ? (
        <p className="mt-1 text-[12px] italic text-ink-soft">“{review.employee_comments}”</p>
      ) : null}
    </li>
  );
}

function PayslipFigure({ label, value, emphasize }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">{label}</div>
      <div className={`mt-1 text-[15px] font-extrabold ${emphasize ? "text-primary" : "text-ink"}`}>
        {formatNaira(value)}
      </div>
    </div>
  );
}

function QuizTaker({
  enrollment,
  courseTitle,
  onClose,
  onCompleted,
}: {
  enrollment: TrainingEnrollment;
  courseTitle: string;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const { showToast } = useToast();
  const quizzes = useApiResource(() => quizzesApi.forCourse(enrollment.course_id), [enrollment.course_id]);
  const quiz = quizzes.data?.[0] ?? null;
  const attachments = useApiResource(
    () => trainingCourseAttachmentsApi.forCourse(enrollment.course_id),
    [enrollment.course_id],
  );
  const questions = useApiResource(
    () => (quiz ? quizzesApi.questionsForAttempt(quiz.id) : Promise.resolve([])),
    [quiz?.id],
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  async function submit() {
    if (!quiz || !questions.data) return;
    if (Object.keys(answers).length !== questions.data.length) {
      showToast("Answer every question before submitting.", "bad");
      return;
    }
    setSubmitting(true);
    try {
      const orderedAnswers = questions.data.map((q) => answers[q.id]!);
      const attempt = await quizzesApi.submitAttempt(quiz.id, { answers: orderedAnswers });
      setResult({ score: attempt.score, passed: attempt.passed });
      if (attempt.passed) onCompleted();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-panel border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-extrabold text-ink">Quiz — {courseTitle}</h3>
        <Button size="md" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>

      {attachments.data && attachments.data.length > 0 ? (
        <div className="mb-4 flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Materials</span>
          {attachments.data.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.storage_url}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] font-bold text-primary hover:underline"
            >
              {attachment.title}
            </a>
          ))}
        </div>
      ) : null}

      {quizzes.loading || questions.loading ? <LoadingState /> : null}
      {!quizzes.loading && !quiz ? (
        <EmptyState label="No quiz has been set up for this course yet." />
      ) : null}

      {result ? (
        <div className="flex flex-col gap-3">
          <Badge tone={result.passed ? "good" : "bad"}>
            {result.passed ? "Passed" : "Not Passed"} — Score {result.score}%
          </Badge>
          {!result.passed ? (
            <p className="text-[12px] text-ink-soft">
              You can retake the quiz — a new attempt is recorded each time.
            </p>
          ) : null}
        </div>
      ) : quiz && questions.data && questions.data.length > 0 ? (
        <div className="flex flex-col gap-4">
          {questions.data.map((question, index) => (
            <div key={question.id}>
              <p className="mb-2 text-[13px] font-bold text-ink">
                {index + 1}. {question.question_text}
              </p>
              <div className="flex flex-col gap-1.5">
                {question.options.map((option, optionIndex) => (
                  <label key={optionIndex} className="flex items-center gap-2 text-[13px] text-ink">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === optionIndex}
                      onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Quiz"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SignDocumentForm({
  documentId,
  onCancel,
  onSigned,
}: {
  documentId: string;
  onCancel: () => void;
  onSigned: () => void;
}) {
  const { showToast } = useToast();
  const [signedByName, setSignedByName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await generatedDocumentsApi.sign(documentId, { signed_by_name: signedByName });
      showToast("Document signed", "good");
      onSigned();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex items-end gap-3 border-t border-border pt-3">
      <div className="flex-1">
        <Label htmlFor={`sign-${documentId}`}>Type your full name to sign</Label>
        <Input
          id={`sign-${documentId}`}
          value={signedByName}
          onChange={(event) => setSignedByName(event.target.value)}
          required
        />
      </div>
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Signing…" : "Confirm Signature"}
      </Button>
    </form>
  );
}

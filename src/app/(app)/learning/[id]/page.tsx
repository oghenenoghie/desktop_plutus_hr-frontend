"use client";

import { use, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import {
  employeesApi,
  quizzesApi,
  trainingCourseAttachmentsApi,
  trainingCoursesApi,
  trainingEnrollmentsApi,
} from "@/lib/api/endpoints";
import { formatDate, formatDateTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Quiz, TrainingEnrollmentStatus } from "@/lib/types";

const ENROLLMENT_STATUSES: TrainingEnrollmentStatus[] = [
  "enrolled",
  "in_progress",
  "completed",
  "failed",
];

export default function TrainingCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { showToast } = useToast();
  const course = useApiResource(() => trainingCoursesApi.get(id), [id]);
  const enrollments = useApiResource(() => trainingCoursesApi.enrollments(id), [id]);
  const employees = useApiResource(() => employeesApi.list());
  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const [enrolling, setEnrolling] = useState(false);

  async function updateEnrollment(enrollmentId: string, status: TrainingEnrollmentStatus) {
    try {
      await trainingEnrollmentsApi.update(enrollmentId, {
        status,
        completed_date:
          status === "completed" ? new Date().toISOString().slice(0, 10) : undefined,
      });
      showToast("Enrollment updated", "good");
      enrollments.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function updateScore(enrollmentId: string, score: string) {
    try {
      await trainingEnrollmentsApi.update(enrollmentId, {
        score: score ? Number(score) : null,
      });
      enrollments.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      {course.loading ? <LoadingState /> : null}
      {course.error ? <ErrorState message={course.error} /> : null}
      {course.data ? (
        <>
          <PageHeader
            title={course.data.title}
            subtitle={
              [course.data.provider, course.data.duration_hours != null ? `${course.data.duration_hours}h` : null]
                .filter(Boolean)
                .join(" · ") || "No provider or duration recorded"
            }
          />

          {course.data.description ? (
            <Card className="mb-6">
              <p className="whitespace-pre-wrap text-[13px] text-ink-soft">{course.data.description}</p>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Enrollments" action={<Button onClick={() => setEnrolling(true)}>Enroll Employee</Button>} />
            {enrollments.loading ? <LoadingState /> : null}
            {enrollments.error ? <ErrorState message={enrollments.error} /> : null}
            {enrollments.data && enrollments.data.length === 0 ? (
              <EmptyState label="No enrollments yet." />
            ) : null}
            {enrollments.data && enrollments.data.length > 0 ? (
              <Table>
                <Thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th>Enrolled</Th>
                    <Th>Completed</Th>
                    <Th>Status</Th>
                    <Th align="right">Score</Th>
                  </tr>
                </Thead>
                <tbody>
                  {enrollments.data.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <Td className="font-bold">
                        {employeesById.get(enrollment.employee_id)?.full_name ?? "—"}
                      </Td>
                      <Td>{formatDate(enrollment.enrolled_date)}</Td>
                      <Td>{enrollment.completed_date ? formatDate(enrollment.completed_date) : "—"}</Td>
                      <Td>
                        <Select
                          value={enrollment.status}
                          onChange={(event) =>
                            updateEnrollment(enrollment.id, event.target.value as TrainingEnrollmentStatus)
                          }
                          className="w-auto"
                        >
                          {ENROLLMENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td align="right">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={enrollment.score ?? ""}
                          onBlur={(event) => updateScore(enrollment.id, event.target.value)}
                          className="w-20 text-right"
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
          </Card>

          {enrolling ? (
            <EnrollEmployeeModal
              courseId={id}
              onClose={() => setEnrolling(false)}
              onEnrolled={() => {
                setEnrolling(false);
                enrollments.reload();
              }}
            />
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <AttachmentsCard courseId={id} />
            <QuizCard courseId={id} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function AttachmentsCard({ courseId }: { courseId: string }) {
  const attachments = useApiResource(() => trainingCourseAttachmentsApi.forCourse(courseId), [courseId]);
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [storageUrl, setStorageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await trainingCourseAttachmentsApi.create(courseId, { title, storage_url: storageUrl });
      setTitle("");
      setStorageUrl("");
      setAdding(false);
      attachments.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Materials" action={<Button onClick={() => setAdding((v) => !v)}>Add Material</Button>} />
      {attachments.loading ? <LoadingState /> : null}
      {attachments.error ? <ErrorState message={attachments.error} /> : null}
      {attachments.data && attachments.data.length === 0 && !adding ? (
        <EmptyState label="No materials attached yet." />
      ) : null}
      {attachments.data && attachments.data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {attachments.data.map((attachment) => (
            <li key={attachment.id}>
              <a
                href={attachment.storage_url}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-bold text-primary hover:underline"
              >
                {attachment.title}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {adding ? (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <div>
            <Label htmlFor="materialTitle">Title</Label>
            <Input id="materialTitle" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="materialUrl">File URL</Label>
            <Input
              id="materialUrl"
              value={storageUrl}
              onChange={(event) => setStorageUrl(event.target.value)}
              placeholder="https://…"
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Add"}
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}

function QuizCard({ courseId }: { courseId: string }) {
  const quizzes = useApiResource(() => quizzesApi.forCourse(courseId), [courseId]);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const quiz = quizzes.data?.[0] ?? null;

  return (
    <Card>
      <CardHeader
        title="Quiz"
        action={!quiz ? <Button onClick={() => setCreatingQuiz(true)}>Create Quiz</Button> : undefined}
      />
      {quizzes.loading ? <LoadingState /> : null}
      {quizzes.error ? <ErrorState message={quizzes.error} /> : null}
      {!quizzes.loading && !quiz ? <EmptyState label="No quiz set up for this course yet." /> : null}
      {quiz ? <QuizDetail quiz={quiz} /> : null}

      {creatingQuiz ? (
        <NewQuizModal
          courseId={courseId}
          onClose={() => setCreatingQuiz(false)}
          onCreated={() => {
            setCreatingQuiz(false);
            quizzes.reload();
          }}
        />
      ) : null}
    </Card>
  );
}

function NewQuizModal({
  courseId,
  onClose,
  onCreated,
}: {
  courseId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [passingScore, setPassingScore] = useState("70");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await quizzesApi.create(courseId, { title, passing_score: Number(passingScore) });
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Quiz" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="quizTitle">Title</Label>
          <Input id="quizTitle" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Final Quiz" required />
        </div>
        <div>
          <Label htmlFor="passingScore">Passing Score (%)</Label>
          <Input
            id="passingScore"
            type="number"
            min={0}
            max={100}
            value={passingScore}
            onChange={(event) => setPassingScore(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Quiz"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function QuizDetail({ quiz }: { quiz: Quiz }) {
  const questions = useApiResource(() => quizzesApi.questions(quiz.id), [quiz.id]);
  const attempts = useApiResource(() => quizzesApi.attempts(quiz.id), [quiz.id]);
  const employees = useApiResource(() => employeesApi.list());
  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const [addingQuestion, setAddingQuestion] = useState(false);

  return (
    <div>
      <p className="mb-3 text-[13px] text-ink-soft">
        <span className="font-bold text-ink">{quiz.title}</span> · passing score {quiz.passing_score}%
      </p>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Questions</span>
          <Button size="md" variant="secondary" onClick={() => setAddingQuestion(true)}>
            Add Question
          </Button>
        </div>
        {questions.loading ? <LoadingState /> : null}
        {questions.data && questions.data.length === 0 ? <EmptyState label="No questions yet." /> : null}
        {questions.data && questions.data.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {questions.data.map((question, index) => (
              <li key={question.id} className="text-[13px]">
                <span className="font-bold">
                  {index + 1}. {question.question_text}
                </span>
                <div className="text-[12px] text-ink-soft">
                  {question.options.map((option, optionIndex) => (
                    <span key={optionIndex}>
                      {optionIndex === question.correct_option_index ? (
                        <Badge tone="good">{option}</Badge>
                      ) : (
                        <span className="mr-1">{option}</span>
                      )}
                      {optionIndex < question.options.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {attempts.data && attempts.data.length > 0 ? (
        <div>
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
            Attempts
          </span>
          <Table>
            <Thead>
              <tr>
                <Th>Employee</Th>
                <Th>When</Th>
                <Th align="right">Score</Th>
                <Th>Result</Th>
              </tr>
            </Thead>
            <tbody>
              {attempts.data.map((attempt) => (
                <tr key={attempt.id}>
                  <Td>{employeesById.get(attempt.employee_id)?.full_name ?? "—"}</Td>
                  <Td>{formatDateTime(attempt.created_at)}</Td>
                  <Td align="right">{attempt.score}%</Td>
                  <Td>
                    <StatusBadge status={attempt.passed ? "approved" : "rejected"} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : null}

      {addingQuestion ? (
        <NewQuestionModal
          quizId={quiz.id}
          onClose={() => setAddingQuestion(false)}
          onCreated={() => {
            setAddingQuestion(false);
            questions.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function NewQuestionModal({
  quizId,
  onClose,
  onCreated,
}: {
  quizId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [questionText, setQuestionText] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const options = optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await quizzesApi.addQuestion(quizId, {
        question_text: questionText,
        options,
        correct_option_index: correctOptionIndex,
      });
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Question" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="questionText">Question</Label>
          <Textarea
            id="questionText"
            value={questionText}
            onChange={(event) => setQuestionText(event.target.value)}
            rows={2}
            required
          />
        </div>
        <div>
          <Label htmlFor="optionsText">Options (one per line, at least two)</Label>
          <Textarea
            id="optionsText"
            value={optionsText}
            onChange={(event) => setOptionsText(event.target.value)}
            rows={4}
            required
          />
        </div>
        <div>
          <Label htmlFor="correctOptionIndex">Correct Option</Label>
          <Select
            id="correctOptionIndex"
            value={correctOptionIndex}
            onChange={(event) => setCorrectOptionIndex(Number(event.target.value))}
          >
            {options.length === 0 ? <option value={0}>Add options above first</option> : null}
            {options.map((option, index) => (
              <option key={index} value={index}>
                {option}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || options.length < 2}>
            {submitting ? "Adding…" : "Add Question"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EnrollEmployeeModal({
  courseId,
  onClose,
  onEnrolled,
}: {
  courseId: string;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const { showToast } = useToast();
  const employees = useApiResource(() => employeesApi.list());
  const [employeeId, setEmployeeId] = useState("");
  const [enrolledDate, setEnrolledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await trainingCoursesApi.enroll(courseId, {
        employee_id: employeeId,
        enrolled_date: enrolledDate,
      });
      showToast("Employee enrolled", "good");
      onEnrolled();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Enroll Employee" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="employee">Employee</Label>
          <Select
            id="employee"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            required
          >
            <option value="">Select an employee</option>
            {(employees.data ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="enrolled-date">Enrolled Date</Label>
          <Input
            id="enrolled-date"
            type="date"
            value={enrolledDate}
            onChange={(event) => setEnrolledDate(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Enrolling…" : "Enroll"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { attendanceApi } from "./attendance.api";
import { api, ApiResponse } from "./api";
import { classApi, ClassItem } from "./class.api";
import { examApi } from "./exam.api";
import { homeworkApi } from "./homework.api";

export type ScoreComponent = string;

export interface ScoreRow {
  studentClassId?: number;
  studentId: number;
  studentCode?: string | null;
  studentName?: string | null;
  attendanceScore: number;
  homeworkScore: number;
  examScore: number;
  averageScore: number;
  componentScores: Record<string, number>;
  rawComponentScores: Record<string, number>;
  rawAttendanceScore: number;
  rawHomeworkScore: number;
  rawExamScore: number;
  attendanceSummary: string;
  homeworkSummary: string;
  examSummary: string;
}

export interface ScoreOverrideMap {
  [studentId: number]: Partial<Record<ScoreComponent, number>>;
}

export interface GradeComponentDto {
  id: number;
  courseId: number;
  code: string;
  name: string;
  weight: number;
  sortOrder: number;
  isSystem: boolean;
}

export interface StudentGradeOverrideDto {
  id: number;
  studentClassId: number;
  studentId: number;
  gradeComponentId: number;
  componentCode: string;
  score: number;
}

export interface ClassGradeSettingsDto {
  classId: number;
  courseId: number;
  components: GradeComponentDto[];
  overrides: StudentGradeOverrideDto[];
}

export interface GradeComponentSaveDto {
  id?: number;
  code?: string;
  name: string;
  weight: number;
  sortOrder: number;
  isSystem: boolean;
}

export interface StudentGradeOverrideSaveDto {
  studentClassId: number;
  gradeComponentId: number;
  score?: number | null;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

const normalizeScore = (score?: number | null, total?: number | null) => {
  if (score === null || score === undefined || !total || total <= 0) return 0;
  return Math.max(0, Math.min(10, (Number(score) / Number(total)) * 10));
};

export const studentGradeApi = {
  getSettings(classId: number): Promise<ApiResponse<ClassGradeSettingsDto>> {
    return api.get<ClassGradeSettingsDto>(`/api/StudentGrade/class/${classId}/settings`);
  },

  getCourseComponents(courseId: number): Promise<ApiResponse<GradeComponentDto[]>> {
    return api.get<GradeComponentDto[]>(`/api/StudentGrade/course/${courseId}/components`);
  },

  saveCourseComponents(courseId: number, components: GradeComponentSaveDto[]): Promise<ApiResponse<GradeComponentDto[]>> {
    return api.put<GradeComponentDto[]>(`/api/StudentGrade/course/${courseId}/components`, { components });
  },

  saveOverrides(classId: number, overrides: StudentGradeOverrideSaveDto[]): Promise<ApiResponse<StudentGradeOverrideDto[]>> {
    return api.put<StudentGradeOverrideDto[]>(`/api/StudentGrade/class/${classId}/overrides`, { overrides });
  },
};

export async function buildClassScoreRows(classId: number, overrides: ScoreOverrideMap = {}) {
  const classRes = await classApi.getById(classId);
  if (!classRes.success || !classRes.data) {
    throw new Error(classRes.message || "Không thể tải lớp học");
  }

  const classDetail = classRes.data as ClassItem & {
    studentClasses?: {
      id?: number;
      studentId: number;
      student?: {
        id: number;
        code?: string | null;
        name?: string | null;
      } | null;
    }[];
  };

  const students = classDetail.studentClasses || [];

  const [attendanceRes, homeworkRes, examRes] = await Promise.all([
    attendanceApi.getReportByClassId(classId).catch(() => null),
    homeworkApi.getHomeworkByClass(classId).catch(() => null),
    examApi.getAll(1, 200, { classId }).catch(() => null),
  ]);

  const attendanceRows = attendanceRes?.success ? attendanceRes.data?.students || [] : [];
  const homeworks = homeworkRes?.success ? Array.from(homeworkRes.data || []) : [];
  const exams = examRes?.success ? examRes.data?.items || [] : [];

  const homeworkSubmissionPairs = await Promise.all(
    homeworks.map(async (homework) => {
      const res = await homeworkApi.getSubmissions(homework.id).catch(() => null);
      return {
        homework,
        submissions: res?.success ? Array.from(res.data || []) : [],
      };
    })
  );

  const examAttemptPairs = await Promise.all(
    exams.map(async (exam) => {
      const res = await examApi.getAttemptsByExam(exam.id).catch(() => null);
      return {
        exam,
        attempts: res?.success ? res.data || [] : [],
      };
    })
  );

  return students.map((sc) => {
    const studentId = sc.student?.id || sc.studentId;
    const attendanceRow = attendanceRows.find((row) => row.studentId === studentId);
    const takenAttendances = attendanceRow?.attendances.filter((item) => item.status !== -1) || [];
    const attendedCount = takenAttendances.filter((item) => item.status !== 0).length;
    const attendanceRaw = takenAttendances.length ? (attendedCount / takenAttendances.length) * 10 : 0;

    const homeworkScores = homeworkSubmissionPairs.map(({ homework, submissions }) => {
      const submission = submissions.find((item) => item.studentId === studentId);
      return normalizeScore(submission?.score, homework.totalScore);
    });
    const homeworkRaw = homeworkScores.length
      ? homeworkScores.reduce((sum, value) => sum + value, 0) / homeworkScores.length
      : 0;

    const examScores = examAttemptPairs.map(({ exam, attempts }) => {
      const studentAttempts = attempts.filter((item) => item.studentId === studentId);
      const bestScore = studentAttempts.reduce(
        (max, item) => Math.max(max, normalizeScore(item.score, exam.totalScore || 10)),
        0
      );
      return bestScore;
    });
    const examRaw = examScores.length
      ? examScores.reduce((sum, value) => sum + value, 0) / examScores.length
      : 0;

    const studentOverrides = overrides[studentId] || {};
    const rawComponentScores = {
      attendance: round1(attendanceRaw),
      homework: round1(homeworkRaw),
      exam: round1(examRaw),
    };
    const componentScores: Record<string, number> = {
      attendance: round1(studentOverrides.attendance ?? attendanceRaw),
      homework: round1(studentOverrides.homework ?? homeworkRaw),
      exam: round1(studentOverrides.exam ?? examRaw),
    };

    Object.entries(studentOverrides).forEach(([componentId, value]) => {
      if (value !== undefined && value !== null) {
        componentScores[componentId] = round1(value);
      }
    });

    const attendanceScore = componentScores.attendance ?? 0;
    const homeworkScore = componentScores.homework ?? 0;
    const examScore = componentScores.exam ?? 0;
    const averageScore = round1((attendanceScore + homeworkScore + examScore) / 3);

    return {
      studentClassId: sc.id,
      studentId,
      studentCode: sc.student?.code,
      studentName: sc.student?.name,
      attendanceScore,
      homeworkScore,
      examScore,
      averageScore,
      componentScores,
      rawComponentScores,
      rawAttendanceScore: round1(attendanceRaw),
      rawHomeworkScore: round1(homeworkRaw),
      rawExamScore: round1(examRaw),
      attendanceSummary: `${attendedCount}/${takenAttendances.length || 0} buổi`,
      homeworkSummary: `${homeworkSubmissionPairs.length} bài`,
      examSummary: `${examAttemptPairs.length} bài`,
    } satisfies ScoreRow;
  });
}

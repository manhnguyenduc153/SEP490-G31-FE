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
  homeworkScore: number;
  examScore: number;
  averageScore: number;
  componentScores: Record<string, number>;
  rawComponentScores: Record<string, number>;
  rawComponentHasScore: Record<string, boolean>;
  rawHomeworkScore: number;
  rawExamScore: number;
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

export interface MyGradeComponentScoreDto {
  gradeComponentId: number;
  componentCode: string;
  componentName: string;
  weight: number;
  score: number;
  rawScore: number;
  isOverride: boolean;
}

export interface MyGradeClassDto {
  classId: number;
  classCode?: string | null;
  className?: string | null;
  courseId?: number | null;
  courseCode?: string | null;
  courseName?: string | null;
  averageScore: number;
  components: MyGradeComponentScoreDto[];
}

const round1 = (value: number) => Math.round(value * 10) / 10;

const normalizeScore = (score?: number | null, total?: number | null) => {
  if (score === null || score === undefined || !total || total <= 0) return 0;
  return Math.max(0, Math.min(10, (Number(score) / Number(total)) * 10));
};

type ExamSkillCode = "listening" | "reading" | "speaking" | "writing";

const examSkillCodeByType: Record<number, ExamSkillCode> = {
  1: "listening",
  2: "reading",
  3: "speaking",
  4: "writing",
};

const getExamSkillCode = (questions?: Array<{ skillType?: number | null }>): ExamSkillCode | null => {
  const skillCodes = new Set(
    (questions || [])
      .map((question) => examSkillCodeByType[Number(question.skillType)])
      .filter((skillCode): skillCode is ExamSkillCode => Boolean(skillCode))
  );

  return skillCodes.size === 1 ? Array.from(skillCodes)[0] : null;
};

const averageScores = (scores: number[]) =>
  scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;

export const studentGradeApi = {
  getSettings(classId: number): Promise<ApiResponse<ClassGradeSettingsDto>> {
    return api.get<ClassGradeSettingsDto>(`/api/StudentGrade/class/${classId}/settings`);
  },

  getMyGrades(): Promise<ApiResponse<MyGradeClassDto[]>> {
    return api.get<MyGradeClassDto[]>("/api/StudentGrade/my");
  },

  getChildGrades(studentId: number): Promise<ApiResponse<MyGradeClassDto[]>> {
    return api.get<MyGradeClassDto[]>(`/api/StudentGrade/child-grades?studentId=${studentId}`);
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

  const [homeworkRes, examRes] = await Promise.all([
    homeworkApi.getHomeworkByClass(classId).catch(() => null),
    examApi.getAll(1, 200, { classId }).catch(() => null),
  ]);

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
      const [detailRes, attemptsRes] = await Promise.all([
        examApi.getById(exam.id).catch(() => null),
        examApi.getAttemptsByExam(exam.id).catch(() => null),
      ]);
      const detailedExam = detailRes?.success && detailRes.data ? detailRes.data : exam;

      return {
        exam: detailedExam,
        skillCode: getExamSkillCode(detailedExam.questions),
        attempts: attemptsRes?.success ? attemptsRes.data || [] : [],
      };
    })
  );

  return students.map((sc) => {
    const studentId = sc.student?.id || sc.studentId;

    const homeworkScores = homeworkSubmissionPairs.map(({ homework, submissions }) => {
      const submission = submissions.find((item) => item.studentId === studentId);
      return normalizeScore(submission?.score, homework.totalScore);
    });
    const hasHomeworkScore = homeworkSubmissionPairs.some(({ submissions }) => {
      const submission = submissions.find((item) => item.studentId === studentId);
      return submission?.score !== null && submission?.score !== undefined;
    });
    const homeworkRaw = homeworkScores.length
      ? homeworkScores.reduce((sum, value) => sum + value, 0) / homeworkScores.length
      : 0;

    const examScoresBySkill: Record<ExamSkillCode, number[]> = {
      listening: [],
      reading: [],
      speaking: [],
      writing: [],
    };
    const examHasScoreBySkill: Record<ExamSkillCode, boolean> = {
      listening: false,
      reading: false,
      speaking: false,
      writing: false,
    };
    let hasExamScore = false;

    const examScores = examAttemptPairs.map(({ exam, skillCode, attempts }) => {
      const studentAttempts = attempts.filter((item) => item.studentId === studentId);
      const hasScoredAttempt = studentAttempts.some((item) => item.score !== null && item.score !== undefined);
      const bestScore = studentAttempts.reduce(
        (max, item) => Math.max(max, normalizeScore(item.score, exam.totalScore || 10)),
        0
      );
      hasExamScore = hasExamScore || hasScoredAttempt;

      if (skillCode) {
        examScoresBySkill[skillCode].push(bestScore);
        examHasScoreBySkill[skillCode] = examHasScoreBySkill[skillCode] || hasScoredAttempt;
      }

      return bestScore;
    });
    const examRaw = averageScores(examScores);
    const listeningRaw = averageScores(examScoresBySkill.listening);
    const readingRaw = averageScores(examScoresBySkill.reading);
    const speakingRaw = averageScores(examScoresBySkill.speaking);
    const writingRaw = averageScores(examScoresBySkill.writing);

    const studentOverrides = overrides[studentId] || {};
    const rawComponentScores = {
      homework: round1(homeworkRaw),
      listening: round1(listeningRaw),
      reading: round1(readingRaw),
      speaking: round1(speakingRaw),
      writing: round1(writingRaw),
      exam: round1(examRaw),
    };
    const rawComponentHasScore: Record<string, boolean> = {
      homework: hasHomeworkScore,
      listening: examHasScoreBySkill.listening,
      reading: examHasScoreBySkill.reading,
      speaking: examHasScoreBySkill.speaking,
      writing: examHasScoreBySkill.writing,
      exam: hasExamScore,
    };
    const componentScores: Record<string, number> = {
      homework: round1(studentOverrides.homework ?? homeworkRaw),
      listening: round1(studentOverrides.listening ?? listeningRaw),
      reading: round1(studentOverrides.reading ?? readingRaw),
      speaking: round1(studentOverrides.speaking ?? speakingRaw),
      writing: round1(studentOverrides.writing ?? writingRaw),
      exam: round1(studentOverrides.exam ?? examRaw),
    };

    Object.entries(studentOverrides).forEach(([componentId, value]) => {
      if (value !== undefined && value !== null) {
        componentScores[componentId] = round1(value);
      }
    });

    const homeworkScore = componentScores.homework ?? 0;
    const examScore = componentScores.exam ?? 0;
    const averageScore = round1((homeworkScore + examScore) / 2);

    return {
      studentClassId: sc.id,
      studentId,
      studentCode: sc.student?.code,
      studentName: sc.student?.name,
      homeworkScore,
      examScore,
      averageScore,
      componentScores,
      rawComponentScores,
      rawComponentHasScore,
      rawHomeworkScore: round1(homeworkRaw),
      rawExamScore: round1(examRaw),
      homeworkSummary: `${homeworkSubmissionPairs.length} bài`,
      examSummary: `${examAttemptPairs.length} bài`,
    } satisfies ScoreRow;
  });
}

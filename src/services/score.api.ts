import { api, ApiResponse } from "./api";
import { classApi, ClassItem } from "./class.api";
import { examApi } from "./exam.api";

export type ScoreComponent = string;

export interface ScoreRow {
  studentClassId?: number;
  studentId: number;
  studentCode?: string | null;
  studentName?: string | null;
  examScore: number;
  averageScore: number;
  componentScores: Record<string, number>;
  rawComponentScores: Record<string, number>;
  rawComponentHasScore: Record<string, boolean>;
  rawExamScore: number;
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
  band?: number | null; // average IELTS band across exams of this skill, when computable
}

export interface MyGradeHomeworkDto {
  id: number;
  title: string;
  totalScore: number;
  score?: number | null;
  normalizedScore?: number | null;
}

export interface MyGradeExamDto {
  id: number;
  title: string;
  totalScore: number;
  score?: number | null;
  normalizedScore?: number | null;
  band?: number | null; // IELTS band for this exam, when computable
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
  homeworks?: MyGradeHomeworkDto[];
  exams?: MyGradeExamDto[];
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

  const examRes = await examApi.getAll(1, 200, { classId }).catch(() => null);
  const exams = examRes?.success ? examRes.data?.items || [] : [];

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
      listening: round1(listeningRaw),
      reading: round1(readingRaw),
      speaking: round1(speakingRaw),
      writing: round1(writingRaw),
      exam: round1(examRaw),
    };
    const rawComponentHasScore: Record<string, boolean> = {
      listening: examHasScoreBySkill.listening,
      reading: examHasScoreBySkill.reading,
      speaking: examHasScoreBySkill.speaking,
      writing: examHasScoreBySkill.writing,
      exam: hasExamScore,
    };
    const componentScores: Record<string, number> = {
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

    const examScore = componentScores.exam ?? 0;
    const averageScore = round1(averageScores([
      componentScores.listening ?? 0,
      componentScores.reading ?? 0,
      componentScores.speaking ?? 0,
      componentScores.writing ?? 0,
    ]));

    return {
      studentClassId: sc.id,
      studentId,
      studentCode: sc.student?.code,
      studentName: sc.student?.name,
      examScore,
      averageScore,
      componentScores,
      rawComponentScores,
      rawComponentHasScore,
      rawExamScore: round1(examRaw),
      examSummary: `${examAttemptPairs.length} bài`,
    } satisfies ScoreRow;
  });
}

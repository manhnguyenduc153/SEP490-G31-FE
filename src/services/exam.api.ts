import { api, ApiResponse } from "./api";
import { QuestionItem } from "./question.api";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface ExamItem {
  id: number;
  code: string;
  name: string;
  title: string;
  description?: string;
  classId?: number | null;
  className?: string | null;
  scheduleId?: number | null;
  type: number; // 1 = Assigned Exam, 2 = Template Exam
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  totalScore?: number | null;
  passingScore?: number | null;
  maxAttempts?: number | null;
  allowLateSubmit: boolean;
  shuffleQuestion: boolean;
  showAnswerAfter: boolean;
  status: number; // 1 = Published, 2 = Draft
  createdAt: string;
  questionCount: number;
  submissionCount: number;
  latestScore?: number | null;
  isGraded?: boolean;
  questionIds: number[];
  questions?: QuestionItem[];
}

export interface ExamPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: ExamItem[];
}

export interface ExamSaveDto {
  id?: number;
  title: string;
  description?: string;
  classId?: number | null;
  scheduleId?: number | null;
  type: number; // 1 = Assigned, 2 = Template
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  totalScore?: number | null;
  passingScore?: number | null;
  maxAttempts?: number | null;
  allowLateSubmit: boolean;
  shuffleQuestion: boolean;
  showAnswerAfter: boolean;
  status: number; // 1 = Published, 2 = Draft
  questionIds: number[];
}

export interface ExamSearchParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  classId?: number | null;
  status?: number | null;
  type?: number | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const examApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    params: {
      keyword?: string;
      classId?: number | null;
      status?: number | null;
      type?: number | null;
    } = {}
  ): Promise<ApiResponse<ExamPagingResponse>> {
    const queryParams: any = {
      pageNumber: pageIndex,
      pageSize,
    };
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.classId !== undefined && params.classId !== null) queryParams.classId = params.classId;
    if (params.status !== undefined && params.status !== null) queryParams.status = params.status;
    if (params.type !== undefined && params.type !== null) queryParams.type = params.type;

    const queryString = new URLSearchParams(queryParams).toString();
    return api.get<ExamPagingResponse>(`/api/Exam?${queryString}`);
  },

  async getTeacherExams(params: ExamSearchParams): Promise<ApiResponse<ExamPagingResponse>> {
    const queryParams: Record<string, string> = {
      pageNumber: (params.pageNumber || 1).toString(),
      pageSize: (params.pageSize || 10).toString(),
    };

    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.classId) queryParams.classId = params.classId.toString();
    if (params.status !== undefined && params.status !== null) queryParams.status = params.status.toString();
    if (params.type !== undefined && params.type !== null) queryParams.type = params.type.toString();

    const queryString = new URLSearchParams(queryParams).toString();
    return api.get<ExamPagingResponse>(`/api/Exam/teacher?${queryString}`);
  },

  async getById(id: number): Promise<ApiResponse<ExamItem>> {
    return api.get<ExamItem>(`/api/Exam/${id}`);
  },

  async create(dto: ExamSaveDto): Promise<ApiResponse<ExamItem>> {
    return api.post<ExamItem>("/api/Exam", dto);
  },

  async update(id: number, dto: ExamSaveDto): Promise<ApiResponse<ExamItem>> {
    return api.put<ExamItem>(`/api/Exam/${id}`, dto);
  },

  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(`/api/Exam/${id}`);
  },

  async copy(id: number): Promise<ApiResponse<ExamItem>> {
    return api.post<ExamItem>(`/api/Exam/${id}/copy`, {});
  },

  async getStudentExams(): Promise<ApiResponse<ExamItem[]>> {
    return api.get<ExamItem[]>("/api/Exam/student");
  },

  async getStudentExamDetail(examId: number): Promise<ApiResponse<ExamItem>> {
    return api.get<ExamItem>(`/api/Exam/${examId}/student-detail`);
  },

  async getStudentAttempts(examId: number): Promise<ApiResponse<ExamAttemptDto[]>> {
    return api.get<ExamAttemptDto[]>(`/api/Exam/${examId}/attempts`);
  },

  async getAttemptsByExam(examId: number): Promise<ApiResponse<ExamAttemptDto[]>> {
    return api.get<ExamAttemptDto[]>(`/api/Exam/${examId}/all-attempts`);
  },

  async startAttempt(examId: number): Promise<ApiResponse<ExamAttemptDto>> {
    return api.post<ExamAttemptDto>(`/api/Exam/${examId}/start`, {});
  },

  async submitAttempt(examId: number, dto: ExamSubmitDto): Promise<ApiResponse<ExamAttemptDto>> {
    return api.post<ExamAttemptDto>(`/api/Exam/${examId}/submit`, dto);
  },

  async gradeAttempt(attemptId: number, dto: { score: number; teacherComment?: string }): Promise<ApiResponse<ExamAttemptDto>> {
    return api.put<ExamAttemptDto>(`/api/Exam/attempt/${attemptId}/grade`, dto);
  },
};

export interface ExamAnswerDto {
  id: number;
  questionId: number;
  answerContent?: string | null;
  attachmentUrl?: string | null;
  score?: number | null;
  teacherComment?: string | null;
  isCorrect?: boolean | null;
}

export interface ExamAttemptDto {
  id: number;
  examId: number;
  examTitle: string;
  studentId: number;
  studentName: string;
  studentCode: string;
  startTime: string;
  submitTime?: string | null;
  score?: number | null;
  status: number; // 1 = In Progress, 2 = Submitted
  duration?: number | null;
  tabExitsCount?: number;
  log?: string | null;
  teacherComment?: string | null;
  answers: ExamAnswerDto[];
}

export interface ExamSubmitAnswerDto {
  questionId: number;
  answerContent?: string | null;
}

export interface ExamSubmitDto {
  attemptId: number;
  tabExitsCount?: number;
  log?: string | null;
  answers: ExamSubmitAnswerDto[];
}

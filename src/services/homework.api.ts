import { api, ApiResponse } from './api';

export interface HomeworkDto {
  id: number;
  classId: number;
  teacherId: number;
  title: string;
  description?: string;
  attachmentUrls?: string[];
  skill?: string;
  dueDate?: string;
  totalScore: number;
  status: number;
  createdAt: string;
  createdBy?: string;
  teacherName?: string;
  className?: string;
}

export interface HomeworkSaveDto {
  classId: number;
  teacherId: number;
  title: string;
  description?: string;
  attachmentUrls?: string[];
  skill?: string;
  dueDate?: string;
  totalScore: number;
  status: number;
}

export interface HomeworkSubmissionDto {
  id: number;
  homeworkId: number;
  studentId: number;
  content?: string;
  attachmentUrls?: string[];
  submitTime: string;
  score?: number;
  teacherFeedback?: string;
  status: number;
  studentName?: string;
  studentCode?: string;
  studentEmail?: string;
}

export interface HomeworkSubmissionSaveDto {
  homeworkId: number;
  studentId?: number;
  content?: string;
  attachmentUrls?: string[];
}

export interface HomeworkSubmissionGradeDto {
  score: number;
  teacherFeedback?: string;
}



const API_URL = '/api/Homework';

export const homeworkApi = {
  // TEACHER APIs
  getHomeworkByClass: async (classId: number) => {
    return api.get<HomeworkDto[]>(`${API_URL}/class/${classId}`);
  },

  getStudentHomeworkByClass: async (classId: number) => {
    return api.get<HomeworkDto[]>(`${API_URL}/class/${classId}/student`);
  },

  createHomework: async (data: HomeworkSaveDto) => {
    return api.post<HomeworkDto>(API_URL, data);
  },

  updateHomework: async (id: number, data: HomeworkSaveDto) => {
    return api.put<HomeworkDto>(`${API_URL}/${id}`, data);
  },

  deleteHomework: async (id: number) => {
    return api.delete<boolean>(`${API_URL}/${id}`);
  },

  getSubmissions: async (homeworkId: number) => {
    return api.get<HomeworkSubmissionDto[]>(`${API_URL}/${homeworkId}/submissions`);
  },

  getMySubmission: async (homeworkId: number) => {
    return api.get<HomeworkSubmissionDto | null>(`${API_URL}/${homeworkId}/my-submission`);
  },

  gradeSubmission: async (submissionId: number, data: HomeworkSubmissionGradeDto) => {
    return api.post<HomeworkSubmissionDto>(`${API_URL}/submissions/${submissionId}/grade`, data);
  },

  // STUDENT APIs
  submitHomework: async (data: HomeworkSubmissionSaveDto) => {
    return api.post<HomeworkSubmissionDto>(`${API_URL}/submit`, data);
  },
};

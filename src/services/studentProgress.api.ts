import { api, ApiResponse } from "./api";
import { HomeworkDto, HomeworkSubmissionDto } from "./homework.api";
import { MyAttendanceSessionDto } from "./attendance.api";

export interface HomeworkWithSub extends HomeworkDto {
  submission?: HomeworkSubmissionDto | null;
}

export interface StudentProgressDto {
  homeworks: HomeworkWithSub[];
  attendanceSessions: MyAttendanceSessionDto[];
}

export const studentProgressApi = {
  getProgress(classId: number): Promise<ApiResponse<StudentProgressDto>> {
    return api.get<StudentProgressDto>(`/api/StudentProgress/class/${classId}`);
  },

  getChildProgress(classId: number, studentId: number): Promise<ApiResponse<StudentProgressDto>> {
    return api.get<StudentProgressDto>(`/api/StudentProgress/class/${classId}/student/${studentId}`);
  },
};

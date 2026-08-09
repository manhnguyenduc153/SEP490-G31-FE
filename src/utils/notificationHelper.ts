export function getLocalizedNotification(
  title: string | null | undefined,
  content: string | null | undefined,
  t: (key: string, options?: any) => string
): { title: string; content: string } {
  const defaultTitle = title || "";
  const defaultContent = content || "";

  // 1. Try to parse JSON structured notification (Future-proof)
  if (defaultContent.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(defaultContent);
      if (parsed && parsed.key) {
        const localizedTitle = t(`notification.title.${parsed.key}`, { defaultValue: defaultTitle });
        const localizedContent = t(`notification.content.${parsed.key}`, { ...parsed.params, defaultValue: defaultContent });
        return { title: localizedTitle, content: localizedContent };
      }
    } catch (e) {
      // Ignore JSON parse error, fall back to regex
    }
  }

  // 2. Regex fallback (Legacy-proof for current database notifications)
  let localizedTitle = defaultTitle;
  let localizedContent = defaultContent;

  // Title translation rules
  if (defaultTitle.includes("Lớp học mới được tạo")) {
    localizedTitle = t("notification.title.classCreated", { defaultValue: "Lớp học mới được tạo" });
  } else if (defaultTitle.includes("Cập nhật trạng thái lớp học")) {
    localizedTitle = t("notification.title.classStatusChanged", { defaultValue: "Cập nhật trạng thái lớp học" });
  } else if (defaultTitle.includes("Bạn đã được thêm vào lớp học")) {
    localizedTitle = t("notification.title.studentsAdded", { defaultValue: "Bạn đã được thêm vào lớp học" });
  } else if (defaultTitle.includes("Bạn đã được phân công dạy lớp học")) {
    localizedTitle = t("notification.title.teacherAssigned", { defaultValue: "Bạn đã được phân công dạy lớp học" });
  } else if (defaultTitle.includes("Bài kiểm tra mới")) {
    localizedTitle = t("notification.title.examCreated", { defaultValue: "Bài kiểm tra mới" });
  } else if (defaultTitle.includes("Bài tập về nhà mới")) {
    localizedTitle = t("notification.title.homeworkCreated", { defaultValue: "Bài tập về nhà mới" });
  } else if (defaultTitle.includes("Lớp học sắp diễn ra")) {
    localizedTitle = t("notification.title.upcomingClass", { defaultValue: "Lớp học sắp diễn ra" });
  }

  // Content translation rules
  // Rule 1.5: Lớp {Name} ({Code}) đã được lên lịch.
  const classScheduledRegex = /Lớp (.*?) \(([^)]+)\) đã được lên lịch\./i;
  const matchScheduled = defaultContent.match(classScheduledRegex);
  if (matchScheduled) {
    localizedContent = t("notification.content.upcomingClass", {
      className: matchScheduled[1],
      classCode: matchScheduled[2],
      defaultValue: defaultContent,
    });
    return { title: localizedTitle, content: localizedContent };
  }

  // Rule 1: Lớp học {Name} ({Code}) đã được tạo mới.
  const classCreatedRegex = /Lớp học (.*?) \(([^)]+)\) đã được tạo mới\./i;
  const matchCreated = defaultContent.match(classCreatedRegex);
  if (matchCreated) {
    localizedContent = t("notification.content.classCreated", {
      className: matchCreated[1],
      classCode: matchCreated[2],
      defaultValue: defaultContent,
    });
    return { title: localizedTitle, content: localizedContent };
  }

  // Rule 2: Lớp học {Name} ({Code}) đã đổi trạng thái từ '{oldStatus}' sang '{newStatus}'.
  const matchStatus = 
    defaultContent.match(/Lớp học (.*?) \(([^)]+)\) đã đổi trạng thái từ '?(.*?)'? sang '?(.*?)'?\./i) ||
    defaultContent.match(/Lớp học (.*?) ([\w-]+) đã đổi trạng thái từ '?(.*?)'? sang '?(.*?)'?\./i);
  if (matchStatus) {
    const getStatusKey = (s: string) => {
      const low = s.toLowerCase();
      if (low.includes("planning") || low.includes("sắp mở")) return t("class.statusPlanning", { defaultValue: "Sắp mở" });
      if (low.includes("active") || low.includes("đang diễn ra")) return t("class.statusActive", { defaultValue: "Đang diễn ra" });
      if (low.includes("completed") || low.includes("hoàn thành")) return t("class.statusCompleted", { defaultValue: "Hoàn thành" });
      if (low.includes("cancelled") || low.includes("đã hủy")) return t("class.statusCancelled", { defaultValue: "Đã hủy" });
      return s;
    };
    localizedContent = t("notification.content.classStatusChanged", {
      className: matchStatus[1],
      classCode: matchStatus[2],
      oldStatus: getStatusKey(matchStatus[3]),
      newStatus: getStatusKey(matchStatus[4]),
      defaultValue: defaultContent,
    });
    return { title: localizedTitle, content: localizedContent };
  }

  // Rule 3: Bạn đã được đăng ký vào lớp học {Name} ({Code}).
  const studentAddedRegex = /Bạn đã được đăng ký vào lớp học (.*?) \(([^)]+)\)\./i;
  const matchStudent = defaultContent.match(studentAddedRegex);
  if (matchStudent) {
    localizedContent = t("notification.content.studentsAdded", {
      className: matchStudent[1],
      classCode: matchStudent[2],
      defaultValue: defaultContent,
    });
    return { title: localizedTitle, content: localizedContent };
  }

  // Rule 4: Bạn đã được phân công giảng dạy lớp học {Name} ({Code}).
  const teacherAssignedRegex = /Bạn đã được phân công giảng dạy lớp học (.*?) \(([^)]+)\)\./i;
  const matchTeacher = defaultContent.match(teacherAssignedRegex);
  if (matchTeacher) {
    localizedContent = t("notification.content.teacherAssigned", {
      className: matchTeacher[1],
      classCode: matchTeacher[2],
      defaultValue: defaultContent,
    });
    return { title: localizedTitle, content: localizedContent };
  }

  // Rule 5: Bạn có bài kiểm tra mới: '{Title}' trong lớp {ClassName}.
  const examCreatedRegex = /Bạn có bài kiểm tra mới: '(.*?)' trong lớp (.*?)\./i;
  const matchExam = defaultContent.match(examCreatedRegex);
  if (matchExam) {
    localizedContent = t("notification.content.examCreated", {
      examTitle: matchExam[1],
      className: matchExam[2],
      defaultValue: defaultContent,
    });
    return { title: localizedTitle, content: localizedContent };
  }

  // Rule 6: Bạn có bài tập về nhà mới: '{Title}' trong lớp {ClassName}.
  const homeworkCreatedRegex = /Bạn có bài tập về nhà mới: '(.*?)' trong lớp (.*?)\./i;
  const matchHomework = defaultContent.match(homeworkCreatedRegex);
  if (matchHomework) {
    localizedContent = t("notification.content.homeworkCreated", {
      homeworkTitle: matchHomework[1],
      className: matchHomework[2],
      defaultValue: defaultContent,
    });
    return { title: localizedTitle, content: localizedContent };
  }

  return { title: localizedTitle, content: localizedContent };
}

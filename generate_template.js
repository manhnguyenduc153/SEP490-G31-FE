const XLSX = require('xlsx');
const path = require('path');

const data = [
  ["THÔNG TIN LỚP HỌC", "", "", ""],
  ["Tên lớp học (*)", "Lớp Toán Tư Duy T2-T4", "", ""],
  ["Mã lớp học", "LH_MATH_01", "", ""],
  ["Ngày bắt đầu (*)", "15/05/2026", "", ""],
  ["Số buổi học (*)", 24, "", ""],
  ["Lịch học hàng tuần (*)", "T2 (18:00-19:30), T4 (18:00-19:30)", "", ""],
  ["Tên khóa học", "Toán Tư Duy Tiểu Học", "", ""],
  ["Email giáo viên", "giaovienA@school.edu.vn", "", ""],
  ["Tên giáo viên", "Nguyễn Văn A", "", ""],
  ["", "", "", ""],
  ["DANH SÁCH HỌC SINH", "", "", ""],
  ["STT", "Họ và tên học sinh (*)", "Email học sinh (*)", "Số điện thoại"],
  [1, "Nguyễn Văn An", "an.nguyen@gmail.com", "0912345678"],
  [2, "Lê Quang Bình", "binh.le@gmail.com", "0987654321"],
  [3, "Trần Minh Châu", "chau.tran@gmail.com", ""]
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);

// Adjust column widths
ws['!cols'] = [
  { wch: 25 }, // Col A
  { wch: 35 }, // Col B
  { wch: 25 }, // Col C
  { wch: 20 }  // Col D
];

XLSX.utils.book_append_sheet(wb, ws, "Import Class");
const outputPath = path.join(__dirname, 'public/class_import_template.xlsx');
XLSX.writeFile(wb, outputPath);
console.log("Generated template successfully at: " + outputPath);

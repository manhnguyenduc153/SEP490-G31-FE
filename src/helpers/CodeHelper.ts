export class CodeHelper {
  /**
   * Auto generate a code with a given prefix.
   * Format: PREFIX-YYMMDD-XXXX (e.g., QC-231015-A1B2)
   * @param prefix Tham số tiền tố cho mã (ví dụ: "QC")
   * @returns Chuỗi mã đã được sinh tự động
   */
  public static generate(prefix: string): string {
    const now = new Date();
    // YYMMDD
    const dateStr = 
      now.getFullYear().toString().slice(2) +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");
    
    // 4 random uppercase alphanumeric characters
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `${prefix.toUpperCase()}-${dateStr}-${randomStr}`;
  }
}

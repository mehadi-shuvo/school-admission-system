export function isValidStudentId(value: string): boolean {
  return /^[0-9]{17}$/.test(value);
}

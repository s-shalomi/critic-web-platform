import { generateAccessCode, getAccessCodesForTeacher, getStudentsProgressForTeacher } from '../src/domains/teacher/teacherService';

describe('Teacher Domain Tests', () => {
  test('generateAccessCode creates valid student access code', async () => {
    const teacherId = 'teacher-123';
    const result = await generateAccessCode(teacherId, 'CLASS_B_2026');

    expect(result.id).toBeDefined();
    expect(result.code).toBe('CLASS_B_2026');
    expect(result.teacherId).toBe(teacherId);

    const codes = await getAccessCodesForTeacher(teacherId);
    const found = codes.find((c) => c.code === 'CLASS_B_2026');
    expect(found).toBeDefined();
  });

  test('getStudentsProgressForTeacher lists student stage progression', async () => {
    const students = await getStudentsProgressForTeacher('teacher-123');
    expect(students.length).toBeGreaterThan(0);
    expect(students[0].topicTitle).toBe('Climate Change');
    expect(students[0].currentStage).toBeDefined();
  });
});

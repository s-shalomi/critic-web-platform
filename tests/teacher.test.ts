/**
 * Teacher Domain Tests
 * Validates access code generation and live student progress retrieval.
 * Student progress is now stored in the shared sessionStore singleton —
 * the test seeds one entry before asserting.
 */

import { generateAccessCode, getAccessCodesForTeacher, getStudentsProgressForTeacher } from '../src/domains/teacher/teacherService';
import { upsertStudentProgress } from '../src/shared/db/sessionStore';

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

  test('getStudentsProgressForTeacher returns live student stage progression', async () => {
    // Seed a student entry into the shared session store (as the student ping API would do)
    upsertStudentProgress({
      studentId: 'student_test_abc',
      accessCode: 'TEST_CODE_2026',
      topicTitle: 'Climate Change',
      currentStage: 'synthesise',
      status: 'in_progress',
      lastActive: new Date().toISOString(),
    });

    const students = await getStudentsProgressForTeacher('teacher-123');
    const seeded = students.find((s) => s.accessCode === 'TEST_CODE_2026');

    expect(seeded).toBeDefined();
    expect(seeded!.topicTitle).toBe('Climate Change');
    expect(seeded!.currentStage).toBe('synthesise');
  });

  test('teacher-generated access code allows student login', async () => {
    const { authenticateStudent } = await import('../src/domains/auth/authService');
    const teacherId = 'teacher-demo';
    const customCode = 'EXP_CHEM_2026';
    await generateAccessCode(teacherId, customCode);

    const authResult = await authenticateStudent(customCode);
    expect(authResult.success).toBe(true);
    expect(authResult.token).toBeDefined();
    expect(authResult.user?.accessCode).toBe(customCode);
  });
});

import { authenticateStudent, authenticateTeacher } from '../src/domains/auth/authService';
import { verifyToken } from '../src/domains/auth/jwt';

describe('Auth Domain Tests', () => {
  test('Valid access code authenticates student successfully', async () => {
    const result = await authenticateStudent('CLIMATE2026');
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.user?.role).toBe('student');

    if (result.token) {
      const payload = await verifyToken(result.token);
      expect(payload?.role).toBe('student');
      expect(payload?.code).toBe('CLIMATE2026');
    }
  });

  test('Invalid access code returns clear error', async () => {
    const result = await authenticateStudent('INVALID_123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid access code');
  });

  test('Teacher authentication succeeds with correct credentials', async () => {
    const result = await authenticateTeacher('teacher@school.edu', 'TeacherPass2026!');
    expect(result.success).toBe(true);
    expect(result.user?.role).toBe('teacher');

    if (result.token) {
      const payload = await verifyToken(result.token);
      expect(payload?.role).toBe('teacher');
      expect(payload?.email).toBe('teacher@school.edu');
    }
  });

  test('Teacher authentication fails with wrong password', async () => {
    const result = await authenticateTeacher('teacher@school.edu', 'WrongPass');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email or password');
  });
});

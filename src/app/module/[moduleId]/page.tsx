'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStudentCurrentStage } from '@/shared/utils/storage';

export default function ModuleRootPage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate-change_demo';

  useEffect(() => {
    let studentId = 'student_demo';
    try {
      const userStr = localStorage.getItem('critic_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        studentId = user.id || user.email || user.accessCode || 'student_demo';
      }
    } catch {}

    const topicId = moduleId.replace(/^mod_/, '').replace(/_[^_]+$/, '') || 'climate-change';
    const targetStage = getStudentCurrentStage(studentId, topicId);

    router.replace(`/module/${moduleId}/${targetStage}`);
  }, [moduleId, router]);

  return null;
}

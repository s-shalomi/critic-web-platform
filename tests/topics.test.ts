import { getAllTopics, getSourcesForTopic, addSourceToTopic } from '../src/domains/topics/topicService';

describe('Topics Domain Tests', () => {
  test('getAllTopics returns climate change topic as available', async () => {
    const topics = await getAllTopics();
    expect(topics.length).toBeGreaterThan(0);
    const climateTopic = topics.find((t) => t.id === 'climate-change');
    expect(climateTopic).toBeDefined();
    expect(climateTopic?.status).toBe('Available');
  });

  test('Other topics are marked as Coming Soon', async () => {
    const topics = await getAllTopics();
    const vaccineTopic = topics.find((t) => t.id === 'vaccine-safety');
    expect(vaccineTopic?.status).toBe('Coming Soon');
  });

  test('getSourcesForTopic returns sources for climate change', async () => {
    const sources = await getSourcesForTopic('climate-change');
    expect(sources.length).toBeGreaterThanOrEqual(4);
    expect(sources[0].title).toBe('Social Media Post');
  });

  test('addSourceToTopic dynamically adds teacher source reflected in topic sources', async () => {
    const newSource = await addSourceToTopic('climate-change', {
      title: 'Teacher Supplementary Report',
      authorName: 'Dr. Jane Smith',
      text: 'Supplementary findings on Arctic sea ice extent trends.',
      type: 'article',
    });

    expect(newSource.id).toBeDefined();
    expect(newSource.title).toBe('Teacher Supplementary Report');

    const updatedSources = await getSourcesForTopic('climate-change');
    const found = updatedSources.find((s) => s.id === newSource.id);
    expect(found).toBeDefined();
    expect(found?.content.authorName).toBe('Dr. Jane Smith');
  });

  test('updateSourceInTopic modifies source title and text', async () => {
    const newSource = await addSourceToTopic('climate-change', {
      title: 'Original Title',
      text: 'Original Text',
      type: 'article',
    });

    const { updateSourceInTopic, getSourceById } = await import('../src/domains/topics/topicService');
    const updated = await updateSourceInTopic(newSource.id, {
      title: 'Updated Title',
      text: 'Updated Text Content',
    });

    expect(updated).toBeDefined();
    expect(updated?.title).toBe('Updated Title');
    expect(updated?.content.text).toBe('Updated Text Content');

    const retrieved = await getSourceById(newSource.id);
    expect(retrieved?.title).toBe('Updated Title');
  });

  test('deleteSourceFromTopic removes source from topic sources list', async () => {
    const newSource = await addSourceToTopic('climate-change', {
      title: 'Source To Delete',
      text: 'Text content to delete',
      type: 'article',
    });

    const { deleteSourceFromTopic, getSourcesForTopic } = await import('../src/domains/topics/topicService');
    const deleted = await deleteSourceFromTopic(newSource.id);
    expect(deleted).toBe(true);

    const sources = await getSourcesForTopic('climate-change');
    const found = sources.find((s) => s.id === newSource.id);
    expect(found).toBeUndefined();
  });
});


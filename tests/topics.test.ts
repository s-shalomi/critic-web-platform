import { getAllTopics, getSourcesForTopic } from '../src/domains/topics/topicService';

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
    expect(sources.length).toBe(4);
    expect(sources[0].title).toBe('Social Media Post');
  });
});

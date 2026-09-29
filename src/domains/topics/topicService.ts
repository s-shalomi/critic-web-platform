/**
 * Topics Domain Service
 * Extensible topic management. Topics and sources are completely decoupled from stage logic.
 * Adding a new topic requires only new rows in Topics and Sources without modifying core application code.
 */

export interface Topic {
  id: string;
  title: string;
  status: 'Available' | 'Coming Soon';
  description: string;
}

export interface Source {
  id: string;
  topicId: string;
  orderIndex: number;
  title: string;
  author?: string;
  content: {
    type: 'social_post' | 'article' | 'comments' | 'video';
    authorName?: string;
    text: string;
    comments?: Array<{ author: string; text: string }>;
  };
  url?: string;
}

// Default initial dataset (Climate Change initial topic + Coming Soon topics)
const INITIAL_TOPICS: Topic[] = [
  {
    id: 'climate-change',
    title: 'climate change',
    status: 'Available',
    description: 'Explore arguments, news articles, and social posts on global climate claims.',
  },
  {
    id: 'vaccine-safety',
    title: 'vaccine safety',
    status: 'Coming Soon',
    description: 'Evaluate medical evidence and public discourse around vaccination.',
  },
  {
    id: 'mental-wellbeing',
    title: 'mental well-being',
    status: 'Coming Soon',
    description: 'Deconstruct claims and digital habits surrounding adolescent mental health.',
  },
];

const INITIAL_SOURCES: Source[] = [
  {
    id: 'source-1',
    topicId: 'climate-change',
    orderIndex: 0,
    title: 'Social Media Post',
    content: {
      type: 'social_post',
      authorName: 'Donald Trump',
      text: 'Be careful and try staying in your house. Large parts of the Country are suffering from tremendous amounts of snow and near record setting cold. Amazing how big this system is. Wouldn\'t be bad to have a little of that good old fashioned Global Warming right now!',
    },
  },
  {
    id: 'source-2',
    topicId: 'climate-change',
    orderIndex: 1,
    title: 'Social Media Post Comments',
    content: {
      type: 'comments',
      text: 'Public reactions and online comments regarding recent weather anomalies.',
      comments: [
        { author: 'User_492', text: 'If temperatures hit record lows in winter, how can global warming be real?' },
        { author: 'EcoScientist', text: 'Weather refers to short-term atmospheric conditions while climate is regional atmospheric behavior over decades.' },
      ],
    },
  },
  {
    id: 'source-3',
    topicId: 'climate-change',
    orderIndex: 2,
    title: 'News Article',
    content: {
      type: 'article',
      authorName: 'Global Climate Observatory',
      text: 'Extreme weather events, including arctic deep freezes, are increasingly driven by jet stream disruption resulting from rapid warming in the Arctic region.',
    },
  },
  {
    id: 'source-4',
    topicId: 'climate-change',
    orderIndex: 3,
    title: 'YouTube Video',
    content: {
      type: 'video',
      authorName: 'Science Explained',
      text: 'Video Transcript: Understanding polar vortex destabilization and its connection to rising ocean temperatures.',
    },
  },
];

// Extended in-memory sources store for dynamic teacher additions
const dynamicSourcesStore = new Map<string, Source[]>();

export async function getAllTopics(): Promise<Topic[]> {
  return INITIAL_TOPICS;
}

export async function getTopicById(topicId: string): Promise<Topic | null> {
  return INITIAL_TOPICS.find((t) => t.id === topicId) || null;
}

export async function getSourcesForTopic(topicId: string): Promise<Source[]> {
  const initial = INITIAL_SOURCES.filter((s) => s.topicId === topicId);
  const dynamic = dynamicSourcesStore.get(topicId) || [];
  return [...initial, ...dynamic].sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function addSourceToTopic(
  topicId: string,
  sourceData: { title: string; authorName?: string; text: string; type?: 'social_post' | 'article' | 'comments' | 'video' }
): Promise<Source> {
  const currentSources = await getSourcesForTopic(topicId);
  const newSource: Source = {
    id: `source_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    topicId,
    orderIndex: currentSources.length,
    title: sourceData.title,
    content: {
      type: sourceData.type || 'article',
      authorName: sourceData.authorName || 'Teacher Added',
      text: sourceData.text,
    },
  };

  const dynamic = dynamicSourcesStore.get(topicId) || [];
  dynamic.push(newSource);
  dynamicSourcesStore.set(topicId, dynamic);

  return newSource;
}


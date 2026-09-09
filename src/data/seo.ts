import { profile, projects } from './site';

const personId = `${profile.canonicalUrl}#person`;
const professionalTopics = [
  'C++23',
  'Lock-free concurrency',
  'FreeRTOS',
  'ESP32',
  'STM32',
  'Embedded telemetry',
  'Application security',
  'Kubernetes',
  'Go',
  'AI evaluation',
  'React Native',
  'Swift',
  'Apple HealthKit',
];

export const identityGraph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ProfilePage',
      '@id': `${profile.canonicalUrl}#profile`,
      url: profile.canonicalUrl,
      name: `${profile.name} — ${profile.title}`,
      description: profile.description,
      knowsAbout: professionalTopics,
      mainEntity: { '@id': personId },
    },
    {
      '@type': 'Person',
      '@id': personId,
      name: profile.name,
      alternateName: profile.fullName,
      url: profile.canonicalUrl,
      image: new URL(profile.image, profile.canonicalUrl).href,
      jobTitle: profile.title,
      description: profile.description,
      homeLocation: {
        '@type': 'Place',
        name: profile.location,
      },
      affiliation: {
        '@type': 'CollegeOrUniversity',
        name: 'University of California, Santa Cruz',
        sameAs: 'https://www.ucsc.edu/',
      },
      knowsAbout: professionalTopics,
      sameAs: profile.sameAs,
    },
    {
      '@type': 'ItemList',
      '@id': `${profile.canonicalUrl}#projects`,
      name: 'Selected engineering projects',
      itemListElement: projects
        .filter((project) => project.links?.some((link) => link.href.includes('github.com')))
        .map((project, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'SoftwareSourceCode',
            name: project.name,
            description: project.description,
            codeRepository: project.links?.find((link) => link.href.includes('github.com'))?.href,
            programmingLanguage: project.stack,
            keywords: [project.tagline, ...project.stack],
            author: { '@id': personId },
          },
        })),
    },
  ],
};

export interface ArticleIdentity {
  url: string;
  headline: string;
  description: string;
  publishedDate: Date;
  updatedDate?: Date;
  tags: string[];
}

export const biographyGraph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ProfilePage',
      '@id': `${profile.canonicalUrl}about/#profile`,
      url: `${profile.canonicalUrl}about/`,
      name: `${profile.name} | ${profile.title}`,
      description: profile.biography,
      mainEntity: { '@id': personId },
    },
    {
      ...identityGraph['@graph'][1],
      description: profile.biography,
    },
  ],
};

function schemaDateTime(date: Date) {
  return date.toISOString();
}

export function createArticleGraph(article: ArticleIdentity) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${article.url}#article`,
        url: article.url,
        headline: article.headline,
        description: article.description,
        image: new URL(profile.image, profile.canonicalUrl).href,
        datePublished: schemaDateTime(article.publishedDate),
        dateModified: schemaDateTime(article.updatedDate ?? article.publishedDate),
        author: {
          '@type': 'Person',
          '@id': personId,
          name: profile.name,
          url: `${profile.canonicalUrl}about/`,
        },
        mainEntityOfPage: article.url,
        keywords: article.tags,
        isPartOf: {
          '@type': 'Blog',
          '@id': `${profile.canonicalUrl}writing/#blog`,
          name: `${profile.name}'s writing`,
        },
      },
    ],
  };
}

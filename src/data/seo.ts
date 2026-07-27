import { profile } from './site';

const personId = `${profile.canonicalUrl}#person`;

export const identityGraph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ProfilePage',
      '@id': `${profile.canonicalUrl}#profile`,
      url: profile.canonicalUrl,
      name: `${profile.name} — ${profile.title}`,
      description: profile.description,
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
      sameAs: profile.sameAs,
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
          url: profile.canonicalUrl,
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

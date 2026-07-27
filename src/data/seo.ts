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

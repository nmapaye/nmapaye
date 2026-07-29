const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const lastPathSegment = url.pathname.split('/').at(-1);
    const isPageRequest =
      (request.method === 'GET' || request.method === 'HEAD') &&
      !lastPathSegment?.includes('.');

    if (isPageRequest) {
      url.pathname += url.pathname.endsWith('/') ? 'index.html' : '/index.html';
      return env.ASSETS.fetch(new Request(url, request));
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;

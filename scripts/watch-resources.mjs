import path from 'node:path';
import { watch } from 'chokidar';
import { prepareProject, projectRoot } from './prepare-media.mjs';
export default function watchResources() {
  let watcher;
  let timer;
  let running = Promise.resolve();
  let closed = false;
  return {
    name: 'watch-resources',
    hooks: {
      'astro:server:setup'({ server, logger, refreshContent }) {
        closed = false;
        watcher = watch([path.join(projectRoot, 'resource'), path.join(projectRoot, 'src/config/site.ts')], {
          ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 },
        });
        watcher.on('all', () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            running = running.then(async () => {
              if (closed) return;
              try {
                await prepareProject();
                await refreshContent?.({ loaders: ['resource-about', 'resource-stock', 'resource-reading'] });
                server.ws.send({ type: 'full-reload' });
                logger.info('Resources updated.');
              } catch (error) {
                logger.error(error.message);
                server.ws.send({ type: 'error', err: { message: error.message, stack: '', plugin: 'watch-resources' } });
              }
            });
          }, 200);
        });
        watcher.on('error', (error) => logger.error(error.message));
      },
      async 'astro:server:done'() {
        closed = true;
        clearTimeout(timer);
        await watcher?.close();
        await running;
      },
    },
  };
}

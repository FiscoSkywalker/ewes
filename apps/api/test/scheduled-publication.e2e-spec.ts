import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ArticleType, ContentStatus, DocumentCategory } from '@prisma/client';
import { PrismaModule } from './../src/prisma/prisma.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import type { FrontendRevalidator } from './../src/common/revalidation/frontend-revalidator.service.js';
import {
  SCHEDULE_LOOKBACK_MS,
  ScheduledPublicationWatcher,
} from './../src/common/revalidation/scheduled-publication.watcher.js';

const MINUTE = 60_000;

/**
 * Parution programmée : un contenu publié avec une date future devient visible
 * sans action de personne, donc rien ne revalidait le cache du site avant
 * l'expiration de celui-ci (1 h). Le balayage doit demander la revalidation à
 * l'instant où la date est atteinte, une fois, sans rien reprendre d'inutile.
 */
describe('Scheduled publication watcher (e2e)', () => {
  let prisma: PrismaService;
  const stamp = Date.now();
  const slug = (name: string) => `e2e-sched-${name}-${stamp}`;
  /** Heure de référence : les dates de parution s'en déduisent, jamais de l'horloge. */
  const T = new Date();
  const at = (minutes: number) => new Date(T.getTime() + minutes * MINUTE);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
    }).compile();
    prisma = module.get(PrismaService);
    await module.init();
  });

  afterAll(async () => {
    const where = {
      slug: { startsWith: 'e2e-sched-' },
      AND: [{ slug: { endsWith: `-${stamp}` } }],
    };
    await prisma.article.deleteMany({ where });
    await prisma.realisation.deleteMany({ where });
    await prisma.publicDocument.deleteMany({ where });
    await prisma.$disconnect();
  });

  /** Site factice : enregistre les demandes ; `refuse` simule un site qui répond en erreur. */
  function fakeSite(configured = true) {
    const calls: string[] = [];
    const refuse = new Set<string>();
    const site = {
      configured,
      revalidate: async (tag: string) => {
        calls.push(tag);
        return !refuse.has(tag);
      },
    };
    return { calls, refuse, site: site as unknown as FrontendRevalidator };
  }

  const watcherFor = (
    site: FrontendRevalidator,
    values: Record<string, string> = {},
  ) =>
    new ScheduledPublicationWatcher(prisma, site, {
      get: (key: string) => values[key],
    } as unknown as ConfigService);

  const article = (name: string, data: object) =>
    prisma.article.create({
      data: {
        slug: slug(name),
        type: ArticleType.ACTUALITE,
        titleFr: `Sched ${name}`,
        contentFr: 'x',
        status: ContentStatus.PUBLISHED,
        ...data,
      },
    });

  it('revalidates an article once its scheduled date is reached, and only once', async () => {
    // Publiée maintenant pour paraître dans 10 minutes : `updatedAt` précède la date.
    await article('future', { publishedAt: at(10), updatedAt: at(0) });
    const { calls, site } = fakeSite();
    const watcher = watcherFor(site);

    expect(await watcher.tick(at(5))).not.toContain(
      `article:${slug('future')}`,
    );
    expect(calls).not.toContain(`article:${slug('future')}`);

    const due = await watcher.tick(at(11));
    expect(due).toEqual(
      expect.arrayContaining([`article:${slug('future')}`, 'articles']),
    );
    expect(calls).toEqual(
      expect.arrayContaining([`article:${slug('future')}`, 'articles']),
    );

    // Fenêtre avancée : le balayage suivant ne la reprend pas.
    calls.length = 0;
    expect(await watcher.tick(at(12))).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('ignores what is not a scheduled parution that has just become visible', async () => {
    const n = (name: string) => `article:${slug(name)}`;
    // Publication immédiate (date = écriture) et antidatée : le site a déjà été revalidé par l'action.
    await article('immediate', { publishedAt: at(10), updatedAt: at(10) });
    await article('backdated', { publishedAt: at(10), updatedAt: at(40) });
    // Programmée, puis modifiée une fois la date passée : cette modification a revalidé le site.
    await article('edited-after', { publishedAt: at(10), updatedAt: at(10.5) });
    // Pas publiée, ou retirée, ou supprimée : jamais visible, rien à revalider.
    await article('draft', {
      status: ContentStatus.DRAFT,
      publishedAt: at(10),
      updatedAt: at(0),
    });
    await article('deleted', {
      publishedAt: at(10),
      updatedAt: at(0),
      deletedAt: at(1),
    });
    // Date hors de la fenêtre balayée.
    await article('later', { publishedAt: at(90), updatedAt: at(0) });
    await article('long-ago', { publishedAt: at(-300), updatedAt: at(-400) });
    const { calls, site } = fakeSite();

    const due = await watcherFor(site).tick(at(11));
    for (const name of [
      'immediate',
      'backdated',
      'edited-after',
      'draft',
      'deleted',
      'later',
      'long-ago',
    ]) {
      expect(due, name).not.toContain(n(name));
      expect(calls, name).not.toContain(n(name));
    }
  });

  it('also covers realisations and public documents', async () => {
    await prisma.realisation.create({
      data: {
        slug: slug('real'),
        titleFr: 'Sched real',
        status: ContentStatus.PUBLISHED,
        publishedAt: at(10),
        updatedAt: at(0),
      },
    });
    await prisma.publicDocument.create({
      data: {
        slug: slug('doc'),
        titleFr: 'Sched doc',
        category: DocumentCategory.REPORT,
        storedName: `${slug('doc')}.pdf`,
        fileUrl: '/x',
        fileType: 'application/pdf',
        fileSizeBytes: 1,
        status: ContentStatus.PUBLISHED,
        publishedAt: at(10),
        updatedAt: at(0),
      },
    });
    const { calls, site } = fakeSite();
    const watcher = watcherFor(site);
    await watcher.tick(at(5));
    expect(calls).not.toContain(`realisation:${slug('real')}`);

    const due = await watcher.tick(at(11));
    expect(due).toEqual(
      expect.arrayContaining([
        `realisation:${slug('real')}`,
        'realisations',
        `document:${slug('doc')}`,
        'documents',
      ]),
    );
    expect(calls).toEqual(expect.arrayContaining(due));
  });

  it('retries a tag the site refused until it succeeds, then stops', async () => {
    await article('retry', { publishedAt: at(10), updatedAt: at(0) });
    const tag = `article:${slug('retry')}`;
    const { calls, refuse, site } = fakeSite();
    const watcher = watcherFor(site);
    await watcher.tick(at(5));

    refuse.add(tag);
    await watcher.tick(at(11));
    expect(calls.filter((c) => c === tag)).toHaveLength(1);

    // Plus rien de nouveau, mais le tag refusé est rejoué à chaque balayage.
    await watcher.tick(at(12));
    await watcher.tick(at(13));
    expect(calls.filter((c) => c === tag)).toHaveLength(3);

    refuse.clear();
    await watcher.tick(at(14));
    expect(calls.filter((c) => c === tag)).toHaveLength(4);
    await watcher.tick(at(15));
    expect(calls.filter((c) => c === tag)).toHaveLength(4);
  });

  it('gives up on a refused tag once the site cache has expired by itself', async () => {
    await article('giveup', { publishedAt: at(10), updatedAt: at(0) });
    const tag = `article:${slug('giveup')}`;
    const { calls, refuse, site } = fakeSite();
    const watcher = watcherFor(site);
    await watcher.tick(at(5));
    refuse.add(tag);
    await watcher.tick(at(11));
    expect(calls.filter((c) => c === tag)).toHaveLength(1);

    // Plus d'une heure après : le cache de repli du site a expiré, inutile d'insister.
    const later = at(11 + SCHEDULE_LOOKBACK_MS / MINUTE + 1);
    await watcher.tick(later);
    await watcher.tick(new Date(later.getTime() + MINUTE));
    expect(calls.filter((c) => c === tag)).toHaveLength(1);
  });

  it('keeps the window when the database cannot be read, so nothing is missed', async () => {
    await article('outage', { publishedAt: at(10), updatedAt: at(0) });
    const tag = `article:${slug('outage')}`;
    const { calls, site } = fakeSite();
    const watcher = watcherFor(site);
    await watcher.tick(at(5));

    const failing = vi
      .spyOn(prisma.article, 'findMany')
      .mockRejectedValueOnce(new Error('connection lost'));
    await expect(watcher.tick(at(11))).rejects.toThrow('connection lost');
    failing.mockRestore();

    // La parution survenue pendant la panne est rattrapée au balayage suivant.
    await watcher.tick(at(12));
    expect(calls).toContain(tag);
  });

  describe('timer', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Montre le minuteur sans toucher à la base : `tick` est remplacé. */
    function started(values: Record<string, string>, configured = true) {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const { site } = fakeSite(configured);
      const watcher = watcherFor(site, values);
      const tick = vi.spyOn(watcher, 'tick').mockResolvedValue([]);
      watcher.onModuleInit();
      return { watcher, tick };
    }

    it('sweeps every interval (60 s by default) until the module is destroyed', async () => {
      const { watcher, tick } = started({});
      await vi.advanceTimersByTimeAsync(59_000);
      expect(tick).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1_000);
      expect(tick).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(120_000);
      expect(tick).toHaveBeenCalledTimes(3);

      watcher.onModuleDestroy();
      await vi.advanceTimersByTimeAsync(300_000);
      expect(tick).toHaveBeenCalledTimes(3);
    });

    it('honours PUBLICATION_WATCH_INTERVAL_SECONDS', async () => {
      const { watcher, tick } = started({
        PUBLICATION_WATCH_INTERVAL_SECONDS: '5',
      });
      await vi.advanceTimersByTimeAsync(15_000);
      expect(tick).toHaveBeenCalledTimes(3);
      watcher.onModuleDestroy();
    });

    it('never starts two sweeps at once, and survives a failing one', async () => {
      const { watcher, tick } = started({
        PUBLICATION_WATCH_INTERVAL_SECONDS: '1',
      });
      let release!: () => void;
      tick.mockReturnValueOnce(
        new Promise<string[]>((resolve) => {
          release = () => resolve([]);
        }),
      );
      await vi.advanceTimersByTimeAsync(5_000);
      expect(tick).toHaveBeenCalledTimes(1);

      release();
      tick.mockRejectedValueOnce(new Error('boom'));
      await vi.advanceTimersByTimeAsync(1_000);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(tick).toHaveBeenCalledTimes(3);
      watcher.onModuleDestroy();
    });

    it.each([['0'], ['-5'], ['abc']])(
      'stays off when the interval is %j',
      async (value) => {
        const { tick } = started({ PUBLICATION_WATCH_INTERVAL_SECONDS: value });
        await vi.advanceTimersByTimeAsync(600_000);
        expect(tick).not.toHaveBeenCalled();
      },
    );

    it('stays off when the public site cannot be reached', async () => {
      const { tick } = started({}, false);
      await vi.advanceTimersByTimeAsync(600_000);
      expect(tick).not.toHaveBeenCalled();
    });
  });
});
